const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const Organization = require('../models/Organization');
const User = require('../models/User');

router.use(protect);

router.post('/', catchAsync(async (req, res) => {
  const org = await Organization.create({ ...req.body, owner: req.user._id });
  await User.findByIdAndUpdate(req.user._id, { organization: org._id, roles: ['admin'] });
  res.status(201).json({ success: true, data: org });
}));

router.get('/my', catchAsync(async (req, res) => {
  const orgId = req.user.organization?._id || req.user.organization;
  if (!orgId) return res.json({ success: true, data: null });
  const org = await Organization.findById(orgId).populate('owner', 'name avatar email');
  res.json({ success: true, data: org });
}));

router.get('/:id', catchAsync(async (req, res, next) => {
  const org = await Organization.findById(req.params.id).populate('owner', 'name avatar email');
  if (!org) return next(new AppError('Organization not found', 404));
  res.json({ success: true, data: org });
}));

router.put('/:id', catchAsync(async (req, res, next) => {
  const allowed = ['name', 'description', 'logo', 'website', 'industry', 'size', 'settings', 'branding'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const org = await Organization.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!org) return next(new AppError('Organization not found', 404));
  res.json({ success: true, data: org });
}));

router.get('/:id/members', catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find({ organization: req.params.id, isDeleted: false }).select('-password -refreshTokens').skip(skip).limit(parseInt(limit)),
    User.countDocuments({ organization: req.params.id, isDeleted: false }),
  ]);
  res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

module.exports = router;
