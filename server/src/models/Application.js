import mongoose from 'mongoose';

export const APPLICATION_STATUSES = [
  'Draft',
  'Submitted',
  'Under Verification',
  'Deficiency Raised',
  'Verified',
  'Selected',
  'Rejected',
  'Sanctioned',
  'Disbursed',
];

/** OCR output for one uploaded document. */
const ocrResultSchema = new mongoose.Schema(
  {
    engine: { type: String, default: 'MoTA-OCR v1 (simulated)' },
    processedAt: { type: Date, default: Date.now },
    confidence: { type: Number, default: 0 }, // 0 - 100
    fields: [
      {
        key: String,
        label: String,
        value: String,
        confidence: Number,
        matchesProfile: { type: Boolean, default: true },
        expectedValue: String,
        _id: false,
      },
    ],
    rawText: { type: String, default: '' },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema({
  code: { type: String, required: true }, // CASTE_CERT etc.
  name: { type: String, required: true },
  fileName: String,
  storedName: String,
  mimeType: String,
  sizeBytes: Number,
  uploadedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Uploaded', 'Verified', 'Rejected', 'Deficient'],
    default: 'Uploaded',
  },
  ocr: ocrResultSchema,
});

const deficiencySchema = new mongoose.Schema({
  code: { type: String, required: true },
  documentCode: { type: String, default: '' },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  severity: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  raisedBy: { type: String, enum: ['AI', 'Officer'], default: 'AI' },
  raisedAt: { type: Date, default: Date.now },
  dueDate: { type: Date },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  applicantRemark: { type: String, default: '' },
});

const timelineSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    status: { type: String, enum: ['completed', 'current', 'pending', 'rejected'], default: 'pending' },
    remark: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    actor: { type: String, default: 'System' },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicationId: { type: String, unique: true, index: true }, // MoTA/NFST/2026/000123
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scheme: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true, index: true },
    academicYear: { type: String, default: '2026-27' },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'Draft', index: true },
    currentStep: { type: Number, default: 1 },

    personal: {
      fullName: String,
      fatherName: String,
      motherName: String,
      dob: Date,
      gender: { type: String, enum: ['Male', 'Female', 'Transgender', 'NA'], default: 'NA' },
      email: String,
      phone: String,
      aadhaarMasked: String,
      address: String,
      state: { type: String, index: true },
      district: String,
      pincode: String,
      isPvtg: { type: Boolean, default: false }, // Particularly Vulnerable Tribal Group
      isDisabled: { type: Boolean, default: false },
    },

    category: {
      socialCategory: { type: String, enum: ['ST', 'SC', 'OBC', 'General'], default: 'ST' },
      tribeName: String,
      casteCertificateNumber: String,
      casteCertificateIssuedOn: Date,
      casteCertificateAuthority: String,
      domicileState: String,
      annualIncome: { type: Number, default: 0 },
      incomeCertificateNumber: String,
      incomeCertificateIssuedOn: Date,
    },

    academic: {
      educationLevel: { type: String, index: true }, // UG / PG / M.Phil / Ph.D
      course: String,
      specialisation: String,
      institution: String,
      institutionType: { type: String, enum: ['Government', 'Private', 'Deemed', 'Foreign'], default: 'Government' },
      universityRecognised: { type: Boolean, default: true },
      admissionYear: Number,
      previousQualification: String,
      previousPercentage: Number,
      entranceExam: String,
      entranceScore: Number,
    },

    bank: {
      accountHolder: String,
      accountNumberMasked: String,
      ifsc: String,
      bankName: String,
      branch: String,
      aadhaarSeeded: { type: Boolean, default: false },
    },

    documents: { type: [documentSchema], default: [] },
    deficiencies: { type: [deficiencySchema], default: [] },
    timeline: { type: [timelineSchema], default: [] },

    /** Consolidated output of the AI engines. Advisory only. */
    aiFindings: {
      eligibilityScore: { type: Number, default: 0 },
      meritScore: { type: Number, default: 0 },
      documentConfidence: { type: Number, default: 0 },
      overallConfidence: { type: Number, default: 0 },
      recommendation: {
        type: String,
        enum: ['Recommend Approval', 'Recommend Rejection', 'Needs Manual Review', 'Pending'],
        default: 'Pending',
      },
      rulesEvaluated: [
        {
          label: String,
          passed: Boolean,
          expected: String,
          observed: String,
          mandatory: Boolean,
          _id: false,
        },
      ],
      duplicateFlag: { type: Boolean, default: false },
      duplicateDetail: { type: String, default: '' },
      notes: { type: [String], default: [] },
      generatedAt: Date,
    },

    submittedAt: Date,
    verifiedAt: Date,
    decisionAt: Date,
    sanctionOrderNumber: String,
    disbursement: {
      amount: Number,
      utrNumber: String,
      creditedOn: Date,
      mode: { type: String, default: 'DBT — PFMS' },
    },
  },
  { timestamps: true }
);

applicationSchema.index({ status: 1, 'personal.state': 1 });

export default mongoose.model('Application', applicationSchema);
