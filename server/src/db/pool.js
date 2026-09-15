import fs from 'fs';
import path from 'path';
import dns from 'dns';
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
const cache = globalThis.__motaPg ?? (globalThis.__motaPg = { pool: null, promise: null });

/**
 * Some ISP resolvers refuse to answer for hosted-database hostnames, which
 * makes the database unreachable even though the host is perfectly valid.
 * Setting DNS_SERVERS (for example "8.8.8.8,1.1.1.1") resolves the host
 * through those resolvers and connects by address instead, keeping the
 * original hostname for TLS SNI — the same split libpq exposes as
 * host/hostaddr. Leave it unset and normal OS resolution is used.
 */
async function resolveOverride(connectionString) {
  const servers = String(process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!servers.length) return {};

  const { hostname } = new URL(connectionString);
  const resolver = new dns.promises.Resolver();
  resolver.setServers(servers);
  const [address] = await resolver.resolve4(hostname);
  if (!address) return {};

  console.log(`[db] resolved ${hostname} via ${servers.join(', ')}`);
  // servername keeps SNI correct, which hosted providers rely on for routing.
  return { host: address, servername: hostname };
}

async function buildPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.');
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  const override = isLocal ? {} : await resolveOverride(connectionString);

  const pool = new Pool({
    connectionString,
    ...(override.host ? { host: override.host } : {}),
    // Hosted Postgres (Neon, Supabase, Railway) terminates TLS with its own CA.
    ssl: isLocal
      ? false
      : { rejectUnauthorized: false, ...(override.servername ? { servername: override.servername } : {}) },
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });

  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}

export async function getPool() {
  if (cache.pool) return cache.pool;
  if (!cache.promise) {
    cache.promise = buildPool().catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  cache.pool = await cache.promise;
  return cache.pool;
}

/** Runs a parameterised query. */
export async function query(text, params = []) {
  const pool = await getPool();
  return pool.query(text, params);
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
  const pool = await getPool();
  const client = await pool.connect();
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
    cache.promise = null;
  }
}
