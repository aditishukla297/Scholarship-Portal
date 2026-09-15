import bcrypt from 'bcryptjs';
import { one, many, query } from '../db/pool.js';

/** Maps a row to the shape the API has always returned. Never exposes the hash. */
export function toUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    aadhaarMasked: row.aadhaar_masked,
    category: row.category,
    role: row.role,
    gender: row.gender,
    state: row.state,
    district: row.district,
    designation: row.designation,
    active: row.active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Masks an Aadhaar number to the DBT-standard XXXX XXXX 1234 form. */
export function maskAadhaar(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 12) return '';
  return `XXXX XXXX ${digits.slice(-4)}`;
}

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export async function findById(id) {
  return toUser(await one('SELECT * FROM users WHERE id = $1', [id]));
}

/** Includes the password hash — used only by the login route. */
export async function findByEmailWithHash(email) {
  return one('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
}

export async function findByEmail(email) {
  return toUser(await findByEmailWithHash(email));
}

export async function create({
  name, email, phone, password, aadhaar = '', category = 'NA',
  role = 'applicant', gender = 'NA', state = '', district = '', designation = '',
}) {
  const row = await one(
    `INSERT INTO users (name, email, phone, password_hash, aadhaar_masked, category, role, gender, state, district, designation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      name, String(email).toLowerCase(), phone, await hashPassword(password),
      maskAadhaar(aadhaar), category, role, gender, state, district, designation,
    ]
  );
  return toUser(row);
}

const UPDATABLE = {
  name: 'name', phone: 'phone', state: 'state', district: 'district',
  gender: 'gender', category: 'category', role: 'role',
  designation: 'designation', active: 'active', aadhaarMasked: 'aadhaar_masked',
};

export async function update(id, patch = {}) {
  const sets = [];
  const values = [];
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'password') return; // handled separately
    const column = UPDATABLE[key];
    if (!column) return;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  });
  if (patch.password) {
    values.push(await hashPassword(patch.password));
    sets.push(`password_hash = $${values.length}`);
  }
  if (!sets.length) return findById(id);

  values.push(id);
  return toUser(await one(`UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values));
}

export async function touchLogin(id) {
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
}

export async function list({ role = 'all', q = '', limit = 200 } = {}) {
  const where = [];
  const values = [];
  if (role && role !== 'all') {
    values.push(role);
    where.push(`role = $${values.length}`);
  }
  if (q) {
    values.push(`%${q}%`);
    where.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length})`);
  }
  values.push(limit);
  const rows = await many(
    `SELECT * FROM users ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC LIMIT $${values.length}`,
    values
  );
  return rows.map(toUser);
}
