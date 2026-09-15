import * as Applications from '../repos/applications.js';

/**
 * Duplicate application detection.
 *
 * Flags an application when the same applicant, Aadhaar reference or certificate
 * number already has a live application for the same academic year. Flags are
 * advisory — the officer decides.
 */
export async function detectDuplicates(application) {
  const matches = await Applications.findPotentialDuplicates({
    id: application._id,
    applicantId: typeof application.applicant === 'object' ? application.applicant?._id : application.applicant,
    schemeId: typeof application.scheme === 'object' ? application.scheme?._id : application.scheme,
    academicYear: application.academicYear,
    aadhaarMasked: application.personal?.aadhaarMasked,
    casteCertificateNumber: application.category?.casteCertificateNumber,
  });

  if (!matches.length) return { duplicateFlag: false, duplicateDetail: '' };

  return {
    duplicateFlag: true,
    duplicateDetail: `Potential duplicate of ${matches
      .map((m) => `${m.application_id} (${m.status})`)
      .join(', ')} for academic year ${application.academicYear}. Verify before proceeding.`,
  };
}
