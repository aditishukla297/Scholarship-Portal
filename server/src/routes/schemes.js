import { Router } from 'express';
import Scheme from '../models/Scheme.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/** GET /api/schemes — public list */
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active !== 'all') filter.active = true;
    if (req.query.level) filter.educationLevels = req.query.level;
    if (req.query.type) filter.type = req.query.type;
    const schemes = await Scheme.find(filter).sort({ name: 1 }).lean();
    return res.json({ count: schemes.length, schemes });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/schemes/:idOrCode */
router.get('/:idOrCode', async (req, res, next) => {
  try {
    const { idOrCode } = req.params;
    const query = /^[0-9a-fA-F]{24}$/.test(idOrCode) ? { _id: idOrCode } : { code: idOrCode.toUpperCase() };
    const scheme = await Scheme.findOne(query).lean();
    if (!scheme) return res.status(404).json({ message: 'Scheme not found.' });
    return res.json({ scheme });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/schemes — administrator only */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const scheme = await Scheme.create(req.body);
    return res.status(201).json({ scheme });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/schemes/:id — administrator only */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const scheme = await Scheme.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!scheme) return res.status(404).json({ message: 'Scheme not found.' });
    return res.json({ scheme });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/schemes/:id — soft delete */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const scheme = await Scheme.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!scheme) return res.status(404).json({ message: 'Scheme not found.' });
    return res.json({ scheme, message: 'Scheme deactivated.' });
  } catch (err) {
    return next(err);
  }
});

export default router;
