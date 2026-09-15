/**
 * AI Eligibility Rule Engine.
 *
 * Evaluates a normalised applicant profile against a scheme's declared
 * eligibility rules and returns a per-rule verdict plus a weighted match score.
 * The engine is advisory: the final decision always rests with a Ministry officer.
 */

const OPERATOR_LABELS = {
  eq: 'must equal',
  neq: 'must not equal',
  in: 'must be one of',
  nin: 'must not be one of',
  lte: 'must be at most',
  gte: 'must be at least',
  lt: 'must be below',
  gt: 'must be above',
  between: 'must be between',
  exists: 'must be provided',
};

function readField(profile, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), profile);
}

function evaluate(operator, observed, expected) {
  const num = (v) => (typeof v === 'string' ? Number(v) : v);
  switch (operator) {
    case 'eq':
      return String(observed ?? '').toLowerCase() === String(expected ?? '').toLowerCase();
    case 'neq':
      return String(observed ?? '').toLowerCase() !== String(expected ?? '').toLowerCase();
    case 'in':
      return (expected || []).map((v) => String(v).toLowerCase()).includes(String(observed ?? '').toLowerCase());
    case 'nin':
      return !(expected || []).map((v) => String(v).toLowerCase()).includes(String(observed ?? '').toLowerCase());
    case 'lte':
      return Number.isFinite(num(observed)) && num(observed) <= num(expected);
    case 'gte':
      return Number.isFinite(num(observed)) && num(observed) >= num(expected);
    case 'lt':
      return Number.isFinite(num(observed)) && num(observed) < num(expected);
    case 'gt':
      return Number.isFinite(num(observed)) && num(observed) > num(expected);
    case 'between':
      return (
        Number.isFinite(num(observed)) &&
        num(observed) >= num(expected?.[0]) &&
        num(observed) <= num(expected?.[1])
      );
    case 'exists':
      return observed !== undefined && observed !== null && String(observed).trim() !== '';
    default:
      return false;
  }
}

function describe(operator, expected) {
  const label = OPERATOR_LABELS[operator] || operator;
  if (operator === 'exists') return label;
  if (Array.isArray(expected)) return `${label} ${expected.join(', ')}`;
  return `${label} ${expected}`;
}

/**
 * @param {object} profile  Flattened applicant profile.
 * @param {object} scheme   Scheme document (lean or hydrated).
 * @returns {{eligible:boolean, score:number, rules:Array, blockers:Array, advisories:Array}}
 */
export function evaluateScheme(profile, scheme) {
  const rules = (scheme.eligibilityRules || []).map((rule) => {
    const observed = readField(profile, rule.field);
    const passed = evaluate(rule.operator, observed, rule.value);
    return {
      field: rule.field,
      label: rule.label,
      mandatory: rule.mandatory !== false,
      weight: rule.weight ?? 1,
      passed,
      expected: describe(rule.operator, rule.value),
      observed: observed === undefined || observed === '' ? 'Not provided' : String(observed),
      remark: rule.remark || '',
    };
  });

  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0) || 1;
  const earned = rules.filter((r) => r.passed).reduce((sum, r) => sum + r.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);

  const blockers = rules.filter((r) => r.mandatory && !r.passed);
  const advisories = rules.filter((r) => !r.mandatory && !r.passed);

  return {
    schemeId: scheme._id,
    code: scheme.code,
    name: scheme.name,
    shortName: scheme.shortName,
    type: scheme.type,
    amountPerAnnum: scheme.amountPerAnnum,
    eligible: blockers.length === 0,
    score,
    rules,
    blockers,
    advisories,
    requiredDocuments: scheme.requiredDocuments || [],
  };
}

/** Runs the engine across every active scheme and ranks the results. */
export function checkEligibility(profile, schemes) {
  const results = schemes.map((scheme) => evaluateScheme(profile, scheme));
  const eligible = results.filter((r) => r.eligible).sort((a, b) => b.score - a.score);
  const ineligible = results.filter((r) => !r.eligible).sort((a, b) => b.score - a.score);

  // Union of documents needed for the schemes the applicant actually qualifies for.
  const documentMap = new Map();
  eligible.forEach((r) =>
    (r.requiredDocuments || []).forEach((d) => {
      if (!documentMap.has(d.code)) documentMap.set(d.code, d);
    })
  );

  return {
    evaluatedAt: new Date(),
    engine: 'MoTA Eligibility Rule Engine v1',
    totalSchemesEvaluated: results.length,
    eligible,
    ineligible,
    requiredDocuments: [...documentMap.values()],
    advisory: 'This is an automated pre-check. Final eligibility is confirmed by the verifying officer.',
  };
}

/**
 * Merit score used to rank verified candidates on the Selection Dashboard.
 * Weighted: academic performance (50), entrance score (20), eligibility fit (15),
 * document confidence (10), affirmative-action weightage (5).
 */
export function computeMeritScore({ previousPercentage = 0, entranceScore = 0, eligibilityScore = 0, documentConfidence = 0, isPvtg = false, isDisabled = false, gender = 'NA' }) {
  const academic = (Math.min(previousPercentage, 100) / 100) * 50;
  const entrance = (Math.min(entranceScore, 100) / 100) * 20;
  const fit = (Math.min(eligibilityScore, 100) / 100) * 15;
  const docs = (Math.min(documentConfidence, 100) / 100) * 10;
  let weightage = 0;
  if (isPvtg) weightage += 2.5;
  if (isDisabled) weightage += 1.5;
  if (gender === 'Female' || gender === 'Transgender') weightage += 1;
  return Math.round((academic + entrance + fit + docs + Math.min(weightage, 5)) * 10) / 10;
}
