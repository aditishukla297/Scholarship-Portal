import { Router } from 'express';
import * as Applications from '../repos/applications.js';
import * as Schemes from '../repos/schemes.js';
import { maskAadhaar } from '../repos/users.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateApplicationId, buildTrackingTimeline, pushTimeline } from '../utils/application.js';
import { evaluateScheme, computeMeritScore } from '../services/eligibility.js';
import { detectDeficiencies, mergeDeficiencies } from '../services/deficiency.js';
import { detectDuplicates } from '../services/duplicate.js';

const router = Router();

const idOf = (value) => (value && typeof value === 'object' ? value._id : value);

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
    age: app.personal?.dob
      ? Math.floor((Date.now() - new Date(app.personal.dob)) / (365.25 * 24 * 3600 * 1000))
      : 0,
    gender: app.personal?.gender,
    isPvtg: app.personal?.isPvtg,
    isDisabled: app.personal?.isDisabled,
  };
}

/**
 * Recomputes the full AI finding set for an application.
 * Mutates the in-memory object; the caller persists it.
 */
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
  if (documentConfidence && documentConfidence < 65) {
    notes.push('Document extraction confidence is low; manual reading of the uploads is advised.');
  }
  if (evaluation.eligible && !openAny) {
    notes.push('All declared eligibility conditions are satisfied against the scheme rules.');
  }
  notes.push('This output is advisory. Approval or rejection rests solely with the verifying officer.');

  application.aiFindings = {
    eligibilityScore: evaluation.score,
    meritScore,
    documentConfidence,
    overallConfidence: Math.max(0, Math.min(100, overallConfidence)),
    recommendation,
    rulesEvaluated: evaluation.rules.map((r) => ({
      label: r.label, passed: r.passed, expected: r.expected, observed: r.observed, mandatory: r.mandatory,
    })),
    duplicateFlag,
    duplicateDetail,
    notes,
    generatedAt: new Date().toISOString(),
  };

  return application;
}

/** Persists the sections the AI pipeline may have changed. */
export function aiPatch(application) {
  return {
    deficiencies: application.deficiencies,
    aiFindings: application.aiFindings,
    timeline: application.timeline,
  };
}

/** GET /api/applications — role-scoped list with filters */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { applications, total } = await Applications.list({
      applicantId: req.user.role === 'applicant' ? req.user._id : undefined,
      status: req.query.status,
      state: req.query.state,
      level: req.query.level,
      scheme: req.query.scheme,
      year: req.query.year,
      q: req.query.q,
      deficient: req.query.deficient,
      sort: req.query.sort,
      page: Math.max(1, Number(req.query.page) || 1),
      limit: Math.min(100, Number(req.query.limit) || 20),
    });
    return res.json({ total, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, applications });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/applications/summary — dashboard counters */
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    return res.json(
      await Applications.summary({ applicantId: req.user.role === 'applicant' ? req.user._id : undefined })
    );
  } catch (err) {
    return next(err);
  }
});

/** GET /api/applications/:id */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const app = await Applications.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (req.user.role === 'applicant' && String(idOf(app.applicant)) !== String(req.user._id)) {
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
    const scheme = await Schemes.findById(schemeId);
    if (!scheme) return res.status(400).json({ message: 'Select a valid scheme before proceeding.' });

    const academicYear = rest.academicYear || '2026-27';
    const existing = await Applications.findLiveForApplicantAndScheme(req.user._id, scheme._id, academicYear);
    if (existing) {
      return res.status(409).json({
        message: `You already have an application (${existing.applicationId}) for ${scheme.shortName || scheme.name} in this academic year.`,
        applicationId: existing._id,
      });
    }

    const draft = {
      applicationId: await generateApplicationId(scheme.code),
      applicantId: req.user._id,
      schemeId: scheme._id,
      academicYear,
      status: 'Draft',
      currentStep: rest.currentStep || 1,
      personal: {
        ...(rest.personal || {}),
        fullName: rest.personal?.fullName || req.user.name,
        email: rest.personal?.email || req.user.email,
        phone: rest.personal?.phone || req.user.phone,
        aadhaarMasked: rest.personal?.aadhaar ? maskAadhaar(rest.personal.aadhaar) : req.user.aadhaarMasked,
      },
      category: rest.category || {},
      academic: rest.academic || {},
      bank: rest.bank || {},
      documents: [],
      deficiencies: [],
      timeline: [],
    };
    delete draft.personal.aadhaar;

    // Evaluate before insert so the stored record already carries its findings.
    const staged = { ...draft, _id: null, scheme: scheme._id, applicant: req.user._id };
    await runAiPipeline(staged, scheme);
    draft.deficiencies = staged.deficiencies;
    draft.aiFindings = staged.aiFindings;

    const created = await Applications.create(draft);
    return res.status(201).json({ application: created });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/applications/:id — save a step or submit */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const app = await Applications.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });

    const isOwner = String(idOf(app.applicant)) === String(req.user._id);
    if (req.user.role === 'applicant' && !isOwner) {
      return res.status(403).json({ message: 'You are not authorised to modify this application.' });
    }
    if (req.user.role === 'applicant' && !['Draft', 'Deficiency Raised'].includes(app.status)) {
      return res.status(409).json({ message: 'A submitted application cannot be edited unless a deficiency has been raised.' });
    }

    const patch = {};
    ['personal', 'category', 'academic', 'bank'].forEach((section) => {
      if (req.body[section]) {
        app[section] = { ...app[section], ...req.body[section] };
        patch[section] = app[section];
      }
    });
    if (req.body.personal?.aadhaar) {
      app.personal.aadhaarMasked = maskAadhaar(req.body.personal.aadhaar);
      delete app.personal.aadhaar;
      patch.personal = app.personal;
    }
    if (req.body.currentStep) patch.currentStep = req.body.currentStep;
    if (req.body.schemeId && String(idOf(app.scheme)) !== String(req.body.schemeId)) {
      patch.schemeId = req.body.schemeId;
      app.scheme = req.body.schemeId;
    }

    const scheme = await Schemes.findById(idOf(app.scheme));
    await runAiPipeline(app, scheme);
    Object.assign(patch, aiPatch(app));

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
      patch.status = openHigh ? 'Deficiency Raised' : 'Submitted';
      patch.submittedAt = app.submittedAt || new Date();
      pushTimeline(app, 'Application Submitted', `Submitted online by the applicant. System reference ${app.applicationId}.`, app.personal?.fullName || 'Applicant');
      if (openHigh) {
        pushTimeline(app, 'Documents Verified', 'Automated pre-check raised deficiencies. Applicant response awaited.', 'AI Verification Engine', 'current');
      }
      patch.timeline = app.timeline;
    } else if (app.status === 'Deficiency Raised') {
      const openHigh = app.deficiencies.filter((d) => !d.resolved && d.severity === 'High').length;
      if (!openHigh) {
        patch.status = 'Submitted';
        pushTimeline(app, 'Application Submitted', 'Deficiencies closed by the applicant. Returned to the verification queue.', app.personal?.fullName || 'Applicant');
        patch.timeline = app.timeline;
      }
    }

    const saved = await Applications.update(app._id, patch);
    return res.json({ application: saved, tracking: buildTrackingTimeline(saved) });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/applications/:id/deficiencies/:code/respond */
router.post('/:id/deficiencies/:code/respond', requireAuth, requireRole('applicant'), async (req, res, next) => {
  try {
    const app = await Applications.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (String(idOf(app.applicant)) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not authorised to respond to this deficiency.' });
    }
    const deficiency = (app.deficiencies || []).find((d) => d.code === req.params.code);
    if (!deficiency) return res.status(404).json({ message: 'Deficiency not found.' });

    deficiency.applicantRemark = req.body.remark || '';
    pushTimeline(app, 'Documents Verified', `Applicant response recorded for: ${deficiency.title}`, app.personal?.fullName || 'Applicant', 'current');

    const saved = await Applications.update(app._id, { deficiencies: app.deficiencies, timeline: app.timeline });
    return res.json({ application: saved });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/applications/:id — withdraw a draft */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const app = await Applications.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    const isOwner = String(idOf(app.applicant)) === String(req.user._id);
    if (req.user.role !== 'admin' && !isOwner) return res.status(403).json({ message: 'Not authorised.' });
    if (app.status !== 'Draft' && req.user.role !== 'admin') {
      return res.status(409).json({ message: 'Only a draft application can be withdrawn.' });
    }
    await Applications.remove(app._id);
    return res.json({ message: 'Application withdrawn.' });
  } catch (err) {
    return next(err);
  }
});

export default router;
