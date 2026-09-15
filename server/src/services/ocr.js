/**
 * OCR extraction service — INTEGRATION PLACEHOLDER.
 *
 * In production this module would call a document-AI service (Tesseract / a
 * Government cloud OCR endpoint / DigiLocker issued-document APIs). Here it
 * produces a deterministic, realistic extraction derived from the stored file
 * name and the application on record, so the full verification workflow —
 * field matching, confidence scoring and mismatch highlighting — can be
 * demonstrated end to end.
 *
 * Replace `runOcr` with a real engine call; the returned shape must stay the same.
 */

/** Stable pseudo-random number in [0,1) derived from a string. */
function seededUnit(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function confidenceFor(seed, floor = 72, ceil = 99) {
  return Math.round(floor + seededUnit(seed) * (ceil - floor));
}

function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Field templates per document type. */
const TEMPLATES = {
  CASTE_CERT: (app) => [
    { key: 'studentName', label: 'Student Name', expected: app.personal?.fullName },
    { key: 'fatherName', label: "Father's Name", expected: app.personal?.fatherName },
    { key: 'tribeName', label: 'Tribe / Community', expected: app.category?.tribeName },
    { key: 'certificateNumber', label: 'Caste Certificate Number', expected: app.category?.casteCertificateNumber },
    { key: 'issuingAuthority', label: 'Issuing Authority', expected: app.category?.casteCertificateAuthority },
    { key: 'issueDate', label: 'Date of Issue', expected: fmtDate(app.category?.casteCertificateIssuedOn) },
  ],
  INCOME_CERT: (app) => [
    { key: 'studentName', label: 'Applicant Name', expected: app.personal?.fullName },
    { key: 'annualIncome', label: 'Annual Family Income (Rs.)', expected: app.category?.annualIncome },
    { key: 'certificateNumber', label: 'Income Certificate Number', expected: app.category?.incomeCertificateNumber },
    { key: 'issueDate', label: 'Date of Issue', expected: fmtDate(app.category?.incomeCertificateIssuedOn) },
  ],
  MARKSHEET: (app) => [
    { key: 'studentName', label: 'Student Name', expected: app.personal?.fullName },
    { key: 'institution', label: 'Institution / Board', expected: app.academic?.institution },
    { key: 'qualification', label: 'Qualification', expected: app.academic?.previousQualification },
    { key: 'percentage', label: 'Percentage / CGPA', expected: app.academic?.previousPercentage },
  ],
  ADMISSION_PROOF: (app) => [
    { key: 'studentName', label: 'Student Name', expected: app.personal?.fullName },
    { key: 'institution', label: 'Institution', expected: app.academic?.institution },
    { key: 'course', label: 'Course', expected: app.academic?.course },
    { key: 'admissionYear', label: 'Year of Admission', expected: app.academic?.admissionYear },
  ],
  BANK_PASSBOOK: (app) => [
    { key: 'accountHolder', label: 'Account Holder', expected: app.bank?.accountHolder },
    { key: 'accountNumber', label: 'Account Number', expected: app.bank?.accountNumberMasked },
    { key: 'ifsc', label: 'IFSC Code', expected: app.bank?.ifsc },
    { key: 'bankName', label: 'Bank Name', expected: app.bank?.bankName },
  ],
  AADHAAR: (app) => [
    { key: 'studentName', label: 'Name as per Aadhaar', expected: app.personal?.fullName },
    { key: 'aadhaarMasked', label: 'Aadhaar Number (masked)', expected: app.personal?.aadhaarMasked },
    { key: 'dob', label: 'Date of Birth', expected: fmtDate(app.personal?.dob) },
  ],
  DOMICILE: (app) => [
    { key: 'studentName', label: 'Applicant Name', expected: app.personal?.fullName },
    { key: 'state', label: 'State of Domicile', expected: app.category?.domicileState || app.personal?.state },
  ],
  PHOTO: () => [{ key: 'faceDetected', label: 'Face Detected', expected: 'Yes' }],
  DEFAULT: (app) => [
    { key: 'studentName', label: 'Student Name', expected: app.personal?.fullName },
    { key: 'institution', label: 'Institution', expected: app.academic?.institution },
  ],
};

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

/**
 * Simulates an OCR pass over an uploaded file.
 * A file whose name contains "mismatch", "expired", "blur" or "old" deliberately
 * produces a low-confidence or mismatched read, so deficiency handling can be shown.
 */
export function runOcr({ documentCode, fileName = '', application }) {
  const template = TEMPLATES[documentCode] || TEMPLATES.DEFAULT;
  const rows = template(application || {});
  const lower = fileName.toLowerCase();
  const forceMismatch = /mismatch|wrong|error/.test(lower);
  const degraded = /blur|scan|low|old|expired/.test(lower);

  const fields = rows.map((row, index) => {
    const seed = `${documentCode}:${row.key}:${fileName}:${index}`;
    const expected = row.expected === undefined || row.expected === null ? '' : String(row.expected);
    let value = expected;
    let matches = true;

    // Deterministically corrupt one field when the upload is flagged as poor quality.
    const corrupt = forceMismatch ? index === 0 : degraded && seededUnit(seed) > 0.82;
    if (corrupt && expected) {
      value = corruptValue(expected, seed);
      matches = normalise(value) === normalise(expected);
    }
    if (!expected) {
      value = 'Not legible';
      matches = false;
    }

    return {
      key: row.key,
      label: row.label,
      value,
      expectedValue: expected,
      matchesProfile: matches,
      confidence: matches ? confidenceFor(seed, degraded ? 58 : 86) : confidenceFor(seed, 41, 68),
    };
  });

  const confidence = fields.length
    ? Math.round(fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length)
    : 0;

  return {
    engine: 'MoTA-OCR v1 (simulated)',
    processedAt: new Date(),
    confidence,
    fields,
    rawText: fields.map((f) => `${f.label}: ${f.value}`).join('\n'),
  };
}

function corruptValue(expected, seed) {
  const unit = seededUnit(seed);
  if (/^\d+$/.test(expected)) {
    const n = Number(expected);
    return String(Math.max(0, Math.round(n * (1 + (unit - 0.5) * 0.4))));
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(expected)) {
    const [d, m, y] = expected.split('/');
    return `${d}/${m}/${Number(y) - 1}`;
  }
  const chars = expected.split('');
  const pos = Math.floor(unit * chars.length);
  chars[pos] = chars[pos] === 'a' ? 'e' : 'a';
  return chars.join('');
}

export function confidenceBand(score) {
  if (score >= 85) return 'High';
  if (score >= 65) return 'Medium';
  return 'Low';
}
