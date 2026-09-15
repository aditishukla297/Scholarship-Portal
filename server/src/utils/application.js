import * as Applications from '../repos/applications.js';

/** MoTA/NFST/2026/000123 */
export async function generateApplicationId(schemeCode, year = new Date().getFullYear()) {
  const serial = await Applications.nextSerial();
  return `MoTA/${schemeCode}/${year}/${String(serial).padStart(6, '0')}`;
}

export const TRACKING_STAGES = [
  'Application Submitted',
  'Documents Verified',
  'Eligibility Approved',
  'Selection',
  'Sanction',
  'DBT Payment',
];

/** Maps the stored status to the six-stage public tracking timeline. */
export function buildTrackingTimeline(application) {
  const reached = {
    Draft: -1,
    Submitted: 0,
    'Under Verification': 0,
    'Deficiency Raised': 0,
    Verified: 1,
    Selected: 3,
    Rejected: -2,
    Sanctioned: 4,
    Disbursed: 5,
  }[application.status] ?? -1;

  const events = application.timeline || [];
  return TRACKING_STAGES.map((stage, index) => {
    const event = events.find((e) => e.stage === stage);
    let status = 'pending';
    if (application.status === 'Rejected' && index > 0) status = index === 1 ? 'rejected' : 'pending';
    else if (index < reached) status = 'completed';
    else if (index === reached) status = 'current';
    if (index === 0 && reached >= 0) status = reached === 0 ? 'current' : 'completed';
    return {
      stage,
      status,
      at: event?.at || null,
      remark: event?.remark || '',
      actor: event?.actor || '',
    };
  });
}

/** Appends an event to the application's movement history (mutates in place). */
export function pushTimeline(application, stage, remark, actor = 'System', status = 'completed') {
  application.timeline = application.timeline || [];
  application.timeline.push({ stage, remark, actor, status, at: new Date().toISOString() });
}
