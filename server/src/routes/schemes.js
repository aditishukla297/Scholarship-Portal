import { Router } from 'express';
import * as Schemes from '../repos/schemes.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/** GET /api/schemes — public list */
router.get('/', async (req, res, next) => {
  try {
    const schemes = await Schemes.list({
      activeOnly: req.query.active !== 'all',
      level: req.query.level,
      type: req.query.type,
    });
    return res.json({ count: schemes.length, schemes });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/schemes/:idOrCode */
router.get('/:idOrCode', async (req, res, next) => {
  try {
    const scheme = await Schemes.findByIdOrCode(req.params.idOrCode);
    if (!scheme) return res.status(404).json({ message: 'Scheme not found.' });
    return res.json({ scheme });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/schemes — administrator only */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.body.code || !req.body.name) {
      return res.status(400).json({ message: 'Scheme code and name are mandatory.' });
    }
    if (await Schemes.findByIdOrCode(req.body.code)) {
      return res.status(409).json({ message: 'A scheme already exists with this code.' });
    }
    const scheme = await Schemes.create(req.body);
    return res.status(201).json({ scheme });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/schemes/:id — administrator only */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const existing = await Schemes.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Scheme not found.' });
    const scheme = await Schemes.update(req.params.id, req.body);
    return res.json({ scheme });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/schemes/:id — soft delete */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const existing = await Schemes.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Scheme not found.' });
    const scheme = await Schemes.update(req.params.id, { active: false });
    return res.json({ scheme, message: 'Scheme deactivated.' });
  } catch (err) {
    return next(err);
  }
});

export default router;
