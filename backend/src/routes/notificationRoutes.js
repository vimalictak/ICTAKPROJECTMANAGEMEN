const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { Notification } = require('../models');
const notificationService = require('../services/notificationService');

router.use(protect);

router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, unread } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const filter = { recipient: req.user._id };
  if (unread === 'true') filter.isRead = false;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).populate('sender', 'name avatar').sort('-createdAt').skip(skip).limit(parseInt(limit)),
    Notification.countDocuments(filter),
    notificationService.getUnreadCount(req.user._id),
  ]);
  res.json({ success: true, data: notifications, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

router.patch('/read-all', catchAsync(async (req, res) => {
  await notificationService.markAsRead(req.user._id);
  res.json({ success: true, message: 'All notifications marked as read' });
}));

router.patch('/:id/read', catchAsync(async (req, res) => {
  await notificationService.markAsRead(req.user._id, [req.params.id]);
  res.json({ success: true, message: 'Notification marked as read' });
}));

router.get('/unread-count', catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json({ success: true, data: { count } });
}));

module.exports = router;
