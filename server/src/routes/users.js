import { Router } from 'express';
import * as Users from '../repos/users.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/** GET /api/users — administrator user management */
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await Users.list({ role: req.query.role, q: req.query.q });
    return res.json({ count: users.length, users });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/users — provision an officer or administrator account */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, phone, password, role, designation, state } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, mobile number and password are mandatory.' });
    }
    if (await Users.findByEmail(email)) {
      return res.status(409).json({ message: 'An account already exists with this email address.' });
    }
    const user = await Users.create({
      name, email, phone, password,
      role: role || 'officer', designation: designation || '', state: state || '',
    });
    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/users/:id */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const existing = await Users.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'User not found.' });
    if (String(existing._id) === String(req.user._id) && req.body.active === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }
    const user = await Users.update(req.params.id, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

export default router;
