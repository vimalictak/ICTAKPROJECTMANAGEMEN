const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { catchAsync } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/files');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

router.post('/upload', upload.array('files', 10), catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) throw new Error('No files uploaded');
  const files = req.files.map((f) => ({
    name: f.originalname,
    filename: f.filename,
    url: `/uploads/files/${f.filename}`,
    size: f.size,
    mimeType: f.mimetype,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  }));
  res.status(201).json({ success: true, data: files });
}));

module.exports = router;
