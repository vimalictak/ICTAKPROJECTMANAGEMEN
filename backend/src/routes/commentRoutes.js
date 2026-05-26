const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { mongoIdValidator } = require('../middleware/validationMiddleware');
const { Comment } = require('../models');
const notificationService = require('../services/notificationService');
const Task = require('../models/Task');

router.use(protect);

router.get('/', catchAsync(async (req, res) => {
  const { task, story, parent } = req.query;
  const filter = { isDeleted: false };
  if (task) filter.task = task;
  if (story) filter.story = story;
  if (parent) filter.parent = parent;
  else filter.parent = { $exists: false };
  const comments = await Comment.find(filter).populate('author', 'name avatar designation').populate('mentions', 'name').sort('createdAt');
  res.json({ success: true, data: comments });
}));

router.post('/', catchAsync(async (req, res) => {
  const { content, task: taskId, story, parent, mentions } = req.body;
  const comment = await Comment.create({ content, task: taskId, story, parent, mentions, author: req.user._id });
  const populated = await Comment.findById(comment._id).populate('author', 'name avatar').populate('mentions', 'name email');

  if (mentions?.length > 0 && taskId) {
    const task = await Task.findById(taskId);
    if (task) await notificationService.notifyMention(comment, task, mentions, req.user);
  }

  res.status(201).json({ success: true, data: populated });
}));

router.put('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const comment = await Comment.findOne({ _id: req.params.id, author: req.user._id, isDeleted: false });
  if (!comment) return next(new AppError('Comment not found or not authorized', 404));
  comment.content = req.body.content;
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();
  const populated = await Comment.findById(comment._id).populate('author', 'name avatar');
  res.json({ success: true, data: populated });
}));

router.delete('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const comment = await Comment.findOneAndUpdate(
    { _id: req.params.id, author: req.user._id },
    { isDeleted: true, deletedAt: new Date() }
  );
  if (!comment) return next(new AppError('Comment not found', 404));
  res.json({ success: true, message: 'Comment deleted' });
}));

module.exports = router;
