import 'dotenv/config';
import { connectDB, migrate, query, closePool } from './db/pool.js';
import * as Users from './repos/users.js';
import * as Schemes from './repos/schemes.js';
import * as Applications from './repos/applications.js';
import * as Verifications from './repos/verifications.js';
import { SCHEMES, STATES, TRIBES, INSTITUTIONS } from './data/seedData.js';
import { runOcr } from './services/ocr.js';
import { evaluateScheme, computeMeritScore } from './services/eligibility.js';
import { detectDeficiencies } from './services/deficiency.js';
import { toProfile } from './routes/applications.js';
import { pushTimeline } from './utils/application.js';

/* Deterministic pseudo-random generator so every seed run produces the same data. */
let seedState = 42;
const rand = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.round(min + rand() * (max - min));

const FIRST_NAMES = ['Anil', 'Sunita', 'Rajesh', 'Meena', 'Birsa', 'Kalpana', 'Santosh', 'Rekha', 'Mangal', 'Phulmani', 'Jaipal', 'Sarita', 'Dhanu', 'Laxmi', 'Ramesh', 'Gita', 'Budhan', 'Sukhram', 'Champa', 'Hemant'];
const SURNAMES = ['Munda', 'Oraon', 'Gond', 'Bhil', 'Soren', 'Hembrom', 'Meena', 'Tirkey', 'Kisku', 'Marandi', 'Naik', 'Baiga', 'Kachhap', 'Toppo'];

const COURSES = {
  'Ph.D': ['Ph.D. in Sociology', 'Ph.D. in History', 'Ph.D. in Anthropology', 'Ph.D. in Chemistry', 'Ph.D. in Economics'],
  'M.Phil': ['M.Phil. in Political Science', 'M.Phil. in Tribal Studies'],
  PG: ['M.A. Sociology', 'M.Sc. Physics', 'M.Com', 'M.Tech Computer Science', 'MBA'],
  UG: ['B.A. History', 'B.Sc. Botany', 'B.Tech Civil Engineering', 'B.Com', 'MBBS'],
  'Class 11-12': ['Class XII — Science', 'Class XII — Commerce', 'Class XI — Arts'],
  'Class 9-10': ['Class X', 'Class IX'],
};

const STATUSES = [
  'Submitted', 'Submitted', 'Under Verification', 'Under Verification',
  'Deficiency Raised', 'Deficiency Raised', 'Verified', 'Verified',
  'Selected', 'Selected', 'Sanctioned', 'Disbursed', 'Rejected', 'Draft',
];

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

export async function seedDatabase({ standalone = false } = {}) {
  if (standalone) {
    await connectDB();
    await migrate();
  }

  console.log('[seed] clearing existing rows');
  // TRUNCATE ... CASCADE clears the dependent tables in one statement.
  await query('TRUNCATE verifications, document_files, applications, grievances, schemes, users RESTART IDENTITY CASCADE');

  /* ---------------------------------------------------------------- Schemes */
  const schemes = [];
  for (const s of SCHEMES) {
    // eslint-disable-next-line no-await-in-loop
    schemes.push(await Schemes.create(s));
  }
  console.log(`[seed] ${schemes.length} schemes created`);

  /* ------------------------------------------------------------------ Staff */
  const admin = await Users.create({
    name: 'Dr. R. Subramanian',
    email: 'admin@example.in',
    phone: '9810000001',
    password: 'Admin@1234',
    role: 'admin',
    designation: 'Joint Secretary (Education), MoTA',
    state: 'Delhi',
  });

  const officers = [
    await Users.create({
      name: 'Smt. Anita Verma',
      email: 'officer@example.in',
      phone: '9810000002',
      password: 'Officer@1234',
      role: 'officer',
      designation: 'Under Secretary (Scholarship Division)',
      state: 'Delhi',
    }),
    await Users.create({
      name: 'Shri K. Toppo',
      email: 'officer2@example.in',
      phone: '9810000003',
      password: 'Officer@1234',
      role: 'officer',
      designation: 'Section Officer (NFST)',
      state: 'Jharkhand',
    }),
  ];

  /* ------------------------------------------------- Demo applicant account */
  const applicants = [
    await Users.create({
      name: 'Birsa Munda',
      email: 'student@example.in',
      phone: '9876543210',
      password: 'Student@1234',
      role: 'applicant',
      category: 'ST',
      gender: 'Male',
      state: 'Jharkhand',
      district: 'Khunti',
      aadhaar: '123456789012',
    }),
  ];

  for (let i = 0; i < 59; i += 1) {
    const gender = rand() > 0.46 ? 'Female' : 'Male';
    // eslint-disable-next-line no-await-in-loop
    const u = await Users.create({
      name: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`,
      email: `applicant${i + 1}@example.in`,
      phone: `9${between(100000000, 999999999)}`,
      password: 'Student@1234',
      role: 'applicant',
      category: 'ST',
      gender,
      state: pick(STATES),
      aadhaar: `${between(100000000000, 999999999999)}`,
    });
    applicants.push(u);
  }
  console.log(`[seed] ${applicants.length + officers.length + 1} user accounts created`);

  /* ------------------------------------------------------------ Applications */
  let serial = 0;
  const created = [];

  for (const applicant of applicants) {
    const isDemo = applicant.email === 'student@example.in';
    const count = isDemo ? 2 : rand() > 0.7 ? 2 : 1;

    for (let c = 0; c < count; c += 1) {
      const scheme = isDemo && c === 0 ? schemes[0] : pick(schemes);
      const level = pick(scheme.educationLevels);
      let status = isDemo ? (c === 0 ? 'Under Verification' : 'Deficiency Raised') : pick(STATUSES);
      const submittedDaysAgo = between(5, 120);
      serial += 1;

      const percentage = between(52, 92);
      const income = pick([120000, 180000, 240000, 300000, 420000, 560000, 740000]);

      const app = {
        applicationId: `MoTA/${scheme.code}/2026/${String(serial).padStart(6, '0')}`,
        applicantId: applicant._id,
        schemeId: scheme._id,
        academicYear: '2026-27',
        status,
        currentStep: 6,
        personal: {
          fullName: applicant.name,
          fatherName: `${pick(FIRST_NAMES)} ${applicant.name.split(' ')[1] || 'Munda'}`,
          motherName: `${pick(FIRST_NAMES)} Devi`,
          dob: new Date(1996 + between(0, 8), between(0, 11), between(1, 28)).toISOString(),
          gender: applicant.gender,
          email: applicant.email,
          phone: applicant.phone,
          aadhaarMasked: applicant.aadhaarMasked,
          address: `Village ${pick(['Sarwada', 'Ulihatu', 'Barwadih', 'Kodarma', 'Bishunpur'])}, Post Office ${pick(['Khunti', 'Raidih', 'Gumla'])}`,
          state: applicant.state,
          district: applicant.district || pick(['Khunti', 'Gumla', 'Bastar', 'Mandla', 'Mayurbhanj', 'Nandurbar']),
          pincode: String(between(110001, 855117)),
          isPvtg: rand() > 0.88,
          isDisabled: rand() > 0.93,
        },
        category: {
          socialCategory: 'ST',
          tribeName: pick(TRIBES),
          casteCertificateNumber: `ST/${applicant.state.slice(0, 2).toUpperCase()}/${between(100000, 999999)}`,
          casteCertificateIssuedOn: daysAgo(between(200, 1800)).toISOString(),
          casteCertificateAuthority: `Tahsildar, ${applicant.district || 'Khunti'}`,
          domicileState: applicant.state,
          annualIncome: income,
          incomeCertificateNumber: `INC/${between(100000, 999999)}`,
          // A slice of applicants deliberately carry an expired income certificate.
          incomeCertificateIssuedOn: (rand() > 0.78 ? daysAgo(between(400, 700)) : daysAgo(between(30, 300))).toISOString(),
        },
        academic: {
          educationLevel: level,
          course: pick(COURSES[level] || ['B.A. History']),
          specialisation: pick(['Tribal Studies', 'Development Economics', 'Applied Chemistry', 'Public Administration', '']),
          institution: pick(INSTITUTIONS),
          institutionType: pick(['Government', 'Government', 'Government', 'Deemed', 'Private']),
          universityRecognised: rand() > 0.05,
          admissionYear: 2025 + between(0, 1),
          previousQualification: level === 'Ph.D' || level === 'M.Phil' ? 'Post Graduation' : 'Senior Secondary',
          previousPercentage: percentage,
          entranceExam: pick(['UGC-NET', 'CUET-PG', 'GATE', 'State Eligibility Test', '']),
          entranceScore: between(40, 95),
        },
        bank: {
          accountHolder: applicant.name,
          accountNumberMasked: `XXXXXXX${between(1000, 9999)}`,
          ifsc: `SBIN000${between(1000, 9999)}`,
          bankName: pick(['State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank']),
          branch: pick(['Khunti', 'Ranchi Main', 'Bhopal Civil Lines', 'Bhubaneswar Saheed Nagar']),
          aadhaarSeeded: rand() > 0.15,
        },
        documents: [],
        deficiencies: [],
        timeline: [],
        submittedAt: status === 'Draft' ? null : daysAgo(submittedDaysAgo),
      };

      // Documents + simulated OCR.
      const requiredDocs = scheme.requiredDocuments.filter((d) => d.mandatory);
      const docsToUpload = status !== 'Draft'
        ? requiredDocs.filter(() => rand() > 0.06) // a few applicants miss a document
        : requiredDocs.slice(0, 2);

      docsToUpload.forEach((req) => {
        const poorScan = rand() > 0.85;
        const fileName = `${req.code.toLowerCase()}${poorScan ? '-scan-blur' : ''}.pdf`;
        const ocr = runOcr({ documentCode: req.code, fileName, application: app });
        app.documents.push({
          code: req.code,
          name: req.name,
          fileName,
          storedName: '',
          mimeType: 'application/pdf',
          sizeBytes: between(80_000, 2_400_000),
          uploadedAt: daysAgo(submittedDaysAgo + 1).toISOString(),
          status: ocr.fields.some((f) => !f.matchesProfile) ? 'Deficient' : 'Uploaded',
          ocr,
        });
      });

      // AI findings.
      const evaluation = evaluateScheme(toProfile(app), scheme);

      // Keep the demonstration data internally consistent: an application that
      // fails a mandatory condition cannot have been verified or selected.
      if (!evaluation.eligible && ['Verified', 'Selected', 'Sanctioned', 'Disbursed'].includes(status)) {
        status = rand() > 0.5 ? 'Rejected' : 'Deficiency Raised';
        app.status = status;
        app.submittedAt = app.submittedAt || daysAgo(submittedDaysAgo);
      }

      app.deficiencies = detectDeficiencies(app, scheme);
      const documentConfidence = app.documents.length
        ? Math.round(app.documents.reduce((s, d) => s + (d.ocr?.confidence || 0), 0) / app.documents.length)
        : 0;
      const openHigh = app.deficiencies.filter((d) => d.severity === 'High').length;

      app.aiFindings = {
        eligibilityScore: evaluation.score,
        meritScore: computeMeritScore({
          previousPercentage: percentage,
          entranceScore: app.academic.entranceScore,
          eligibilityScore: evaluation.score,
          documentConfidence,
          isPvtg: app.personal.isPvtg,
          isDisabled: app.personal.isDisabled,
          gender: app.personal.gender,
        }),
        documentConfidence,
        overallConfidence: Math.max(0, Math.min(100, Math.round(evaluation.score * 0.45 + documentConfidence * 0.4 + (openHigh ? 0 : 15)))),
        recommendation: !evaluation.eligible
          ? 'Recommend Rejection'
          : openHigh === 0 && documentConfidence >= 85
            ? 'Recommend Approval'
            : 'Needs Manual Review',
        rulesEvaluated: evaluation.rules.map((r) => ({
          label: r.label, passed: r.passed, expected: r.expected, observed: r.observed, mandatory: r.mandatory,
        })),
        duplicateFlag: false,
        duplicateDetail: '',
        notes: ['This output is advisory. Approval or rejection rests solely with the verifying officer.'],
        generatedAt: daysAgo(submittedDaysAgo - 1).toISOString(),
      };

      // Timeline consistent with the status.
      if (status !== 'Draft') {
        pushTimeline(app, 'Application Submitted', `Submitted online. System reference ${app.applicationId}.`, app.personal.fullName);
      }
      if (['Verified', 'Selected', 'Sanctioned', 'Disbursed'].includes(status)) {
        app.verifiedAt = daysAgo(submittedDaysAgo - between(3, 20));
        pushTimeline(app, 'Documents Verified', 'Documents verified against the uploaded records.', officers[0].name);
        pushTimeline(app, 'Eligibility Approved', 'Eligibility conditions confirmed by the verifying officer.', officers[0].name);
      }
      if (['Selected', 'Sanctioned', 'Disbursed'].includes(status)) {
        app.decisionAt = daysAgo(between(2, 25));
        pushTimeline(app, 'Selection', 'Selected for award by the Selection Committee.', admin.name);
      }
      if (['Sanctioned', 'Disbursed'].includes(status)) {
        app.sanctionOrderNumber = `MoTA/SANC/2026/${String(between(100000, 999999))}`;
        pushTimeline(app, 'Sanction', `Sanction order ${app.sanctionOrderNumber} issued.`, admin.name);
      }
      if (status === 'Disbursed') {
        app.disbursement = {
          amount: scheme.amountPerAnnum,
          utrNumber: `PFMS${between(10000000, 99999999)}`,
          creditedOn: daysAgo(between(1, 15)).toISOString(),
          mode: 'DBT — PFMS',
        };
        pushTimeline(app, 'DBT Payment', `Amount credited through PFMS. UTR ${app.disbursement.utrNumber}.`, 'PFMS');
      }
      if (status === 'Rejected') {
        app.decisionAt = daysAgo(between(2, 30));
        pushTimeline(app, 'Documents Verified', 'Application rejected. Reason: declared income exceeds the scheme ceiling.', officers[1].name, 'rejected');
      }
      if (status === 'Deficiency Raised') {
        pushTimeline(app, 'Documents Verified', 'Automated pre-check raised deficiencies. Applicant response awaited.', 'AI Verification Engine', 'current');
      }

      // eslint-disable-next-line no-await-in-loop
      const row = await Applications.create(app);
      // eslint-disable-next-line no-await-in-loop
      await Applications.update(row._id, {
        status,
        submittedAt: app.submittedAt || null,
        verifiedAt: app.verifiedAt || null,
        decisionAt: app.decisionAt || null,
        sanctionOrderNumber: app.sanctionOrderNumber || null,
        disbursement: app.disbursement || null,
      });
      created.push({ id: row._id, app, status });
    }
  }
  console.log(`[seed] ${created.length} applications created`);

  /* ---------------------------------------------------------- Audit records */
  const verifications = [];
  created.forEach(({ id, app, status }, index) => {
    if (['Verified', 'Selected', 'Sanctioned', 'Disbursed'].includes(status)) {
      verifications.push({
        applicationId: id,
        officerId: officers[index % officers.length]._id,
        action: 'Verified',
        remarks: 'All uploaded documents tally with the declared particulars.',
        confidence: app.aiFindings.overallConfidence,
        aiRecommendation: app.aiFindings.recommendation,
        overrodeAi: app.aiFindings.recommendation === 'Recommend Rejection',
        documentsChecked: app.documents.map((d) => d.code),
        timestamp: app.verifiedAt || new Date(),
      });
    }
    if (status === 'Rejected') {
      verifications.push({
        applicationId: id,
        officerId: officers[(index + 1) % officers.length]._id,
        action: 'Rejected',
        remarks: 'Declared annual family income exceeds the prescribed ceiling for this scheme.',
        confidence: app.aiFindings.overallConfidence,
        aiRecommendation: app.aiFindings.recommendation,
        overrodeAi: app.aiFindings.recommendation === 'Recommend Approval',
        documentsChecked: app.documents.map((d) => d.code),
        timestamp: app.decisionAt || new Date(),
      });
    }
  });
  await Verifications.createMany(verifications);
  console.log(`[seed] ${verifications.length} verification records created`);

  console.log('\n=============================================================');
  console.log(' Demo accounts (password shown against each)');
  console.log('=============================================================');
  console.log(' Applicant      student@example.in     Student@1234');
  console.log(' Officer        officer@example.in     Officer@1234');
  console.log(' Administrator  admin@example.in       Admin@1234');
  console.log('=============================================================\n');

  return { schemes: schemes.length, applications: created.length };
}

/* Run directly:  npm run seed  */
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase({ standalone: true })
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[seed] failed:', err);
      await closePool();
      process.exit(1);
    });
}
