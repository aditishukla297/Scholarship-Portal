import Application from '../models/Application.js';

/**
 * Duplicate application detection.
 *
 * Flags an application when the same applicant, Aadhaar reference or certificate
 * number already has a live application for the same academic year. Flags are
 * advisory — the officer decides.
 */
export async function detectDuplicates(application) {
  const liveStatuses = ['Submitted', 'Under Verification', 'Deficiency Raised', 'Verified', 'Selected', 'Sanctioned', 'Disbursed'];
  const or = [];

  if (application.applicant) or.push({ applicant: application.applicant, scheme: application.scheme });
  if (application.personal?.aadhaarMasked) or.push({ 'personal.aadhaarMasked': application.personal.aadhaarMasked });
  if (application.category?.casteCertificateNumber) {
    or.push({ 'category.casteCertificateNumber': application.category.casteCertificateNumber });
  }
  if (!or.length) return { duplicateFlag: false, duplicateDetail: '' };

  const matches = await Application.find({
    _id: { $ne: application._id },
    academicYear: application.academicYear,
    status: { $in: liveStatuses },
    $or: or,
  })
    .select('applicationId scheme status personal.fullName')
    .limit(5)
    .lean();

  if (!matches.length) return { duplicateFlag: false, duplicateDetail: '' };

  return {
    duplicateFlag: true,
    duplicateDetail: `Potential duplicate of ${matches.map((m) => `${m.applicationId} (${m.status})`).join(', ')} for academic year ${application.academicYear}. Verify before proceeding.`,
  };
}
