import fs from 'fs';
import path from 'path';
import multer from 'multer';

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED[file.mimetype] || path.extname(file.originalname).replace('.', '') || 'bin';
    const code = (req.body?.documentCode || 'DOC').replace(/[^A-Z_]/gi, '');
    cb(null, `${Date.now()}-${code}-${Math.round(Math.random() * 1e6)}.${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    return cb(new Error('Only PDF, JPG and PNG files are accepted.'));
  },
});

export { UPLOAD_DIR };
