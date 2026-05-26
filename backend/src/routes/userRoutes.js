// ─── User Routes ─────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { mongoIdValidator, paginationValidator } = require('../middleware/validationMiddleware');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

router.use(protect);

// Get all users (admin)
router.get('/', paginationValidator, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, role, status, organization } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const filter = { isDeleted: false };
  if (organization) filter.organization = organization;
  else if (req.user.organization) filter.organization = req.user.organization._id || req.user.organization;
  if (role) filter.roles = { $in: role.split(',') };
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -refreshTokens').sort('-createdAt').skip(skip).limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

// Get user by ID
router.get('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password -refreshTokens').populate('organization', 'name logo');
  if (!user) return next(new AppError('User not found', 404));
  res.json({ success: true, data: user });
}));

// Update own profile
router.put('/me/profile', catchAsync(async (req, res) => {
  const allowed = ['name', 'bio', 'phone', 'timezone', 'locale', 'department', 'designation', 'preferences', 'notificationSettings'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password -refreshTokens');
  res.json({ success: true, message: 'Profile updated', data: user });
}));

// Upload avatar
router.post('/me/avatar', upload.single('avatar'), catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select('-password');
  res.json({ success: true, message: 'Avatar updated', data: { avatar: avatarUrl, user } });
}));

// Admin: update user
router.put('/:id', mongoIdValidator(), restrictTo('admin', 'super_admin'), catchAsync(async (req, res, next) => {
  const allowed = ['name', 'roles', 'isActive', 'department', 'designation'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) return next(new AppError('User not found', 404));
  res.json({ success: true, data: user });
}));

// Admin: soft delete user
router.delete('/:id', mongoIdValidator(), restrictTo('admin', 'super_admin'), catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, {
    isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id, isActive: false,
  });
  if (!user) return next(new AppError('User not found', 404));
  res.json({ success: true, message: 'User deleted' });
}));

// Get user login history
router.get('/:id/login-history', mongoIdValidator(), catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('loginHistory lastLogin');
  res.json({ success: true, data: user?.loginHistory || [] });
}));

module.exports = router;
