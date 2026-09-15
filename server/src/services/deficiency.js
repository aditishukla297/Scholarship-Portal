/**
 * Deficiency detection.
 *
 * Runs after every document upload and on submission. Produces the deficiency
 * list the applicant sees as a red banner and the officer sees in the queue.
 */

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;

function monthsBetween(from, to = new Date()) {
  if (!from) return Infinity;
  return (to - new Date(from)) / MONTH_MS;
}

export function detectDeficiencies(application, scheme) {
  const found = [];
  const uploaded = new Map((application.documents || []).map((d) => [d.code, d]));

  // 1. Missing mandatory documents.
  (scheme?.requiredDocuments || [])
    .filter((req) => req.mandatory)
    .forEach((req) => {
      if (!uploaded.has(req.code)) {
        found.push({
          code: `MISSING_${req.code}`,
          documentCode: req.code,
          title: `${req.name} has not been uploaded`,
          detail: `${req.name} is mandatory for ${scheme.shortName || scheme.name}. Upload a clear ${(req.formats || ['pdf']).join(' / ').toUpperCase()} copy not exceeding 5 MB.`,
          severity: 'High',
          raisedBy: 'AI',
        });
      }
    });

  // 2. Expired certificates.
  const certChecks = [
    {
      code: 'INCOME_CERT',
      issuedOn: application.category?.incomeCertificateIssuedOn,
      validity: 12,
      name: 'Income Certificate',
    },
    {
      code: 'CASTE_CERT',
      issuedOn: application.category?.casteCertificateIssuedOn,
      validity: 0, // caste certificates do not expire
      name: 'Caste Certificate',
    },
  ];
  certChecks.forEach((check) => {
    if (!check.validity) return;
    if (!uploaded.has(check.code)) return;
    const age = monthsBetween(check.issuedOn);
    if (age > check.validity) {
      found.push({
        code: `EXPIRED_${check.code}`,
        documentCode: check.code,
        title: `${check.name} has expired.`,
        detail: `The ${check.name.toLowerCase()} on record was issued more than ${check.validity} months ago and is no longer valid under the scheme guidelines. Upload a certificate issued within the last ${check.validity} months.`,
        severity: 'High',
        raisedBy: 'AI',
      });
    }
  });

  // 3. OCR field mismatches against the declared profile.
  (application.documents || []).forEach((doc) => {
    const mismatched = (doc.ocr?.fields || []).filter((f) => !f.matchesProfile);
    if (mismatched.length) {
      // A field left blank in the form is reported as an undeclared particular,
      // not as a discrepancy between the document and the form.
      const undeclared = mismatched.filter((f) => !f.expectedValue);
      const conflicting = mismatched.filter((f) => f.expectedValue);

      if (conflicting.length) {
        found.push({
          code: `MISMATCH_${doc.code}`,
          documentCode: doc.code,
          title: `Details in ${doc.name} do not match the application form`,
          detail: conflicting
            .map((f) => `${f.label}: the document reads "${f.value}", the form states "${f.expectedValue}"`)
            .join('; '),
          severity: 'High',
          raisedBy: 'AI',
        });
      }
      if (undeclared.length) {
        found.push({
          code: `UNDECLARED_${doc.code}`,
          documentCode: doc.code,
          title: `Particulars appearing in ${doc.name} have not been declared in the application form`,
          detail: `The following particular(s) are blank in the form and could not be matched against the document: ${undeclared
            .map((f) => f.label)
            .join(', ')}. Complete these fields in the application form.`,
          severity: 'Medium',
          raisedBy: 'AI',
        });
      }
    }
    // 4. Low-confidence / illegible scans.
    if ((doc.ocr?.confidence ?? 100) < 65) {
      found.push({
        code: `LOW_QUALITY_${doc.code}`,
        documentCode: doc.code,
        title: `${doc.name} is not clearly readable`,
        detail: `Automated extraction confidence is ${doc.ocr?.confidence ?? 0}%. Re-upload a flat, well-lit scan at 200 DPI or higher.`,
        severity: 'Medium',
        raisedBy: 'AI',
      });
    }
  });

  // 5. Bank account not Aadhaar seeded — blocks DBT credit.
  if (application.bank?.accountNumberMasked && !application.bank?.aadhaarSeeded) {
    found.push({
      code: 'BANK_NOT_SEEDED',
      documentCode: 'BANK_PASSBOOK',
      title: 'Bank account is not Aadhaar seeded',
      detail: 'Scholarship amounts are released only through DBT to an Aadhaar-seeded account. Contact your bank branch to complete NPCI mapping.',
      severity: 'Medium',
      raisedBy: 'AI',
    });
  }

  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  return found.map((d) => ({ ...d, dueDate, raisedAt: new Date(), resolved: false }));
}

/**
 * Merges freshly detected deficiencies into the stored list, preserving the
 * resolution state and applicant remarks of deficiencies already on record.
 */
export function mergeDeficiencies(existing = [], detected = []) {
  const detectedCodes = new Set(detected.map((d) => d.code));
  const merged = [];

  detected.forEach((d) => {
    const prior = existing.find((e) => e.code === d.code);
    merged.push(prior ? { ...d, applicantRemark: prior.applicantRemark, resolved: false } : d);
  });

  // Deficiencies no longer detected are retained as resolved, for the audit trail.
  existing
    .filter((e) => !detectedCodes.has(e.code))
    .forEach((e) => {
      merged.push({
        ...(e.toObject ? e.toObject() : e),
        resolved: true,
        resolvedAt: e.resolvedAt || new Date(),
      });
    });

  return merged;
}
