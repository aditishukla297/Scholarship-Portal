import { one, many } from '../db/pool.js';

export function toGrievance(row) {
  if (!row) return null;
  return {
    _id: row.id,
    ticketId: row.ticket_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    applicationId: row.application_ref,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    response: row.response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(data) {
  const countRow = await one('SELECT COUNT(*)::int AS n FROM grievances');
  const ticketId = `MoTA/GRV/${new Date().getFullYear()}/${String(countRow.n + 1).padStart(5, '0')}`;
  const row = await one(
    `INSERT INTO grievances (ticket_id, name, email, phone, application_ref, category, subject, message, raised_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      ticketId, data.name, data.email, data.phone || null, data.applicationId || null,
      data.category || 'Other', data.subject, data.message, data.raisedBy || null,
    ]
  );
  return toGrievance(row);
}

export async function list({ email } = {}) {
  const rows = email
    ? await many('SELECT * FROM grievances WHERE email = $1 ORDER BY created_at DESC LIMIT 100', [email])
    : await many('SELECT * FROM grievances ORDER BY created_at DESC LIMIT 100');
  return rows.map(toGrievance);
}
