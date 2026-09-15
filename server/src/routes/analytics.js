import { Router } from 'express';
import * as Analytics from '../repos/analytics.js';
import * as Verifications from '../repos/verifications.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/** GET /api/analytics — MIS dashboard for Ministry officials */
router.get('/', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const [data, officerLoad] = await Promise.all([
      Analytics.dashboard({ year: req.query.year, scheme: req.query.scheme }),
      Verifications.officerLoad(10),
    ]);
    return res.json({ ...data, officerLoad });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/analytics/report — tabular report, optionally as CSV */
router.get('/report', requireAuth, requireRole('admin', 'officer'), async (req, res, next) => {
  try {
    const rows = await Analytics.report({
      scheme: req.query.scheme,
      state: req.query.state,
      status: req.query.status,
    });

    if (req.query.format === 'csv') {
      const headers = Object.keys(
        rows[0] || {
          applicationId: '', name: '', state: '', district: '', gender: '',
          scheme: '', educationLevel: '', institution: '', status: '',
          meritScore: '', submittedAt: '',
        }
      );
      const csv = [
        headers.join(','),
        ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="MoTA-report-${Date.now()}.csv"`);
      return res.send(csv);
    }

    return res.json({ count: rows.length, rows });
  } catch (err) {
    return next(err);
  }
});

export default router;
