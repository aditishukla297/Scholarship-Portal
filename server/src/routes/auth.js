import { Router } from 'express';
import * as Users from '../repos/users.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

/** POST /api/auth/register */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, aadhaar, category, gender, state, district } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, mobile number and password are mandatory.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
    if (!/^[6-9]\d{9}$/.test(String(phone))) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' });
    }
    if (await Users.findByEmail(email)) {
      return res.status(409).json({ message: 'An account already exists with this email address.' });
    }

    // Officer and administrator accounts are provisioned by the Ministry, never self-registered.
    const user = await Users.create({
      name,
      email,
      phone,
      password,
      aadhaar,
      category: category || 'ST',
      gender: gender || 'NA',
      state: state || '',
      district: district || '',
      role: 'applicant',
    });

    return res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const row = await Users.findByEmailWithHash(email);
    if (!row) return res.status(401).json({ message: 'Invalid credentials.' });
    if (!row.active) return res.status(403).json({ message: 'This account has been deactivated.' });

    const ok = await Users.verifyPassword(password, row.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials.' });

    await Users.touchLogin(row.id);
    const user = Users.toUser(row);
    return res.json({ token: signToken(user), user });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

/** PUT /api/auth/me */
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const patch = {};
    ['name', 'phone', 'state', 'district', 'gender', 'category'].forEach((key) => {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    });
    if (req.body.aadhaar) patch.aadhaarMasked = Users.maskAadhaar(req.body.aadhaar);

    const user = await Users.update(req.user._id, patch);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

export default router;
