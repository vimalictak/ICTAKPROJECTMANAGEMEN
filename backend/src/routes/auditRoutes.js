const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { AuditLog } = require('../models');

router.use(protect, restrictTo('admin', 'super_admin', 'manager'));

router.get('/', catchAsync(async (req, res) => {
  const { entity, action, user, page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const filter = {};
  if (entity) filter.entity = entity;
  if (action) filter.action = action;
  if (user) filter.user = user;
  if (req.user.organization) filter.organization = req.user.organization._id || req.user.organization;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('user', 'name email avatar').sort('-createdAt').skip(skip).limit(parseInt(limit)),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

module.exports = router;
