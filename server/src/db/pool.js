import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool, types } = pg;

// Return BIGINT and NUMERIC as JavaScript numbers. Every numeric column here
// (amounts, scores, counts) is far inside the safe integer range.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

/**
 * A single pool is cached on globalThis: on a serverless platform the module is
 * re-evaluated on cold start but the process is reused between invocations, so
 * without this each request would open its own pool.
 */
const cache = globalThis.__motaPg ?? (globalThis.__motaPg = { pool: null });

export function getPool() {
  if (cache.pool) return cache.pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.');
  }

  cache.pool = new Pool({
    connectionString,
    // Hosted Postgres (Neon, Supabase, Railway) terminates TLS with its own CA.
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  cache.pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return cache.pool;
}

/** Runs a parameterised query. */
export async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result;
}

/** Convenience: first row, or null. */
export async function one(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0] ?? null;
}

/** Convenience: all rows. */
export async function many(text, params = []) {
  const { rows } = await query(text, params);
  return rows;
}

/** Runs the callback inside a transaction. */
export async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Applies schema.sql. Safe to run repeatedly — every statement is idempotent. */
export async function migrate() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const sql = fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8');
  await query(sql);
  console.log('[db] schema applied');
}

/** Verifies connectivity at start-up so failures surface immediately. */
export async function connectDB() {
  const { rows } = await query('SELECT current_database() AS db, version() AS version');
  console.log(`[db] connected: ${rows[0].db}`);
  return rows[0];
}

export async function closePool() {
  if (cache.pool) {
    await cache.pool.end();
    cache.pool = null;
  }
}
