import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import Application from '../models/Application.js';
import Scheme from '../models/Scheme.js';
import Verification from '../models/Verification.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload, UPLOAD_DIR } from '../middleware/upload.js';
import { runOcr, confidenceBand } from '../services/ocr.js';
import { runAiPipeline } from './applications.js';
import { pushTimeline, buildTrackingTimeline } from '../utils/application.js';

const router = Router();

/**
 * Uploads a document and runs OCR extraction over it.
 * Served at both POST /api/ocr and POST /api/verify/ocr.
 * multipart/form-data: file, applicationId, documentCode, documentName
 */
export async function ocrHandler(req, res, next) {
  try {
    const { applicationId, documentCode, documentName } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file was received. Attach a PDF, JPG or PNG.' });
    if (!applicationId || !documentCode) {
      fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
      return res.status(400).json({ message: 'Application reference and document type are required.' });
    }

    const app = await Application.findById(applicationId);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (req.user.role === 'applicant' && String(app.applicant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not authorised to upload against this application.' });
    }

    const scheme = await Scheme.findById(app.scheme);
    const requirement = (scheme?.requiredDocuments || []).find((d) => d.code === documentCode);

    const ocr = runOcr({ documentCode, fileName: req.file.originalname, application: app });

    const entry = {
      code: documentCode,
      name: documentName || requirement?.name || documentCode,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedAt: new Date(),
      status: ocr.fields.some((f) => !f.matchesProfile) ? 'Deficient' : 'Uploaded',
      ocr,
    };

    // Replace any previous upload of the same document type.
    const priorIndex = app.documents.findIndex((d) => d.code === documentCode);
    if (priorIndex >= 0) {
      const prior = app.documents[priorIndex];
      if (prior.storedName) fs.unlink(path.join(UPLOAD_DIR, prior.storedName), () => {});
      app.documents.splice(priorIndex, 1, entry);
    } else {
      app.documents.push(entry);
    }

    await runAiPipeline(app, scheme);
    await app.save();

    return res.status(201).json({
      document: app.documents.find((d) => d.code === documentCode),
      confidenceBand: confidenceBand(ocr.confidence),
      deficiencies: app.deficiencies.filter((d) => !d.resolved),
      aiFindings: app.aiFindings,
    });
  } catch (err) {
    return next(err);
  }
}

router.post('/ocr', requireAuth, upload.single('file'), ocrHandler);

/** A standalone router so the same handler is reachable at POST /api/ocr. */
export const ocrRouter = Router();
ocrRouter.post('/', requireAuth, upload.single('file'), ocrHandler);

/** GET /api/verify/documents/:applicationId/:storedName — stream an uploaded file */
router.get('/documents/:applicationId/:storedName', requireAuth, async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.applicationId).lean();
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (req.user.role === 'applicant' && String(app.applicant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorised.' });
    }
    const doc = (app.documents || []).find((d) => d.storedName === req.params.storedName);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Stored file is no longer available.' });
    res.type(doc.mimeType || 'application/octet-stream');
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    return next(err);
  }
});

/** GET /api/verify/queue — officer work queue counters */
router.get('/queue', requireAuth, requireRole('officer', 'admin'), async (_req, res, next) => {
  try {
    const [pending, verified, deficient, selected, rejected] = await Promise.all([
      Application.countDocuments({ status: { $in: ['Submitted', 'Under Verification'] } }),
      Application.countDocuments({ status: 'Verified' }),
      Application.countDocuments({ status: 'Deficiency Raised' }),
      Application.countDocuments({ status: { $in: ['Selected', 'Sanctioned', 'Disbursed'] } }),
      Application.countDocuments({ status: 'Rejected' }),
    ]);
    return res.json({ pending, verified, deficient, selected, rejected });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/verify/:applicationId — the AI verification panel payload */
router.get('/:applicationId', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.applicationId)
      .populate('scheme')
      .populate('applicant', 'name email phone category state district aadhaarMasked');
    if (!app) return res.status(404).json({ message: 'Application not found.' });

    const history = await Verification.find({ application: app._id })
      .populate('officer', 'name designation')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      application: app,
      tracking: buildTrackingTimeline(app),
      history,
      panel: {
        documents: (app.documents || []).map((d) => ({
          code: d.code,
          name: d.name,
          fileName: d.fileName,
          storedName: d.storedName,
          mimeType: d.mimeType,
          status: d.status,
          uploadedAt: d.uploadedAt,
          confidence: d.ocr?.confidence || 0,
          band: confidenceBand(d.ocr?.confidence || 0),
          fields: d.ocr?.fields || [],
        })),
        rules: app.aiFindings?.rulesEvaluated || [],
        recommendation: app.aiFindings?.recommendation,
        overallConfidence: app.aiFindings?.overallConfidence || 0,
        band: confidenceBand(app.aiFindings?.overallConfidence || 0),
        notes: app.aiFindings?.notes || [],
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/verify — record an officer decision.
 * The officer's decision is always final; the AI recommendation is stored alongside
 * it so that any override is visible in the audit trail.
 */
router.post('/', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const { applicationId, action, remarks, documentsChecked, deficiency } = req.body;
    const VALID = ['Verified', 'Deficiency Raised', 'Approved', 'Rejected', 'Selected', 'Sanctioned', 'Reopened'];
    if (!VALID.includes(action)) return res.status(400).json({ message: 'Unrecognised verification action.' });

    const app = await Application.findById(applicationId);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (action === 'Rejected' && !String(remarks || '').trim()) {
      return res.status(400).json({ message: 'Rejection requires a recorded reason.' });
    }

    const aiRecommendation = app.aiFindings?.recommendation || 'Pending';
    const officerName = `${req.user.name}${req.user.designation ? `, ${req.user.designation}` : ''}`;

    switch (action) {
      case 'Verified':
        app.status = 'Verified';
        app.verifiedAt = new Date();
        pushTimeline(app, 'Documents Verified', remarks || 'Documents verified against the uploaded records.', officerName);
        pushTimeline(app, 'Eligibility Approved', 'Eligibility conditions confirmed by the verifying officer.', officerName);
        break;
      case 'Deficiency Raised': {
        app.status = 'Deficiency Raised';
        if (deficiency?.title) {
          app.deficiencies.push({
            code: `OFFICER_${Date.now()}`,
            documentCode: deficiency.documentCode || '',
            title: deficiency.title,
            detail: deficiency.detail || remarks || '',
            severity: deficiency.severity || 'High',
            raisedBy: 'Officer',
            raisedAt: new Date(),
            dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
          });
        }
        pushTimeline(app, 'Documents Verified', `Deficiency raised: ${deficiency?.title || remarks}`, officerName, 'current');
        break;
      }
      case 'Selected':
      case 'Approved':
        app.status = 'Selected';
        app.decisionAt = new Date();
        pushTimeline(app, 'Selection', remarks || 'Selected for award under the scheme.', officerName);
        break;
      case 'Sanctioned':
        app.status = 'Sanctioned';
        app.sanctionOrderNumber = req.body.sanctionOrderNumber || `MoTA/SANC/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
        pushTimeline(app, 'Sanction', `Sanction order ${app.sanctionOrderNumber} issued.`, officerName);
        break;
      case 'Rejected':
        app.status = 'Rejected';
        app.decisionAt = new Date();
        pushTimeline(app, 'Documents Verified', `Application rejected. Reason: ${remarks}`, officerName, 'rejected');
        break;
      case 'Reopened':
        app.status = 'Under Verification';
        pushTimeline(app, 'Documents Verified', remarks || 'Application reopened for re-examination.', officerName, 'current');
        break;
      default:
        break;
    }

    const overrodeAi =
      (aiRecommendation === 'Recommend Approval' && ['Rejected'].includes(action)) ||
      (aiRecommendation === 'Recommend Rejection' && ['Approved', 'Selected', 'Verified'].includes(action));

    await app.save();

    const record = await Verification.create({
      application: app._id,
      officer: req.user._id,
      action,
      remarks: remarks || '',
      confidence: app.aiFindings?.overallConfidence || 0,
      aiRecommendation,
      overrodeAi,
      documentsChecked: documentsChecked || [],
    });

    return res.status(201).json({ verification: record, application: app, overrodeAi });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/verify/selection/list — merit-ranked, verification-complete candidates */
router.get('/selection/list', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const filter = { status: { $in: ['Verified', 'Selected', 'Sanctioned', 'Disbursed'] } };
    if (req.query.scheme && req.query.scheme !== 'all') filter.scheme = req.query.scheme;
    if (req.query.state && req.query.state !== 'all') filter['personal.state'] = req.query.state;

    const items = await Application.find(filter)
      .populate('scheme', 'name shortName code slotsPerYear amountPerAnnum')
      .populate('applicant', 'name email category')
      .sort({ 'aiFindings.meritScore': -1 })
      .limit(200)
      .lean();

    return res.json({
      count: items.length,
      candidates: items.map((a, index) => ({
        rank: index + 1,
        _id: a._id,
        applicationId: a.applicationId,
        name: a.personal?.fullName || a.applicant?.name,
        state: a.personal?.state,
        scheme: a.scheme,
        educationLevel: a.academic?.educationLevel,
        meritScore: a.aiFindings?.meritScore || 0,
        eligibilityScore: a.aiFindings?.eligibilityScore || 0,
        documentConfidence: a.aiFindings?.documentConfidence || 0,
        verificationComplete: ['Verified', 'Selected', 'Sanctioned', 'Disbursed'].includes(a.status),
        openDeficiencies: (a.deficiencies || []).filter((d) => !d.resolved).length,
        recommendation: a.aiFindings?.recommendation,
        status: a.status,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
