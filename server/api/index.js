/**
 * Vercel serverless entry point.
 *
 * Vercel invokes this handler per request. The Express app is imported once per
 * cold start and the MongoDB connection is cached across invocations, so a warm
 * instance reuses both.
 */
import app from '../src/index.js';
import { connectDB } from '../src/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[api] database connection failed:', err.message);
    return res.status(503).json({
      message: 'The service is temporarily unable to reach its database. Please try again shortly.',
    });
  }
  return app(req, res);
}
