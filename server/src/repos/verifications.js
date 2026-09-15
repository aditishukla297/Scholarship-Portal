import { one, many } from '../db/pool.js';

export function toVerification(row) {
  if (!row) return null;
  const v = {
    _id: row.id,
    application: row.application_id,
    officer: row.officer_id,
    action: row.action,
    remarks: row.remarks,
    confidence: row.confidence,
    aiRecommendation: row.ai_recommendation,
    overrodeAi: row.overrode_ai,
    documentsChecked: row.documents_checked || [],
    timestamp: row.acted_at,
    createdAt: row.created_at,
  };
  if (row.officer_row) {
    v.officer = { _id: row.officer_row.id, name: row.officer_row.name, designation: row.officer_row.designation };
  }
  return v;
}

export async function create(data) {
  const row = await one(
    `INSERT INTO verifications (application_id, officer_id, action, remarks, confidence,
                                ai_recommendation, overrode_ai, documents_checked)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING *`,
    [
      data.applicationId, data.officerId, data.action, data.remarks || '',
      Number(data.confidence || 0), data.aiRecommendation || '', Boolean(data.overrodeAi),
      JSON.stringify(data.documentsChecked || []),
    ]
  );
  return toVerification(row);
}

export async function historyFor(applicationId) {
  const rows = await many(
    `SELECT v.*, to_jsonb(u.*) - 'password_hash' AS officer_row
       FROM verifications v JOIN users u ON u.id = v.officer_id
      WHERE v.application_id = $1
      ORDER BY v.acted_at DESC`,
    [applicationId]
  );
  return rows.map(toVerification);
}

/** Per-officer workload, with the count of decisions that overrode the system. */
export async function officerLoad(limit = 10) {
  return many(
    `SELECT u.name, u.designation,
            COUNT(*)::int AS actions,
            COUNT(*) FILTER (WHERE v.overrode_ai)::int AS overrides
       FROM verifications v JOIN users u ON u.id = v.officer_id
      GROUP BY u.name, u.designation
      ORDER BY actions DESC
      LIMIT $1`,
    [limit]
  );
}

export async function createMany(records) {
  if (!records.length) return 0;
  for (const r of records) {
    // eslint-disable-next-line no-await-in-loop
    await one(
      `INSERT INTO verifications (application_id, officer_id, action, remarks, confidence,
                                  ai_recommendation, overrode_ai, documents_checked, acted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING id`,
      [
        r.applicationId, r.officerId, r.action, r.remarks || '', Number(r.confidence || 0),
        r.aiRecommendation || '', Boolean(r.overrodeAi), JSON.stringify(r.documentsChecked || []),
        r.timestamp || new Date(),
      ]
    );
  }
  return records.length;
}
