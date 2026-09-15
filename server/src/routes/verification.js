import { Router } from 'express';
import * as Applications from '../repos/applications.js';
import * as Schemes from '../repos/schemes.js';
import * as Verifications from '../repos/verifications.js';
import * as DocumentFiles from '../repos/documentFiles.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload, buildStoredName } from '../middleware/upload.js';
import { runOcr, confidenceBand } from '../services/ocr.js';
import { runAiPipeline, aiPatch } from './applications.js';
import { pushTimeline, buildTrackingTimeline } from '../utils/application.js';

const router = Router();

const idOf = (value) => (value && typeof value === 'object' ? value._id : value);

/**
 * Uploads a document and runs OCR extraction over it.
 * Served at both POST /api/ocr and POST /api/verify/ocr.
 */
export async function ocrHandler(req, res, next) {
  try {
    const { applicationId, documentCode, documentName } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file was received. Attach a PDF, JPG or PNG.' });
    if (!applicationId || !documentCode) {
      return res.status(400).json({ message: 'Application reference and document type are required.' });
    }

    const app = await Applications.findById(applicationId);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (req.user.role === 'applicant' && String(idOf(app.applicant)) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not authorised to upload against this application.' });
    }

    const scheme = await Schemes.findById(idOf(app.scheme));
    const requirement = (scheme?.requiredDocuments || []).find((d) => d.code === documentCode);

    const ocr = runOcr({ documentCode, fileName: req.file.originalname, application: app });

    // The binary lives in the database: the serverless filesystem is read-only.
    const storedName = buildStoredName(documentCode, req.file.mimetype);
    await DocumentFiles.save({
      storedName,
      applicationId: app._id,
      documentCode,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      data: req.file.buffer,
    });

    const entry = {
      code: documentCode,
      name: documentName || requirement?.name || documentCode,
      fileName: req.file.originalname,
      storedName,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedAt: new Date().toISOString(),
      status: ocr.fields.some((f) => !f.matchesProfile) ? 'Deficient' : 'Uploaded',
      ocr,
    };

    // Replace any previous upload of the same document type.
    app.documents = app.documents || [];
    const priorIndex = app.documents.findIndex((d) => d.code === documentCode);
    if (priorIndex >= 0) {
      const prior = app.documents[priorIndex];
      if (prior.storedName) await DocumentFiles.removeByStoredName(prior.storedName);
      app.documents.splice(priorIndex, 1, entry);
    } else {
      app.documents.push(entry);
    }

    await runAiPipeline(app, scheme);
    const saved = await Applications.update(app._id, { documents: app.documents, ...aiPatch(app) });

    return res.status(201).json({
      document: saved.documents.find((d) => d.code === documentCode),
      confidenceBand: confidenceBand(ocr.confidence),
      deficiencies: saved.deficiencies.filter((d) => !d.resolved),
      aiFindings: saved.aiFindings,
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
    const app = await Applications.findById(req.params.applicationId);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (req.user.role === 'applicant' && String(idOf(app.applicant)) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorised.' });
    }
    const doc = (app.documents || []).find((d) => d.storedName === req.params.storedName);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const stored = await DocumentFiles.findByStoredName(doc.storedName);
    if (!stored) return res.status(404).json({ message: 'Stored file is no longer available.' });

    res.type(stored.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${stored.file_name || doc.storedName}"`);
    return res.send(stored.data);
  } catch (err) {
    return next(err);
  }
});

/** GET /api/verify/queue — officer work queue counters */
router.get('/queue', requireAuth, requireRole('officer', 'admin'), async (_req, res, next) => {
  try {
    return res.json(await Applications.queueCounts());
  } catch (err) {
    return next(err);
  }
});

/** GET /api/verify/selection/list — merit-ranked, verification-complete candidates */
router.get('/selection/list', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const items = await Applications.selectionList({ scheme: req.query.scheme, state: req.query.state });
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

/** GET /api/verify/:applicationId — the AI verification panel payload */
router.get('/:applicationId', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const app = await Applications.findById(req.params.applicationId);
    if (!app) return res.status(404).json({ message: 'Application not found.' });

    const history = await Verifications.historyFor(app._id);

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
 * The officer's decision is always final; the AI recommendation is stored
 * alongside it so that any override is visible in the audit trail.
 */
router.post('/', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const { applicationId, action, remarks, documentsChecked, deficiency } = req.body;
    const VALID = ['Verified', 'Deficiency Raised', 'Approved', 'Rejected', 'Selected', 'Sanctioned', 'Reopened'];
    if (!VALID.includes(action)) return res.status(400).json({ message: 'Unrecognised verification action.' });

    const app = await Applications.findById(applicationId);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    if (action === 'Rejected' && !String(remarks || '').trim()) {
      return res.status(400).json({ message: 'Rejection requires a recorded reason.' });
    }

    const aiRecommendation = app.aiFindings?.recommendation || 'Pending';
    const officerName = `${req.user.name}${req.user.designation ? `, ${req.user.designation}` : ''}`;
    const patch = {};

    switch (action) {
      case 'Verified':
        patch.status = 'Verified';
        patch.verifiedAt = new Date();
        pushTimeline(app, 'Documents Verified', remarks || 'Documents verified against the uploaded records.', officerName);
        pushTimeline(app, 'Eligibility Approved', 'Eligibility conditions confirmed by the verifying officer.', officerName);
        break;
      case 'Deficiency Raised':
        patch.status = 'Deficiency Raised';
        if (deficiency?.title) {
          app.deficiencies = app.deficiencies || [];
          app.deficiencies.push({
            code: `OFFICER_${Date.now()}`,
            documentCode: deficiency.documentCode || '',
            title: deficiency.title,
            detail: deficiency.detail || remarks || '',
            severity: deficiency.severity || 'High',
            raisedBy: 'Officer',
            raisedAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
            resolved: false,
          });
          patch.deficiencies = app.deficiencies;
        }
        pushTimeline(app, 'Documents Verified', `Deficiency raised: ${deficiency?.title || remarks}`, officerName, 'current');
        break;
      case 'Selected':
      case 'Approved':
        patch.status = 'Selected';
        patch.decisionAt = new Date();
        pushTimeline(app, 'Selection', remarks || 'Selected for award under the scheme.', officerName);
        break;
      case 'Sanctioned':
        patch.status = 'Sanctioned';
        patch.sanctionOrderNumber =
          req.body.sanctionOrderNumber || `MoTA/SANC/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
        pushTimeline(app, 'Sanction', `Sanction order ${patch.sanctionOrderNumber} issued.`, officerName);
        break;
      case 'Rejected':
        patch.status = 'Rejected';
        patch.decisionAt = new Date();
        pushTimeline(app, 'Documents Verified', `Application rejected. Reason: ${remarks}`, officerName, 'rejected');
        break;
      case 'Reopened':
        patch.status = 'Under Verification';
        pushTimeline(app, 'Documents Verified', remarks || 'Application reopened for re-examination.', officerName, 'current');
        break;
      default:
        break;
    }
    patch.timeline = app.timeline;

    const overrodeAi =
      (aiRecommendation === 'Recommend Approval' && action === 'Rejected') ||
      (aiRecommendation === 'Recommend Rejection' && ['Approved', 'Selected', 'Verified'].includes(action));

    const saved = await Applications.update(app._id, patch);

    const record = await Verifications.create({
      applicationId: app._id,
      officerId: req.user._id,
      action,
      remarks: remarks || '',
      confidence: app.aiFindings?.overallConfidence || 0,
      aiRecommendation,
      overrodeAi,
      documentsChecked: documentsChecked || [],
    });

    return res.status(201).json({ verification: record, application: saved, overrodeAi });
  } catch (err) {
    return next(err);
  }
});

export default router;
