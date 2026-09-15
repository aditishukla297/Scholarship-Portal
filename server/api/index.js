/**
 * Vercel serverless entry point.
 *
 * Vercel invokes this handler per request. The Express app is imported once per
 * cold start and the Postgres pool is cached across invocations, so a warm
 * instance reuses both. Connectivity is verified once per cold start rather
 * than per request.
 */
import app from '../src/index.js';
import { connectDB } from '../src/db/pool.js';

let ready = null;

export default async function handler(req, res) {
  try {
    if (!ready) {
      ready = connectDB().catch((err) => {
        ready = null; // let the next invocation retry
        throw err;
      });
    }
    await ready;
  } catch (err) {
    console.error('[api] database connection failed:', err.message);
    return res.status(503).json({
      message: 'The service is temporarily unable to reach its database. Please try again shortly.',
    });
  }
  return app(req, res);
}
