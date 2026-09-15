import { Router } from 'express';
import Application from '../models/Application.js';
import Scheme from '../models/Scheme.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateApplicationId, buildTrackingTimeline, pushTimeline } from '../utils/application.js';
import { evaluateScheme, computeMeritScore } from '../services/eligibility.js';
import { detectDeficiencies, mergeDeficiencies } from '../services/deficiency.js';
import { detectDuplicates } from '../services/duplicate.js';

const router = Router();

/** Flattens an application into the shape the eligibility engine expects. */
export function toProfile(app) {
  return {
    category: app.category?.socialCategory,
    tribeName: app.category?.tribeName,
    annualIncome: Number(app.category?.annualIncome || 0),
    domicileState: app.category?.domicileState || app.personal?.state,
    educationLevel: app.academic?.educationLevel,
    course: app.academic?.course,
    institution: app.academic?.institution,
    institutionType: app.academic?.institutionType,
    universityRecognised: app.academic?.universityRecognised,
    previousPercentage: Number(app.academic?.previousPercentage || 0),
    entranceScore: Number(app.academic?.entranceScore || 0),
    age: app.personal?.dob ? Math.floor((Date.now() - new Date(app.personal.dob)) / (365.25 * 24 * 3600 * 1000)) : 0,
    gender: app.personal?.gender,
    isPvtg: app.personal?.isPvtg,
    isDisabled: app.personal?.isDisabled,
  };
}

/** Recomputes the full AI finding set for an application. */
export async function runAiPipeline(application, scheme) {
  const evaluation = evaluateScheme(toProfile(application), scheme);
  const detected = detectDeficiencies(application, scheme);
  application.deficiencies = mergeDeficiencies(application.deficiencies, detected);

  const docs = application.documents || [];
  const documentConfidence = docs.length
    ? Math.round(docs.reduce((sum, d) => sum + (d.ocr?.confidence || 0), 0) / docs.length)
    : 0;

  const { duplicateFlag, duplicateDetail } = await detectDuplicates(application);
  const openHigh = application.deficiencies.filter((d) => !d.resolved && d.severity === 'High').length;
  const openAny = application.deficiencies.filter((d) => !d.resolved).length;

  let recommendation = 'Needs Manual Review';
  if (!evaluation.eligible) recommendation = 'Recommend Rejection';
  else if (openHigh === 0 && documentConfidence >= 85 && !duplicateFlag) recommendation = 'Recommend Approval';
  else if (openHigh > 0 || duplicateFlag) recommendation = 'Needs Manual Review';

  const overallConfidence = Math.round(
    evaluation.score * 0.45 + documentConfidence * 0.4 + (openAny ? 0 : 15) - (duplicateFlag ? 10 : 0)
  );

  const meritScore = computeMeritScore({
    previousPercentage: Number(application.academic?.previousPercentage || 0),
    entranceScore: Number(application.academic?.entranceScore || 0),
    eligibilityScore: evaluation.score,
    documentConfidence,
    isPvtg: application.personal?.isPvtg,
    isDisabled: application.personal?.isDisabled,
    gender: application.personal?.gender,
  });

  const notes = [];
  if (openHigh) notes.push(`${openHigh} high-severity deficiency(ies) are open and must be closed before approval.`);
  if (duplicateFlag) notes.push('A possible duplicate application was detected for the same academic year.');
  if (documentConfidence && documentConfidence < 65) notes.push('Document extraction confidence is low; manual reading of the uploads is advised.');
  if (evaluation.eligible && !openAny) notes.push('All declared eligibility conditions are satisfied against the scheme rules.');
  notes.push('This output is advisory. Approval or rejection rests solely with the verifying officer.');

  application.aiFindings = {
    eligibilityScore: evaluation.score,
    meritScore,
    documentConfidence,
    overallConfidence: Math.max(0, Math.min(100, overallConfidence)),
    recommendation,
    rulesEvaluated: evaluation.rules.map((r) => ({
      label: r.label,
      passed: r.passed,
      expected: r.expected,
      observed: r.observed,
      mandatory: r.mandatory,
    })),
    duplicateFlag,
    duplicateDetail,
    notes,
    generatedAt: new Date(),
  };

  return application;
}

/** GET /api/applications — role-scoped list with filters */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'applicant') filter.applicant = req.user._id;

    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.state && req.query.state !== 'all') filter['personal.state'] = req.query.state;
    if (req.query.level && req.query.level !== 'all') filter['academic.educationLevel'] = req.query.level;
    if (req.query.scheme && req.query.scheme !== 'all') filter.scheme = req.query.scheme;
    if (req.query.year) filter.academicYear = req.query.year;
    if (req.query.q) {
      filter.$or = [
        { applicationId: new RegExp(req.query.q, 'i') },
        { 'personal.fullName': new RegExp(req.query.q, 'i') },
      ];
    }
    if (req.query.deficient === 'true') filter['deficiencies.resolved'] = false;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const [items, total] = await Promise.all([
      Application.find(filter)
        .populate('scheme', 'name shortName code type amountPerAnnum')
        .populate('applicant', 'name email phone category state')
        .sort(req.query.sort === 'merit' ? { 'aiFindings.meritScore': -1 } : { updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    return res.json({ total, page, limit, applications: items });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/applications/summary — dashboard counters */
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const match = req.user.role === 'applicant' ? { applicant: req.user._id } : {};
    const rows = await Application.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const deficient = await Application.countDocuments({ ...match, 'deficiencies.resolved': false });

    return res.json({
      byStatus,
      total: rows.reduce((sum, r) => sum + r.count, 0),
      active: (byStatus.Submitted || 0) + (byStatus['Under Verification'] || 0) + (byStatus['Deficiency Raised'] || 0),
      pendingVerification: (byStatus.Submitted || 0) + (byStatus['Under Verification'] || 0),
      deficiencies: deficient,
      approved: (byStatus.Selected || 0) + (byStatus.Sanctioned || 0) + (byStatus.Disbursed || 0),
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/applications/:id */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('scheme')
      .populate('applicant', 'name email phone category state district aadhaarMasked');
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (req.user.role === 'applicant' && String(app.applicant._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not authorised to view this application.' });
    }
    return res.json({ application: app, tracking: buildTrackingTimeline(app) });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/applications — create draft */
router.post('/', requireAuth, requireRole('applicant'), async (req, res, next) => {
  try {
    const { schemeId, ...rest } = req.body;
    const scheme = await Scheme.findById(schemeId);
    if (!scheme) return res.status(400).json({ message: 'Select a valid scheme before proceeding.' });

    const existing = await Application.findOne({
      applicant: req.user._id,
      scheme: scheme._id,
      academicYear: rest.academicYear || '2026-27',
      status: { $nin: ['Rejected'] },
    });
    if (existing) {
      return res.status(409).json({
        message: `You already have an application (${existing.applicationId}) for ${scheme.shortName || scheme.name} in this academic year.`,
        applicationId: existing._id,
      });
    }

    const app = new Application({
      ...rest,
      applicant: req.user._id,
      scheme: scheme._id,
      applicationId: await generateApplicationId(scheme.code),
      status: 'Draft',
    });
    app.personal = {
      ...app.personal,
      fullName: rest.personal?.fullName || req.user.name,
      email: rest.personal?.email || req.user.email,
      phone: rest.personal?.phone || req.user.phone,
      aadhaarMasked: rest.personal?.aadhaar ? User.maskAadhaar(rest.personal.aadhaar) : req.user.aadhaarMasked,
    };
    await runAiPipeline(app, scheme);
    await app.save();

    return res.status(201).json({ application: app });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/applications/:id — save a step or submit */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });

    const isOwner = String(app.applicant) === String(req.user._id);
    if (req.user.role === 'applicant' && !isOwner) {
      return res.status(403).json({ message: 'You are not authorised to modify this application.' });
    }
    if (req.user.role === 'applicant' && !['Draft', 'Deficiency Raised'].includes(app.status)) {
      return res.status(409).json({ message: 'A submitted application cannot be edited unless a deficiency has been raised.' });
    }

    ['personal', 'category', 'academic', 'bank'].forEach((section) => {
      if (req.body[section]) app[section] = { ...app[section]?.toObject?.(), ...req.body[section] };
    });
    if (req.body.personal?.aadhaar) app.personal.aadhaarMasked = User.maskAadhaar(req.body.personal.aadhaar);
    if (req.body.currentStep) app.currentStep = req.body.currentStep;
    if (req.body.schemeId && String(app.scheme) !== String(req.body.schemeId)) app.scheme = req.body.schemeId;

    const scheme = await Scheme.findById(app.scheme);
    await runAiPipeline(app, scheme);

    // Submission
    if (req.body.submit) {
      const blockers = app.aiFindings.rulesEvaluated.filter((r) => r.mandatory && !r.passed);
      if (blockers.length) {
        return res.status(422).json({
          message: 'The application does not satisfy the mandatory eligibility conditions of the selected scheme.',
          blockers,
        });
      }
      const missing = app.deficiencies.filter((d) => !d.resolved && d.code.startsWith('MISSING_'));
      if (missing.length) {
        return res.status(422).json({
          message: 'Upload all mandatory documents before submitting.',
          missing: missing.map((m) => m.title),
        });
      }
      const openHigh = app.deficiencies.filter((d) => !d.resolved && d.severity === 'High').length;
      app.status = openHigh ? 'Deficiency Raised' : 'Submitted';
      app.submittedAt = app.submittedAt || new Date();
      pushTimeline(app, 'Application Submitted', `Submitted online by the applicant. System reference ${app.applicationId}.`, app.personal?.fullName || 'Applicant');
      if (openHigh) {
        pushTimeline(app, 'Documents Verified', 'Automated pre-check raised deficiencies. Applicant response awaited.', 'AI Verification Engine', 'current');
      }
    } else if (app.status === 'Deficiency Raised') {
      const openHigh = app.deficiencies.filter((d) => !d.resolved && d.severity === 'High').length;
      if (!openHigh) {
        app.status = 'Submitted';
        pushTimeline(app, 'Application Submitted', 'Deficiencies closed by the applicant. Returned to the verification queue.', app.personal?.fullName || 'Applicant');
      }
    }

    await app.save();
    return res.json({ application: app, tracking: buildTrackingTimeline(app) });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/applications/:id/deficiencies/:code/respond */
router.post('/:id/deficiencies/:code/respond', requireAuth, requireRole('applicant'), async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (String(app.applicant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not authorised to respond to this deficiency.' });
    }
    const deficiency = app.deficiencies.find((d) => d.code === req.params.code);
    if (!deficiency) return res.status(404).json({ message: 'Deficiency not found.' });

    deficiency.applicantRemark = req.body.remark || '';
    pushTimeline(app, 'Documents Verified', `Applicant response recorded for: ${deficiency.title}`, app.personal?.fullName || 'Applicant', 'current');
    await app.save();
    return res.json({ application: app });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/applications/:id — withdraw a draft */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    const isOwner = String(app.applicant) === String(req.user._id);
    if (req.user.role !== 'admin' && !isOwner) return res.status(403).json({ message: 'Not authorised.' });
    if (app.status !== 'Draft' && req.user.role !== 'admin') {
      return res.status(409).json({ message: 'Only a draft application can be withdrawn.' });
    }
    await app.deleteOne();
    return res.json({ message: 'Application withdrawn.' });
  } catch (err) {
    return next(err);
  }
});

export default router;
