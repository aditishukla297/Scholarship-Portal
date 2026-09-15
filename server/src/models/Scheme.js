import mongoose from 'mongoose';

/**
 * A single machine-evaluable eligibility rule.
 * The AI eligibility engine walks these rules against an applicant profile.
 */
const ruleSchema = new mongoose.Schema(
  {
    field: { type: String, required: true }, // e.g. 'annualIncome', 'category'
    label: { type: String, required: true }, // human readable, shown to the applicant
    operator: {
      type: String,
      enum: ['eq', 'neq', 'in', 'nin', 'lte', 'gte', 'lt', 'gt', 'between', 'exists'],
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed },
    weight: { type: Number, default: 1 }, // contribution to the match score
    mandatory: { type: Boolean, default: true },
    remark: { type: String, default: '' },
  },
  { _id: false }
);

const documentRequirementSchema = new mongoose.Schema(
  {
    code: { type: String, required: true }, // CASTE_CERT, INCOME_CERT ...
    name: { type: String, required: true },
    mandatory: { type: Boolean, default: true },
    formats: { type: [String], default: ['pdf', 'jpg', 'png'] },
    validityMonths: { type: Number, default: 12 }, // 0 = never expires
    guideline: { type: String, default: '' },
  },
  { _id: false }
);

const schemeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, default: '' },
    ministry: { type: String, default: 'Ministry of Tribal Affairs' },
    type: {
      type: String,
      enum: ['Fellowship', 'Scholarship', 'Overseas Scholarship', 'Grant'],
      default: 'Scholarship',
    },
    description: { type: String, default: '' },
    benefits: { type: [String], default: [] },
    educationLevels: { type: [String], default: [] }, // Class 11-12, UG, PG, M.Phil, Ph.D
    slotsPerYear: { type: Number, default: 0 },
    amountPerAnnum: { type: Number, default: 0 },
    applicationStart: { type: Date },
    applicationEnd: { type: Date },
    eligibilityRules: { type: [ruleSchema], default: [] },
    requiredDocuments: { type: [documentRequirementSchema], default: [] },
    guidelinesUrl: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Scheme', schemeSchema);
