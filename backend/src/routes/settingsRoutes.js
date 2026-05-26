const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const Organization = require('../models/Organization');

router.use(protect);

router.get('/organization', catchAsync(async (req, res) => {
  const orgId = req.user.organization?._id || req.user.organization;
  if (!orgId) return res.json({ success: true, data: null });
  const org = await Organization.findById(orgId).select('-smtp.password');
  res.json({ success: true, data: org });
}));

router.put('/organization', restrictTo('admin', 'super_admin'), catchAsync(async (req, res) => {
  const orgId = req.user.organization?._id || req.user.organization;
  const allowed = ['settings', 'branding', 'smtp'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const org = await Organization.findByIdAndUpdate(orgId, updates, { new: true }).select('-smtp.password');
  res.json({ success: true, data: org });
}));

module.exports = router;
