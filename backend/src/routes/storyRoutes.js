const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { mongoIdValidator } = require('../middleware/validationMiddleware');
const { Story } = require('../models');

router.use(protect);

router.get('/', catchAsync(async (req, res) => {
  const { project, sprint, status } = req.query;
  const filter = { isDeleted: false };
  if (project) filter.project = project;
  if (sprint) filter.sprint = sprint;
  if (status) filter.status = status;
  const stories = await Story.find(filter).populate('assignee', 'name avatar').populate('createdBy', 'name avatar').sort('-createdAt');
  res.json({ success: true, data: stories });
}));

router.post('/', catchAsync(async (req, res) => {
  const story = await Story.create({ ...req.body, owner: req.user._id, createdBy: req.user._id });
  res.status(201).json({ success: true, data: story });
}));

router.get('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const story = await Story.findById(req.params.id).populate('assignee', 'name avatar').populate('createdBy', 'name avatar');
  if (!story) return next(new AppError('Story not found', 404));
  res.json({ success: true, data: story });
}));

router.put('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const story = await Story.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!story) return next(new AppError('Story not found', 404));
  res.json({ success: true, data: story });
}));

router.delete('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  await Story.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
  res.json({ success: true, message: 'Story deleted' });
}));

module.exports = router;
