/** Static reference lists used across forms and filters. */

export const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh',
  'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export const EDUCATION_LEVELS = ['Class 9-10', 'Class 11-12', 'UG', 'PG', 'M.Phil', 'Ph.D'];

export const SOCIAL_CATEGORIES = ['ST', 'SC', 'OBC', 'General'];

export const INSTITUTION_TYPES = ['Government', 'Private', 'Deemed', 'Foreign'];

export const APPLICATION_STATUSES = [
  'Draft', 'Submitted', 'Under Verification', 'Deficiency Raised',
  'Verified', 'Selected', 'Rejected', 'Sanctioned', 'Disbursed',
];

export const GENDERS = ['Male', 'Female', 'Transgender'];

export const FAQS = [
  {
    q: 'Who is eligible to apply on this portal?',
    a: 'Students belonging to a Scheduled Tribe as notified under Article 342 of the Constitution, holding a valid Scheduled Tribe certificate issued by a competent revenue authority, may apply. Scheme-specific conditions relating to income, course and institution apply additionally and are listed against each scheme.',
  },
  {
    q: 'Is a fresh application required every academic year?',
    a: 'Yes. Both fresh and renewal applications must be submitted for each academic year within the notified window. Renewal applicants must additionally upload the previous year’s mark sheet and a continuation certificate from the institution.',
  },
  {
    q: 'What is the maximum size and format permitted for documents?',
    a: 'Each document must be uploaded in PDF, JPG or PNG format and must not exceed 5 MB. Scans should be taken at 200 DPI or higher so that the automated extraction can read the certificate particulars correctly.',
  },
  {
    q: 'My application shows a deficiency. What should I do?',
    a: 'Open the application from your dashboard. Each deficiency states the document concerned and the action required. Upload a corrected document using the Re-upload action within 15 days of the deficiency being raised, failing which the application may be treated as closed.',
  },
  {
    q: 'How is the scholarship amount paid?',
    a: 'All payments are released through Direct Benefit Transfer into the Aadhaar-seeded bank account of the student through the Public Financial Management System (PFMS). No amount is paid in cash or to a third party account.',
  },
  {
    q: 'Does the system approve or reject applications automatically?',
    a: 'No. The automated checks assist the verifying officer by extracting document particulars, screening against the scheme rules and flagging discrepancies. Every approval, rejection and selection decision is taken by an authorised officer of the Ministry.',
  },
  {
    q: 'Is my Aadhaar number stored on the portal?',
    a: 'No. The portal stores only the masked form of the Aadhaar number, in which the first eight digits are replaced with X. The full number is neither stored nor displayed at any stage.',
  },
  {
    q: 'Whom do I contact if the amount is not credited after sanction?',
    a: 'Raise a grievance under the category Payment / DBT from the Helpdesk, quoting your application number and the sanction order number. Payment-related grievances are resolved in coordination with PFMS within 15 working days.',
  },
];

export const ANNOUNCEMENTS = [
  { date: '12/09/2026', text: 'Last date for submission of applications under the National Fellowship for ST Students (NFST) for the academic year 2026-27 extended to 31 October 2026.', tag: 'New' },
  { date: '05/09/2026', text: 'Revised guidelines for the National Overseas Scholarship, 2026-27 published. Applicants are advised to read the guidelines before applying.', tag: 'Important' },
  { date: '28/08/2026', text: 'Sanction orders for the second instalment under the Top Class Education Scheme have been issued. Beneficiaries may view the status under Track Application.', tag: '' },
  { date: '19/08/2026', text: 'Aadhaar seeding of bank accounts is mandatory for release of scholarship amounts through DBT. Students are advised to complete NPCI mapping at their bank branch.', tag: '' },
  { date: '02/08/2026', text: 'Helpdesk timings revised. The national helpline 1800-11-8004 is now available from 09:00 to 18:00 hrs on all working days.', tag: '' },
];
