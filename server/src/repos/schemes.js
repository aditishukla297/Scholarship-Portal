import { one, many } from '../db/pool.js';

export function toScheme(row) {
  if (!row) return null;
  return {
    _id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    ministry: row.ministry,
    type: row.type,
    description: row.description,
    benefits: row.benefits || [],
    educationLevels: row.education_levels || [],
    slotsPerYear: row.slots_per_year,
    amountPerAnnum: row.amount_per_annum,
    applicationStart: row.application_start,
    applicationEnd: row.application_end,
    eligibilityRules: row.eligibility_rules || [],
    requiredDocuments: row.required_documents || [],
    guidelinesUrl: row.guidelines_url,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function list({ activeOnly = true, level, type } = {}) {
  const where = [];
  const values = [];
  if (activeOnly) where.push('active = TRUE');
  if (level) {
    values.push(JSON.stringify([level]));
    where.push(`education_levels @> $${values.length}::jsonb`);
  }
  if (type) {
    values.push(type);
    where.push(`type = $${values.length}`);
  }
  const rows = await many(
    `SELECT * FROM schemes ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name ASC`,
    values
  );
  return rows.map(toScheme);
}

export async function findById(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  return toScheme(await one('SELECT * FROM schemes WHERE id = $1', [id]));
}

export async function findByIdOrCode(idOrCode) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(String(idOrCode));
  const row = isUuid
    ? await one('SELECT * FROM schemes WHERE id = $1', [idOrCode])
    : await one('SELECT * FROM schemes WHERE code = $1', [String(idOrCode).toUpperCase()]);
  return toScheme(row);
}

export async function create(data) {
  const row = await one(
    `INSERT INTO schemes (code, name, short_name, ministry, type, description, benefits, education_levels,
                          slots_per_year, amount_per_annum, application_start, application_end,
                          eligibility_rules, required_documents, guidelines_url, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16)
     RETURNING *`,
    [
      String(data.code).toUpperCase(), data.name, data.shortName || '',
      data.ministry || 'Ministry of Tribal Affairs', data.type || 'Scholarship', data.description || '',
      JSON.stringify(data.benefits || []), JSON.stringify(data.educationLevels || []),
      Number(data.slotsPerYear || 0), Number(data.amountPerAnnum || 0),
      data.applicationStart || null, data.applicationEnd || null,
      JSON.stringify(data.eligibilityRules || []), JSON.stringify(data.requiredDocuments || []),
      data.guidelinesUrl || '', data.active !== false,
    ]
  );
  return toScheme(row);
}

const COLUMNS = {
  code: ['code', (v) => String(v).toUpperCase()],
  name: ['name', (v) => v],
  shortName: ['short_name', (v) => v],
  type: ['type', (v) => v],
  description: ['description', (v) => v],
  benefits: ['benefits', (v) => JSON.stringify(v)],
  educationLevels: ['education_levels', (v) => JSON.stringify(v)],
  slotsPerYear: ['slots_per_year', (v) => Number(v || 0)],
  amountPerAnnum: ['amount_per_annum', (v) => Number(v || 0)],
  applicationStart: ['application_start', (v) => v || null],
  applicationEnd: ['application_end', (v) => v || null],
  eligibilityRules: ['eligibility_rules', (v) => JSON.stringify(v)],
  requiredDocuments: ['required_documents', (v) => JSON.stringify(v)],
  guidelinesUrl: ['guidelines_url', (v) => v],
  active: ['active', (v) => Boolean(v)],
};

export async function update(id, patch = {}) {
  const sets = [];
  const values = [];
  Object.entries(patch).forEach(([key, value]) => {
    const mapping = COLUMNS[key];
    if (!mapping || value === undefined) return;
    const [column, cast] = mapping;
    values.push(cast(value));
    const isJson = ['benefits', 'education_levels', 'eligibility_rules', 'required_documents'].includes(column);
    sets.push(`${column} = $${values.length}${isJson ? '::jsonb' : ''}`);
  });
  if (!sets.length) return findById(id);
  values.push(id);
  return toScheme(await one(`UPDATE schemes SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values));
}

export async function count() {
  const row = await one('SELECT COUNT(*)::int AS n FROM schemes');
  return row.n;
}
