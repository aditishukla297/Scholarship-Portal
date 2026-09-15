import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/** GET /api/users — administrator user management */
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role && req.query.role !== 'all') filter.role = req.query.role;
    if (req.query.q) filter.$or = [{ name: new RegExp(req.query.q, 'i') }, { email: new RegExp(req.query.q, 'i') }];
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
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
    if (await User.findOne({ email: String(email).toLowerCase() })) {
      return res.status(409).json({ message: 'An account already exists with this email address.' });
    }
    const user = new User({ name, email, phone, role: role || 'officer', designation: designation || '', state: state || '' });
    await user.setPassword(password);
    await user.save();
    return res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/users/:id */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, phone, role, designation, state, active } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (String(user._id) === String(req.user._id) && active === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }
    Object.assign(user, {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(role !== undefined && { role }),
      ...(designation !== undefined && { designation }),
      ...(state !== undefined && { state }),
      ...(active !== undefined && { active }),
    });
    if (req.body.password) await user.setPassword(req.body.password);
    await user.save();
    return res.json({ user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
});

export default router;
