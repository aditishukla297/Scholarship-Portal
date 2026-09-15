import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB, migrate } from './db/pool.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import schemeRoutes from './routes/schemes.js';
import applicationRoutes from './routes/applications.js';
import verificationRoutes, { ocrRouter } from './routes/verification.js';
import analyticsRoutes from './routes/analytics.js';
import eligibilityRoutes from './routes/eligibility.js';
import userRoutes from './routes/users.js';
import grievanceRoutes from './routes/grievance.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) =>
  res.json({
    status: 'UP',
    service: 'AI-Enabled Scholarship and Fellowship Management System',
    note: 'Smart India Hackathon prototype — not a Government of India service',
    time: new Date().toISOString(),
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/verify', verificationRoutes);
// The same OCR handler is also exposed at the documented top-level path.
app.use('/api/ocr', ocrRouter);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/grievances', grievanceRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5175;

/**
 * On Vercel the platform owns the listener, so the app is exported and the
 * connection is established lazily per request instead (see api/index.js).
 */
if (!process.env.VERCEL) {
  connectDB()
    .then(async () => {
    // In-memory demo mode starts with an empty database — seed it automatically
    // so the portal is immediately usable without a MongoDB installation.
        await migrate();
      app.listen(PORT, () => {
        console.log(`[server] Scholarship portal API listening on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[server] failed to start:', err.message);
      console.error('[server] Check DATABASE_URL in server/.env — it must point at a reachable PostgreSQL database.');
      process.exit(1);
    });
}

export default app;
