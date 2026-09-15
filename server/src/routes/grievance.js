import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';

const grievanceSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true },
    name: String,
    email: String,
    phone: String,
    applicationId: String,
    category: {
      type: String,
      enum: ['Application', 'Document', 'Payment / DBT', 'Login / Registration', 'Other'],
      default: 'Other',
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    response: String,
  },
  { timestamps: true }
);
const Grievance = mongoose.models.Grievance || mongoose.model('Grievance', grievanceSchema);

const router = Router();

/** POST /api/grievances — open to citizens, authentication optional */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, category, applicationId } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Name, email, subject and description are mandatory.' });
    }
    const count = await Grievance.countDocuments();
    const grievance = await Grievance.create({
      ticketId: `MoTA/GRV/${new Date().getFullYear()}/${String(count + 1).padStart(5, '0')}`,
      name,
      email,
      phone,
      subject,
      message,
      category,
      applicationId,
    });
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
    const filter = req.user.role === 'applicant' ? { email: req.user.email } : {};
    const grievances = await Grievance.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ count: grievances.length, grievances });
  } catch (err) {
    return next(err);
  }
});

export default router;
