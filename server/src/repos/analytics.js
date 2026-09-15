import { one, many } from '../db/pool.js';

const APPROVED = ['Selected', 'Sanctioned', 'Disbursed'];

/** Builds the shared WHERE clause for the MIS filters. */
function scope({ year, scheme }) {
  const where = [];
  const values = [];
  if (year) {
    values.push(year);
    where.push(`academic_year = $${values.length}`);
  }
  if (scheme && scheme !== 'all') {
    values.push(scheme);
    where.push(`scheme_id = $${values.length}`);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', values };
}

/** Counts grouped by a column, dropping null and empty labels. */
async function groupBy(column, { clause, values }) {
  const rows = await many(
    `SELECT ${column} AS label, COUNT(*)::int AS value
       FROM applications ${clause}
      GROUP BY ${column}
      HAVING ${column} IS NOT NULL AND ${column} <> ''
      ORDER BY value DESC`,
    values
  );
  return rows;
}

export async function dashboard({ year, scheme } = {}) {
  const s = scope({ year, scheme });

  const [byState, byStatus, byLevel, byGender] = await Promise.all([
    groupBy('state', s),
    groupBy('status', s),
    groupBy('education_level', s),
    groupBy('gender', s),
  ]);

  const byScheme = await many(
    `SELECT COALESCE(NULLIF(sc.short_name, ''), sc.code) AS label,
            COUNT(*)::int AS value,
            COUNT(*) FILTER (WHERE a.status = ANY($${s.values.length + 1}))::int AS approved
       FROM applications a JOIN schemes sc ON sc.id = a.scheme_id
       ${s.clause ? s.clause.replace(/\b(academic_year|scheme_id)\b/g, 'a.$1') : ''}
      GROUP BY label
      ORDER BY value DESC`,
    [...s.values, APPROVED]
  );

  // Most frequent deficiency titles, across every application's JSONB array.
  const topDeficiencies = await many(
    `SELECT d ->> 'title' AS label, COUNT(*)::int AS value
       FROM applications a, jsonb_array_elements(a.deficiencies) d
       ${s.clause ? s.clause.replace(/\b(academic_year|scheme_id)\b/g, 'a.$1') : ''}
      GROUP BY label
      HAVING d ->> 'title' IS NOT NULL
      ORDER BY value DESC
      LIMIT 8`,
    s.values
  );

  const turnaround = await one(
    `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (verified_at - submitted_at)) / 86400)::numeric, 1) AS avg,
            ROUND(MIN(EXTRACT(EPOCH FROM (verified_at - submitted_at)) / 86400)::numeric, 1) AS min,
            ROUND(MAX(EXTRACT(EPOCH FROM (verified_at - submitted_at)) / 86400)::numeric, 1) AS max
       FROM applications
       ${s.clause ? `${s.clause} AND` : 'WHERE'} submitted_at IS NOT NULL AND verified_at IS NOT NULL`,
    s.values
  );

  const monthly = await many(
    `SELECT to_char(submitted_at, 'YYYY-MM') AS label, COUNT(*)::int AS value
       FROM applications
       ${s.clause ? `${s.clause} AND` : 'WHERE'} submitted_at IS NOT NULL
      GROUP BY label
      ORDER BY label ASC
      LIMIT 12`,
    s.values
  );

  const totalRow = await one(`SELECT COUNT(*)::int AS n FROM applications ${s.clause}`, s.values);

  const statusMap = Object.fromEntries(byStatus.map((r) => [r.label, r.value]));
  const approved = APPROVED.reduce((sum, st) => sum + (statusMap[st] || 0), 0);
  const decided = approved + (statusMap.Rejected || 0);

  return {
    generatedAt: new Date(),
    totals: {
      applications: totalRow.n,
      approved,
      rejected: statusMap.Rejected || 0,
      pending: (statusMap.Submitted || 0) + (statusMap['Under Verification'] || 0),
      deficiencies: statusMap['Deficiency Raised'] || 0,
      approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
      avgVerificationDays: Number(turnaround?.avg || 0),
      beneficiaries: statusMap.Disbursed || 0,
    },
    byState,
    byScheme,
    byStatus,
    byEducationLevel: byLevel,
    byGender: byGender.filter((g) => g.label !== 'NA'),
    topDeficiencies,
    monthlySubmissions: monthly,
    verificationTime: {
      avg: Number(turnaround?.avg || 0),
      min: Number(turnaround?.min || 0),
      max: Number(turnaround?.max || 0),
    },
  };
}

/** Flat tabular statement, also used for the CSV export. */
export async function report({ scheme, state, status } = {}) {
  const where = [];
  const values = [];
  if (scheme && scheme !== 'all') {
    values.push(scheme);
    where.push(`a.scheme_id = $${values.length}`);
  }
  if (state && state !== 'all') {
    values.push(state);
    where.push(`a.state = $${values.length}`);
  }
  if (status && status !== 'all') {
    values.push(status);
    where.push(`a.status = $${values.length}`);
  }

  return many(
    `SELECT a.application_id                        AS "applicationId",
            COALESCE(a.personal ->> 'fullName', '') AS name,
            COALESCE(a.state, '')                   AS state,
            COALESCE(a.personal ->> 'district', '') AS district,
            COALESCE(a.gender, '')                  AS gender,
            COALESCE(NULLIF(sc.short_name, ''), sc.code) AS scheme,
            COALESCE(a.education_level, '')         AS "educationLevel",
            COALESCE(a.academic ->> 'institution', '') AS institution,
            a.status                                AS status,
            COALESCE(a.merit_score, 0)              AS "meritScore",
            COALESCE(to_char(a.submitted_at, 'YYYY-MM-DD'), '') AS "submittedAt"
       FROM applications a JOIN schemes sc ON sc.id = a.scheme_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC
      LIMIT 1000`,
    values
  );
}
