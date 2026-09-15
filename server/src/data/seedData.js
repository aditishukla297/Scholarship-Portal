/** Reference data used by the seeder. */

export const STATES = [
  'Andhra Pradesh', 'Assam', 'Chhattisgarh', 'Gujarat', 'Jharkhand', 'Karnataka',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Rajasthan', 'Sikkim', 'Telangana', 'Tripura', 'West Bengal',
];

const DOC = {
  CASTE: { code: 'CASTE_CERT', name: 'Scheduled Tribe Certificate', mandatory: true, validityMonths: 0, guideline: 'Issued by a competent revenue authority not below the rank of Tahsildar, in the format prescribed under the Constitution (Scheduled Tribes) Order, 1950.' },
  INCOME: { code: 'INCOME_CERT', name: 'Income Certificate', mandatory: true, validityMonths: 12, guideline: 'Income certificate of the parents/guardian issued within the last 12 months by the competent revenue authority.' },
  MARKS: { code: 'MARKSHEET', name: 'Last Qualifying Examination Marksheet', mandatory: true, validityMonths: 0, guideline: 'Consolidated marksheet of the last qualifying examination, attested where required.' },
  ADMISSION: { code: 'ADMISSION_PROOF', name: 'Proof of Admission / Bonafide Certificate', mandatory: true, validityMonths: 12, guideline: 'Bonafide certificate issued on the institution letterhead for the current academic session.' },
  BANK: { code: 'BANK_PASSBOOK', name: 'Bank Passbook (first page)', mandatory: true, validityMonths: 0, guideline: 'First page of the Aadhaar-seeded bank passbook showing account number, IFSC and account holder name.' },
  AADHAAR: { code: 'AADHAAR', name: 'Aadhaar Card', mandatory: true, validityMonths: 0, guideline: 'Masked Aadhaar is accepted. The portal stores only the last four digits.' },
  DOMICILE: { code: 'DOMICILE', name: 'Domicile Certificate', mandatory: false, validityMonths: 0, guideline: 'Required where the state of study differs from the state of domicile.' },
  PHOTO: { code: 'PHOTO', name: 'Passport Size Photograph', mandatory: true, validityMonths: 0, guideline: 'Recent colour photograph, white background, JPG or PNG, under 200 KB.' },
  RESEARCH: { code: 'RESEARCH_PROPOSAL', name: 'Research Proposal / Synopsis', mandatory: true, validityMonths: 0, guideline: 'Synopsis approved by the research supervisor, not exceeding 1000 words.' },
  OFFER: { code: 'OFFER_LETTER', name: 'Unconditional Offer Letter from Foreign University', mandatory: true, validityMonths: 12, guideline: 'Unconditional offer letter from an institution featuring in the approved QS/THE ranking list.' },
  DISABILITY: { code: 'DISABILITY_CERT', name: 'Disability Certificate', mandatory: false, validityMonths: 0, guideline: 'Required only where benefit under the PwD quota is claimed.' },
};

export const SCHEMES = [
  {
    code: 'NFST',
    name: 'National Fellowship for Scheduled Tribe Students',
    shortName: 'NFST',
    type: 'Fellowship',
    description:
      'The National Fellowship for Scheduled Tribe Students provides financial assistance to Scheduled Tribe students to pursue higher education leading to M.Phil. and Ph.D. degrees in Indian universities and institutions recognised by the University Grants Commission.',
    benefits: [
      'Fellowship of Rs. 37,000 per month for JRF and Rs. 42,000 per month for SRF',
      'Contingency grant of Rs. 10,000 - Rs. 20,500 per annum based on discipline',
      'Escorts / Reader assistance of Rs. 2,000 per month for students with disability',
      'House Rent Allowance as per University norms',
    ],
    educationLevels: ['M.Phil', 'Ph.D'],
    slotsPerYear: 750,
    amountPerAnnum: 444000,
    applicationStart: new Date('2026-06-01'),
    applicationEnd: new Date('2026-10-31'),
    guidelinesUrl: 'https://tribal.nic.in',
    eligibilityRules: [
      { field: 'category', label: 'Applicant must belong to a Scheduled Tribe', operator: 'eq', value: 'ST', weight: 3, mandatory: true, remark: 'Verified against the ST certificate.' },
      { field: 'educationLevel', label: 'Enrolled in M.Phil. or Ph.D.', operator: 'in', value: ['M.Phil', 'Ph.D'], weight: 3, mandatory: true },
      { field: 'annualIncome', label: 'Annual family income must not exceed Rs. 6,00,000', operator: 'lte', value: 600000, weight: 2, mandatory: true },
      { field: 'universityRecognised', label: 'Institution must be UGC recognised', operator: 'eq', value: true, weight: 2, mandatory: true },
      { field: 'previousPercentage', label: 'Minimum 55% in the qualifying post-graduate examination', operator: 'gte', value: 55, weight: 2, mandatory: true },
      { field: 'age', label: 'Age preferably below 40 years', operator: 'lte', value: 40, weight: 1, mandatory: false },
    ],
    requiredDocuments: [DOC.CASTE, DOC.INCOME, DOC.MARKS, DOC.ADMISSION, DOC.RESEARCH, DOC.BANK, DOC.AADHAAR, DOC.PHOTO, DOC.DISABILITY],
  },
  {
    code: 'NOS',
    name: 'National Overseas Scholarship for Scheduled Tribe Students',
    shortName: 'NOS',
    type: 'Overseas Scholarship',
    description:
      'The National Overseas Scholarship assists Scheduled Tribe, Particularly Vulnerable Tribal Group and landless agricultural labourer students in pursuing Master’s degree and Ph.D. programmes abroad in selected fields of study.',
    benefits: [
      'Full tuition fee as charged by the foreign institution',
      'Annual maintenance allowance of USD 15,400 (UK: GBP 9,900)',
      'Contingency and equipment allowance of USD 1,532 per annum',
      'Economy class return air passage and visa fee reimbursement',
    ],
    educationLevels: ['PG', 'Ph.D'],
    slotsPerYear: 20,
    amountPerAnnum: 1500000,
    applicationStart: new Date('2026-04-01'),
    applicationEnd: new Date('2026-09-30'),
    guidelinesUrl: 'https://overseas.tribal.gov.in',
    eligibilityRules: [
      { field: 'category', label: 'Applicant must belong to a Scheduled Tribe', operator: 'eq', value: 'ST', weight: 3, mandatory: true },
      { field: 'educationLevel', label: 'Applying for a Master’s degree or Ph.D. abroad', operator: 'in', value: ['PG', 'Ph.D'], weight: 3, mandatory: true },
      { field: 'annualIncome', label: 'Total family income must not exceed Rs. 6,00,000 per annum', operator: 'lte', value: 600000, weight: 3, mandatory: true },
      { field: 'previousPercentage', label: 'Minimum 60% in the qualifying examination', operator: 'gte', value: 60, weight: 2, mandatory: true },
      { field: 'age', label: 'Age must not exceed 35 years as on 1 July of the selection year', operator: 'lte', value: 35, weight: 2, mandatory: true },
      { field: 'institutionType', label: 'Admission to a ranked foreign institution', operator: 'eq', value: 'Foreign', weight: 1, mandatory: false, remark: 'Offer letter from a QS top-500 institution is required at the time of award.' },
    ],
    requiredDocuments: [DOC.CASTE, DOC.INCOME, DOC.MARKS, DOC.OFFER, DOC.BANK, DOC.AADHAAR, DOC.PHOTO, DOC.DOMICILE],
  },
  {
    code: 'TOPCLASS',
    name: 'Top Class Education Scheme for Scheduled Tribe Students',
    shortName: 'Top Class Education',
    type: 'Scholarship',
    description:
      'The scheme supports meritorious Scheduled Tribe students admitted to premier institutions notified by the Ministry, covering the full cost of education at the undergraduate and postgraduate level.',
    benefits: [
      'Full tuition and non-refundable fees as charged by the institution',
      'Living expenses of Rs. 86,000 per annum',
      'Books and stationery allowance of Rs. 12,000 per annum',
      'One-time computer / laptop grant of Rs. 45,000',
    ],
    educationLevels: ['UG', 'PG'],
    slotsPerYear: 1000,
    amountPerAnnum: 250000,
    applicationStart: new Date('2026-07-01'),
    applicationEnd: new Date('2026-11-30'),
    guidelinesUrl: 'https://tribal.nic.in',
    eligibilityRules: [
      { field: 'category', label: 'Applicant must belong to a Scheduled Tribe', operator: 'eq', value: 'ST', weight: 3, mandatory: true },
      { field: 'educationLevel', label: 'Enrolled in an undergraduate or postgraduate programme', operator: 'in', value: ['UG', 'PG'], weight: 3, mandatory: true },
      { field: 'annualIncome', label: 'Annual family income must not exceed Rs. 8,00,000', operator: 'lte', value: 800000, weight: 2, mandatory: true },
      { field: 'previousPercentage', label: 'Minimum 60% in the last qualifying examination', operator: 'gte', value: 60, weight: 2, mandatory: true },
      { field: 'universityRecognised', label: 'Admission in a notified institution', operator: 'eq', value: true, weight: 2, mandatory: true },
    ],
    requiredDocuments: [DOC.CASTE, DOC.INCOME, DOC.MARKS, DOC.ADMISSION, DOC.BANK, DOC.AADHAAR, DOC.PHOTO],
  },
  {
    code: 'PMS-ST',
    name: 'Post Matric Scholarship for Scheduled Tribe Students',
    shortName: 'Post Matric Scholarship',
    type: 'Scholarship',
    description:
      'The Post Matric Scholarship is the Ministry’s largest scheme, supporting Scheduled Tribe students pursuing recognised courses from Class XI onwards in government and recognised private institutions.',
    benefits: [
      'Reimbursement of compulsory non-refundable fees',
      'Monthly maintenance allowance of Rs. 1,200 - Rs. 1,500 by course group',
      'Additional allowance for students with disability',
      'Book grant for correspondence courses',
    ],
    educationLevels: ['Class 11-12', 'UG', 'PG'],
    slotsPerYear: 3000,
    amountPerAnnum: 45000,
    applicationStart: new Date('2026-05-01'),
    applicationEnd: new Date('2026-12-31'),
    guidelinesUrl: 'https://scholarships.gov.in',
    eligibilityRules: [
      { field: 'category', label: 'Applicant must belong to a Scheduled Tribe', operator: 'eq', value: 'ST', weight: 3, mandatory: true },
      { field: 'educationLevel', label: 'Studying in Class XI or above', operator: 'in', value: ['Class 11-12', 'UG', 'PG'], weight: 3, mandatory: true },
      { field: 'annualIncome', label: 'Annual family income must not exceed Rs. 2,50,000', operator: 'lte', value: 250000, weight: 3, mandatory: true },
      { field: 'universityRecognised', label: 'Institution recognised by a competent authority', operator: 'eq', value: true, weight: 1, mandatory: true },
      { field: 'previousPercentage', label: 'Should have passed the previous examination', operator: 'gte', value: 33, weight: 1, mandatory: false },
    ],
    requiredDocuments: [DOC.CASTE, DOC.INCOME, DOC.MARKS, DOC.ADMISSION, DOC.BANK, DOC.AADHAAR, DOC.PHOTO],
  },
  {
    code: 'PMS-PRE',
    name: 'Pre Matric Scholarship for Scheduled Tribe Students (Class IX - X)',
    shortName: 'Pre Matric Scholarship',
    type: 'Scholarship',
    description:
      'Financial assistance to Scheduled Tribe students studying in Classes IX and X, to reduce the drop-out rate at the secondary stage of education.',
    benefits: [
      'Scholarship of Rs. 225 per month for day scholars and Rs. 525 per month for hostellers',
      'Annual book and ad-hoc grant of Rs. 750 - Rs. 1,000',
    ],
    educationLevels: ['Class 9-10'],
    slotsPerYear: 5000,
    amountPerAnnum: 10000,
    applicationStart: new Date('2026-05-01'),
    applicationEnd: new Date('2026-12-31'),
    guidelinesUrl: 'https://scholarships.gov.in',
    eligibilityRules: [
      { field: 'category', label: 'Applicant must belong to a Scheduled Tribe', operator: 'eq', value: 'ST', weight: 3, mandatory: true },
      { field: 'educationLevel', label: 'Studying in Class IX or Class X', operator: 'eq', value: 'Class 9-10', weight: 3, mandatory: true },
      { field: 'annualIncome', label: 'Annual family income must not exceed Rs. 2,50,000', operator: 'lte', value: 250000, weight: 3, mandatory: true },
    ],
    requiredDocuments: [DOC.CASTE, DOC.INCOME, DOC.ADMISSION, DOC.BANK, DOC.AADHAAR, DOC.PHOTO],
  },
];

export const TRIBES = ['Gond', 'Bhil', 'Santhal', 'Munda', 'Oraon', 'Mina', 'Khasi', 'Naga', 'Ho', 'Kol', 'Baiga', 'Koya'];

export const INSTITUTIONS = [
  'University of Delhi',
  'Jawaharlal Nehru University, New Delhi',
  'Banaras Hindu University, Varanasi',
  'Indian Institute of Technology, Bombay',
  'Utkal University, Bhubaneswar',
  'Ranchi University, Ranchi',
  'Gauhati University, Guwahati',
  'Pt. Ravishankar Shukla University, Raipur',
  'Barkatullah University, Bhopal',
  'Savitribai Phule Pune University, Pune',
];
