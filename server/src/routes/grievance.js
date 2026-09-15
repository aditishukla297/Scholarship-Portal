import { Router } from 'express';
import * as Grievances from '../repos/grievances.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/** POST /api/grievances — open to citizens, authentication optional */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Name, email, subject and description are mandatory.' });
    }
    const grievance = await Grievances.create(req.body);
    return res.status(201).json({
      grievance,
      message: `Your grievance has been registered. Ticket number ${grievance.ticketId}. You will receive a response within 15 working days.`,
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/grievances — the signed-in user's own tickets */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const grievances = await Grievances.list(
      req.user.role === 'applicant' ? { email: req.user.email } : {}
    );
    return res.json({ count: grievances.length, grievances });
  } catch (err) {
    return next(err);
  }
});

export default router;
