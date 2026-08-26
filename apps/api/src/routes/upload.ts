import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (for videos)
  fileFilter: (_req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|pdf|mp4|mov|avi|webm|mkv/;
    const mimetype = /^(image|video|application\/pdf)/.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Only images, videos, and pdf files are allowed'));
  },
});

// Require authentication for uploads
router.post('/', requireAuth, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url: fileUrl }, message: 'File uploaded successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'File upload failed' });
  }
});

export const uploadRouter = router;
