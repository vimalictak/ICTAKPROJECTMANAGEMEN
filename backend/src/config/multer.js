const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { AppError } = require('../middleware/errorMiddleware')

// Ensure upload directories exist
const dirs = ['uploads/avatars', 'uploads/attachments', 'uploads/feedback']
dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true })
})

const storage = multer.diskStorage({
  destination(req, file, cb) {
    let folder = 'uploads/attachments'
    if (req.path.includes('avatar')) folder = 'uploads/avatars'
    if (req.path.includes('feedback')) folder = 'uploads/feedback'
    cb(null, path.join(process.cwd(), folder))
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${unique}${ext}`)
  },
})

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
]

function imageFilter(req, file, cb) {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new AppError('Only image files are allowed', 400), false)
  }
}

function fileFilter(req, file, cb) {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new AppError('File type not allowed', 400), false)
  }
}

exports.uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: imageFilter,
}).single('avatar')

exports.uploadAttachments = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
}).array('attachments', 10)

exports.uploadFeedback = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
}).array('files', 5)

exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('File too large', 400))
    if (err.code === 'LIMIT_FILE_COUNT') return next(new AppError('Too many files', 400))
    return next(new AppError(err.message, 400))
  }
  next(err)
}
