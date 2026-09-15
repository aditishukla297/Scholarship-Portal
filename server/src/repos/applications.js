import { one, many, query } from '../db/pool.js';
import { toScheme } from './schemes.js';

/**
 * Maps a row to the object the API has always returned. When the query joins
 * the scheme and applicant, those are nested exactly as the client expects.
 */
export function toApplication(row) {
  if (!row) return null;
  const app = {
    _id: row.id,
    applicationId: row.application_id,
    applicant: row.applicant_id,
    scheme: row.scheme_id,
    academicYear: row.academic_year,
    status: row.status,
    currentStep: row.current_step,
    personal: row.personal || {},
    category: row.category || {},
    academic: row.academic || {},
    bank: row.bank || {},
    documents: row.documents || [],
    deficiencies: row.deficiencies || [],
    timeline: row.timeline || [],
    aiFindings: row.ai_findings || {},
    disbursement: row.disbursement || undefined,
    submittedAt: row.submitted_at,
    verifiedAt: row.verified_at,
    decisionAt: row.decision_at,
    sanctionOrderNumber: row.sanction_order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.scheme_row) app.scheme = toScheme(row.scheme_row);
  if (row.applicant_row) {
    const a = row.applicant_row;
    app.applicant = {
      _id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      category: a.category,
      state: a.state,
      district: a.district,
      aadhaarMasked: a.aadhaar_masked,
    };
  }
  return app;
}

/** Joins the scheme and applicant as nested JSON so one round trip suffices. */
const SELECT_JOINED = `
  SELECT a.*,
         to_jsonb(s.*) AS scheme_row,
         to_jsonb(u.*) - 'password_hash' AS applicant_row
    FROM applications a
    JOIN schemes s ON s.id = a.scheme_id
    JOIN users   u ON u.id = a.applicant_id`;

export async function findById(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  return toApplication(await one(`${SELECT_JOINED} WHERE a.id = $1`, [id]));
}

/** Role-scoped, filtered list used by the applicant and officer queues. */
export async function list({
  applicantId, status, state, level, scheme, year, q, deficient,
  sort = 'recent', page = 1, limit = 20,
} = {}) {
  const where = [];
  const values = [];
  const add = (clause, value) => {
    values.push(value);
    where.push(clause.replace('$?', `$${values.length}`));
  };

  if (applicantId) add('a.applicant_id = $?', applicantId);
  if (status && status !== 'all') add('a.status = $?', status);
  if (state && state !== 'all') add('a.state = $?', state);
  if (level && level !== 'all') add('a.education_level = $?', level);
  if (scheme && scheme !== 'all') add('a.scheme_id = $?', scheme);
  if (year) add('a.academic_year = $?', year);
  if (q) {
    values.push(`%${q}%`);
    where.push(`(a.application_id ILIKE $${values.length} OR a.personal ->> 'fullName' ILIKE $${values.length})`);
  }
  if (deficient === 'true' || deficient === true) {
    where.push(`EXISTS (SELECT 1 FROM jsonb_array_elements(a.deficiencies) d WHERE (d ->> 'resolved')::boolean IS NOT TRUE)`);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = sort === 'merit' ? 'a.merit_score DESC NULLS LAST' : 'a.updated_at DESC';

  const offset = (Math.max(1, page) - 1) * limit;
  const rows = await many(
    `${SELECT_JOINED} ${clause} ORDER BY ${orderBy} LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    values
  );
  const total = await one(`SELECT COUNT(*)::int AS n FROM applications a ${clause}`, values);

  return { applications: rows.map(toApplication), total: total.n };
}

/** Dashboard counters. */
export async function summary({ applicantId } = {}) {
  const values = [];
  let clause = '';
  if (applicantId) {
    values.push(applicantId);
    clause = 'WHERE applicant_id = $1';
  }
  const rows = await many(`SELECT status, COUNT(*)::int AS count FROM applications ${clause} GROUP BY status`, values);
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));

  const deficientClause = clause
    ? `${clause} AND EXISTS (SELECT 1 FROM jsonb_array_elements(deficiencies) d WHERE (d ->> 'resolved')::boolean IS NOT TRUE)`
    : `WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(deficiencies) d WHERE (d ->> 'resolved')::boolean IS NOT TRUE)`;
  const deficient = await one(`SELECT COUNT(*)::int AS n FROM applications ${deficientClause}`, values);

  return {
    byStatus,
    total: rows.reduce((sum, r) => sum + r.count, 0),
    active: (byStatus.Submitted || 0) + (byStatus['Under Verification'] || 0) + (byStatus['Deficiency Raised'] || 0),
    pendingVerification: (byStatus.Submitted || 0) + (byStatus['Under Verification'] || 0),
    deficiencies: deficient.n,
    approved: (byStatus.Selected || 0) + (byStatus.Sanctioned || 0) + (byStatus.Disbursed || 0),
  };
}

export async function findLiveForApplicantAndScheme(applicantId, schemeId, academicYear) {
  return toApplication(
    await one(
      `SELECT * FROM applications
        WHERE applicant_id = $1 AND scheme_id = $2 AND academic_year = $3 AND status <> 'Rejected'
        LIMIT 1`,
      [applicantId, schemeId, academicYear]
    )
  );
}

export async function nextSerial() {
  const row = await one('SELECT COUNT(*)::int AS n FROM applications');
  return row.n + 1;
}

export async function create(data) {
  const row = await one(
    `INSERT INTO applications (application_id, applicant_id, scheme_id, academic_year, status, current_step,
                               personal, category, academic, bank, documents, deficiencies, timeline, ai_findings)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb)
     RETURNING *`,
    [
      data.applicationId, data.applicantId, data.schemeId, data.academicYear || '2026-27',
      data.status || 'Draft', data.currentStep || 1,
      JSON.stringify(data.personal || {}), JSON.stringify(data.category || {}),
      JSON.stringify(data.academic || {}), JSON.stringify(data.bank || {}),
      JSON.stringify(data.documents || []), JSON.stringify(data.deficiencies || []),
      JSON.stringify(data.timeline || []), JSON.stringify(data.aiFindings || {}),
    ]
  );
  return toApplication(row);
}

const JSON_COLUMNS = {
  personal: 'personal', category: 'category', academic: 'academic', bank: 'bank',
  documents: 'documents', deficiencies: 'deficiencies', timeline: 'timeline',
  aiFindings: 'ai_findings', disbursement: 'disbursement',
};
const PLAIN_COLUMNS = {
  status: 'status', currentStep: 'current_step', academicYear: 'academic_year',
  schemeId: 'scheme_id', submittedAt: 'submitted_at', verifiedAt: 'verified_at',
  decisionAt: 'decision_at', sanctionOrderNumber: 'sanction_order_number',
};

/** Persists whichever sections the caller changed. */
export async function update(id, patch = {}) {
  const sets = [];
  const values = [];
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) return;
    if (JSON_COLUMNS[key]) {
      values.push(JSON.stringify(value ?? null));
      sets.push(`${JSON_COLUMNS[key]} = $${values.length}::jsonb`);
    } else if (PLAIN_COLUMNS[key]) {
      values.push(value);
      sets.push(`${PLAIN_COLUMNS[key]} = $${values.length}`);
    }
  });
  if (!sets.length) return findById(id);
  values.push(id);
  await query(`UPDATE applications SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
  return findById(id);
}

export async function remove(id) {
  await query('DELETE FROM applications WHERE id = $1', [id]);
}

/** Duplicate detection: a live application sharing an identity marker. */
export async function findPotentialDuplicates({ id, applicantId, schemeId, academicYear, aadhaarMasked, casteCertificateNumber }) {
  const LIVE = ['Submitted', 'Under Verification', 'Deficiency Raised', 'Verified', 'Selected', 'Sanctioned', 'Disbursed'];
  const values = [id || '00000000-0000-0000-0000-000000000000', academicYear, LIVE];
  const or = [];

  if (applicantId && schemeId) {
    values.push(applicantId, schemeId);
    or.push(`(applicant_id = $${values.length - 1} AND scheme_id = $${values.length})`);
  }
  if (aadhaarMasked) {
    values.push(aadhaarMasked);
    or.push(`personal ->> 'aadhaarMasked' = $${values.length}`);
  }
  if (casteCertificateNumber) {
    values.push(casteCertificateNumber);
    or.push(`category ->> 'casteCertificateNumber' = $${values.length}`);
  }
  if (!or.length) return [];

  return many(
    `SELECT application_id, status FROM applications
      WHERE id <> $1 AND academic_year = $2 AND status = ANY($3) AND (${or.join(' OR ')})
      LIMIT 5`,
    values
  );
}

/** Officer work-queue counters. */
export async function queueCounts() {
  const rows = await many('SELECT status, COUNT(*)::int AS n FROM applications GROUP BY status');
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n]));
  return {
    pending: (by.Submitted || 0) + (by['Under Verification'] || 0),
    verified: by.Verified || 0,
    deficient: by['Deficiency Raised'] || 0,
    selected: (by.Selected || 0) + (by.Sanctioned || 0) + (by.Disbursed || 0),
    rejected: by.Rejected || 0,
  };
}

/** Merit-ranked candidates for the selection dashboard. */
export async function selectionList({ scheme, state } = {}) {
  const where = [`a.status = ANY($1)`];
  const values = [['Verified', 'Selected', 'Sanctioned', 'Disbursed']];
  if (scheme && scheme !== 'all') {
    values.push(scheme);
    where.push(`a.scheme_id = $${values.length}`);
  }
  if (state && state !== 'all') {
    values.push(state);
    where.push(`a.state = $${values.length}`);
  }
  const rows = await many(
    `${SELECT_JOINED} WHERE ${where.join(' AND ')} ORDER BY a.merit_score DESC NULLS LAST LIMIT 200`,
    values
  );
  return rows.map(toApplication);
}
