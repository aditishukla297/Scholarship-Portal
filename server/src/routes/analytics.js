import { Router } from 'express';
import Application from '../models/Application.js';
import Verification from '../models/Verification.js';
import User from '../models/User.js';
import Scheme from '../models/Scheme.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const APPROVED = ['Selected', 'Sanctioned', 'Disbursed'];

/** GET /api/analytics — MIS dashboard for Ministry officials */
router.get('/', requireAuth, requireRole('officer', 'admin'), async (req, res, next) => {
  try {
    const match = {};
    if (req.query.year) match.academicYear = req.query.year;
    if (req.query.scheme && req.query.scheme !== 'all') match.scheme = req.query.scheme;

    const group = async (field) =>
      Application.aggregate([
        { $match: match },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

    const [byState, byStatus, byLevel, byGender, total] = await Promise.all([
      group('personal.state'),
      group('status'),
      group('academic.educationLevel'),
      group('personal.gender'),
      Application.countDocuments(match),
    ]);

    const byScheme = await Application.aggregate([
      { $match: match },
      { $group: { _id: '$scheme', count: { $sum: 1 }, approved: { $sum: { $cond: [{ $in: ['$status', APPROVED] }, 1, 0] } } } },
      { $lookup: { from: 'schemes', localField: '_id', foreignField: '_id', as: 'scheme' } },
      { $unwind: '$scheme' },
      { $project: { _id: 0, code: '$scheme.code', name: '$scheme.shortName', count: 1, approved: 1 } },
      { $sort: { count: -1 } },
    ]);

    const deficiencyRows = await Application.aggregate([
      { $match: match },
      { $unwind: '$deficiencies' },
      { $group: { _id: '$deficiencies.title', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    // Average verification turnaround, in days.
    const turnaround = await Application.aggregate([
      { $match: { ...match, submittedAt: { $ne: null }, verifiedAt: { $ne: null } } },
      { $project: { days: { $divide: [{ $subtract: ['$verifiedAt', '$submittedAt'] }, 1000 * 60 * 60 * 24] } } },
      { $group: { _id: null, avg: { $avg: '$days' }, min: { $min: '$days' }, max: { $max: '$days' } } },
    ]);

    const monthly = await Application.aggregate([
      { $match: { ...match, submittedAt: { $ne: null } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$submittedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    const statusMap = Object.fromEntries(byStatus.map((r) => [r._id, r.count]));
    const approved = APPROVED.reduce((sum, s) => sum + (statusMap[s] || 0), 0);
    const decided = approved + (statusMap.Rejected || 0);

    const officerLoad = await Verification.aggregate([
      { $group: { _id: '$officer', actions: { $sum: 1 }, overrides: { $sum: { $cond: ['$overrodeAi', 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'officer' } },
      { $unwind: '$officer' },
      { $project: { _id: 0, name: '$officer.name', designation: '$officer.designation', actions: 1, overrides: 1 } },
      { $sort: { actions: -1 } },
      { $limit: 10 },
    ]);

    return res.json({
      generatedAt: new Date(),
      totals: {
        applications: total,
        approved,
        rejected: statusMap.Rejected || 0,
        pending: (statusMap.Submitted || 0) + (statusMap['Under Verification'] || 0),
        deficiencies: statusMap['Deficiency Raised'] || 0,
        approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
        avgVerificationDays: turnaround[0] ? Math.round(turnaround[0].avg * 10) / 10 : 0,
        beneficiaries: statusMap.Disbursed || 0,
      },
      byState: byState.filter((r) => r._id).map((r) => ({ label: r._id, value: r.count })),
      byScheme: byScheme.map((r) => ({ label: r.name || r.code, value: r.count, approved: r.approved })),
      byStatus: byStatus.filter((r) => r._id).map((r) => ({ label: r._id, value: r.count })),
      byEducationLevel: byLevel.filter((r) => r._id).map((r) => ({ label: r._id, value: r.count })),
      byGender: byGender.filter((r) => r._id && r._id !== 'NA').map((r) => ({ label: r._id, value: r.count })),
      topDeficiencies: deficiencyRows.map((r) => ({ label: r._id, value: r.count })),
      monthlySubmissions: monthly.map((r) => ({ label: r._id, value: r.count })),
      verificationTime: turnaround[0]
        ? { avg: Math.round(turnaround[0].avg * 10) / 10, min: Math.round(turnaround[0].min * 10) / 10, max: Math.round(turnaround[0].max * 10) / 10 }
        : { avg: 0, min: 0, max: 0 },
      officerLoad,
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/analytics/report — tabular report for download */
router.get('/report', requireAuth, requireRole('admin', 'officer'), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.scheme && req.query.scheme !== 'all') filter.scheme = req.query.scheme;
    if (req.query.state && req.query.state !== 'all') filter['personal.state'] = req.query.state;
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const rows = await Application.find(filter)
      .populate('scheme', 'shortName code')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const data = rows.map((a) => ({
      applicationId: a.applicationId,
      name: a.personal?.fullName || '',
      state: a.personal?.state || '',
      district: a.personal?.district || '',
      gender: a.personal?.gender || '',
      scheme: a.scheme?.shortName || a.scheme?.code || '',
      educationLevel: a.academic?.educationLevel || '',
      institution: a.academic?.institution || '',
      status: a.status,
      meritScore: a.aiFindings?.meritScore || 0,
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString().slice(0, 10) : '',
    }));

    if (req.query.format === 'csv') {
      const headers = Object.keys(data[0] || { applicationId: '' });
      const csv = [
        headers.join(','),
        ...data.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="MoTA-report-${Date.now()}.csv"`);
      return res.send(csv);
    }

    return res.json({ count: data.length, rows: data });
  } catch (err) {
    return next(err);
  }
});

export default router;
