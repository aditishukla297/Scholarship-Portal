import mongoose from 'mongoose';

/** An audit record of every officer action taken on an application. */
const verificationSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    officer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['Verified', 'Deficiency Raised', 'Approved', 'Rejected', 'Selected', 'Sanctioned', 'Reopened'],
      required: true,
    },
    remarks: { type: String, default: '' },
    confidence: { type: Number, default: 0 }, // AI confidence at the time of the decision
    aiRecommendation: { type: String, default: '' },
    overrodeAi: { type: Boolean, default: false },
    documentsChecked: { type: [String], default: [] },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Verification', verificationSchema);
