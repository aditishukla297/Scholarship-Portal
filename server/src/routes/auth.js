import { Router } from 'express';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

/** POST /api/auth/register */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, aadhaar, category, gender, state, district, role } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, mobile number and password are mandatory.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
    if (!/^[6-9]\d{9}$/.test(String(phone))) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account already exists with this email address.' });

    // Officer and administrator accounts are provisioned by the Ministry, never self-registered.
    const safeRole = role === 'applicant' ? 'applicant' : 'applicant';

    const user = new User({
      name,
      email,
      phone,
      category: category || 'ST',
      gender: gender || 'NA',
      state: state || '',
      district: district || '',
      role: safeRole,
      aadhaarMasked: User.maskAadhaar(aadhaar),
    });
    await user.setPassword(password);
    await user.save();

    return res.status(201).json({ token: signToken(user), user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
    if (!user.active) return res.status(403).json({ message: 'This account has been deactivated.' });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials.' });

    user.lastLoginAt = new Date();
    await user.save();

    return res.json({ token: signToken(user), user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toJSON() }));

/** PUT /api/auth/me */
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'state', 'district', 'gender', 'category'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) req.user[key] = req.body[key];
    });
    if (req.body.aadhaar) req.user.aadhaarMasked = User.maskAadhaar(req.body.aadhaar);
    await req.user.save();
    return res.json({ user: req.user.toJSON() });
  } catch (err) {
    return next(err);
  }
});

export default router;
