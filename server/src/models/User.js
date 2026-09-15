import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },

    // Aadhaar is never stored in full. Only the masked form is persisted.
    aadhaarMasked: { type: String, default: '' },

    category: {
      type: String,
      enum: ['ST', 'SC', 'OBC', 'General', 'NA'],
      default: 'NA',
    },
    role: {
      type: String,
      enum: ['applicant', 'officer', 'admin'],
      default: 'applicant',
      index: true,
    },

    gender: { type: String, enum: ['Male', 'Female', 'Transgender', 'NA'], default: 'NA' },
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    designation: { type: String, default: '' }, // officers / admins
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/** Masks an Aadhaar number to the DBT-standard XXXX XXXX 1234 form. */
userSchema.statics.maskAadhaar = function maskAadhaar(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 12) return '';
  return `XXXX XXXX ${digits.slice(-4)}`;
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
