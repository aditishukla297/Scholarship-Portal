import mongoose from 'mongoose';

/**
 * Binary store for uploaded documents.
 *
 * Files are held in MongoDB rather than on the filesystem, because the portal
 * runs on a serverless platform where the filesystem is read-only and does not
 * persist between invocations. One file per document keeps each record well
 * inside the 16 MB BSON limit (uploads are capped at 5 MB).
 */
const documentFileSchema = new mongoose.Schema(
  {
    storedName: { type: String, required: true, unique: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    documentCode: { type: String, required: true },
    fileName: String,
    mimeType: String,
    sizeBytes: Number,
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('DocumentFile', documentFileSchema);
