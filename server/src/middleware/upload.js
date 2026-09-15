import multer from 'multer';

/**
 * Uploads are held in memory and then written to MongoDB by the route handler.
 * Memory storage is required on serverless platforms, whose filesystem is
 * read-only apart from an ephemeral /tmp that does not survive an invocation.
 */
const ALLOWED = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    return cb(new Error('Only PDF, JPG and PNG files are accepted.'));
  },
});

/** Builds the stable name a stored file is addressed by. */
export function buildStoredName(documentCode = 'DOC', mimeType = '') {
  const ext = ALLOWED[mimeType] || 'bin';
  const code = String(documentCode).replace(/[^A-Z_]/gi, '') || 'DOC';
  return `${Date.now()}-${code}-${Math.round(Math.random() * 1e6)}.${ext}`;
}

export { ALLOWED };
