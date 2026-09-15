import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Scheme from './models/Scheme.js';
import Application from './models/Application.js';
import Verification from './models/Verification.js';
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

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function seedDatabase({ standalone = false } = {}) {
  if (standalone) await connectDB();
  console.log('[seed] clearing existing collections');
  await Promise.all([
    User.deleteMany({}),
    Scheme.deleteMany({}),
    Application.deleteMany({}),
    Verification.deleteMany({}),
  ]);

  /* ---------------------------------------------------------------- Schemes */
  const schemes = await Scheme.insertMany(SCHEMES);
  console.log(`[seed] ${schemes.length} schemes created`);

  /* ------------------------------------------------------------------ Staff */
  const makeUser = async (data, password) => {
    const u = new User(data);
    await u.setPassword(password);
    await u.save();
    return u;
  };

  const admin = await makeUser(
    {
      name: 'Dr. R. Subramanian',
      email: 'admin@example.in',
      phone: '9810000001',
      role: 'admin',
      designation: 'Joint Secretary (Education), MoTA',
      state: 'Delhi',
      category: 'NA',
    },
    'Admin@1234'
  );

  const officers = await Promise.all([
    makeUser(
      {
        name: 'Smt. Anita Verma',
        email: 'officer@example.in',
        phone: '9810000002',
        role: 'officer',
        designation: 'Under Secretary (Scholarship Division)',
        state: 'Delhi',
        category: 'NA',
      },
      'Officer@1234'
    ),
    makeUser(
      {
        name: 'Shri K. Toppo',
        email: 'officer2@example.in',
        phone: '9810000003',
        role: 'officer',
        designation: 'Section Officer (NFST)',
        state: 'Jharkhand',
        category: 'NA',
      },
      'Officer@1234'
    ),
  ]);

  /* ------------------------------------------------- Demo applicant account */
  const demoApplicant = await makeUser(
    {
      name: 'Birsa Munda',
      email: 'student@example.in',
      phone: '9876543210',
      role: 'applicant',
      category: 'ST',
      gender: 'Male',
      state: 'Jharkhand',
      district: 'Khunti',
      aadhaarMasked: User.maskAadhaar('123456789012'),
    },
    'Student@1234'
  );

  /* ------------------------------------------------------ Bulk applications */
  const applicants = [demoApplicant];
  for (let i = 0; i < 59; i += 1) {
    const gender = rand() > 0.46 ? 'Female' : 'Male';
    const name = `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`;
    // eslint-disable-next-line no-await-in-loop
    const u = await makeUser(
      {
        name,
        email: `applicant${i + 1}@example.in`,
        phone: `9${between(100000000, 999999999)}`,
        role: 'applicant',
        category: 'ST',
        gender,
        state: pick(STATES),
        aadhaarMasked: `XXXX XXXX ${between(1000, 9999)}`,
      },
      'Student@1234'
    );
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

      const app = new Application({
        applicationId: `MoTA/${scheme.code}/2026/${String(serial).padStart(6, '0')}`,
        applicant: applicant._id,
        scheme: scheme._id,
        academicYear: '2026-27',
        status,
        currentStep: 6,
        personal: {
          fullName: applicant.name,
          fatherName: `${pick(FIRST_NAMES)} ${applicant.name.split(' ')[1] || 'Munda'}`,
          motherName: `${pick(FIRST_NAMES)} Devi`,
          dob: new Date(1996 + between(0, 8), between(0, 11), between(1, 28)),
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
          casteCertificateIssuedOn: daysAgo(between(200, 1800)),
          casteCertificateAuthority: `Tahsildar, ${applicant.district || 'Khunti'}`,
          domicileState: applicant.state,
          annualIncome: income,
          incomeCertificateNumber: `INC/${between(100000, 999999)}`,
          // A slice of applicants deliberately carry an expired income certificate.
          incomeCertificateIssuedOn: rand() > 0.78 ? daysAgo(between(400, 700)) : daysAgo(between(30, 300)),
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
        submittedAt: status === 'Draft' ? undefined : daysAgo(submittedDaysAgo),
      });

      // Documents + simulated OCR.
      const requiredDocs = scheme.requiredDocuments.filter((d) => d.mandatory);
      const uploadAll = status !== 'Draft';
      const docsToUpload = uploadAll
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
          uploadedAt: daysAgo(submittedDaysAgo + 1),
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
        if (status === 'Rejected') app.submittedAt = app.submittedAt || daysAgo(submittedDaysAgo);
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
        generatedAt: daysAgo(submittedDaysAgo - 1),
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
          creditedOn: daysAgo(between(1, 15)),
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
      await app.save();
      created.push({ app, status });
    }
  }
  console.log(`[seed] ${created.length} applications created`);

  /* ---------------------------------------------------------- Audit records */
  const verifications = [];
  created.forEach(({ app, status }, index) => {
    if (['Verified', 'Selected', 'Sanctioned', 'Disbursed'].includes(status)) {
      verifications.push({
        application: app._id,
        officer: officers[index % officers.length]._id,
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
        application: app._id,
        officer: officers[(index + 1) % officers.length]._id,
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
  await Verification.insertMany(verifications);
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
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] failed:', err);
      process.exit(1);
    });
}
