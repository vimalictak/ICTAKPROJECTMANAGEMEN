const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { sprintValidator, mongoIdValidator } = require('../middleware/validationMiddleware');
const { Sprint } = require('../models');
const Task = require('../models/Task');
const Project = require('../models/Project');

router.use(protect);

router.get('/', catchAsync(async (req, res) => {
  const { project, status, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };
  if (project) filter.project = project;
  if (status) filter.status = status;
  const sprints = await Sprint.find(filter).populate('createdBy', 'name avatar').sort('-createdAt').limit(parseInt(limit));
  res.json({ success: true, data: sprints });
}));

router.post('/', sprintValidator, catchAsync(async (req, res) => {
  const project = await Project.findById(req.body.project);
  if (!project) throw new AppError('Project not found', 404);
  const sprintCount = await Sprint.countDocuments({ project: req.body.project });
  const sprint = await Sprint.create({
    ...req.body,
    organization: project.organization,
    createdBy: req.user._id,
    sprintNumber: sprintCount + 1,
  });
  res.status(201).json({ success: true, data: sprint });
}));

router.get('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findById(req.params.id).populate('createdBy', 'name avatar');
  if (!sprint) return next(new AppError('Sprint not found', 404));
  res.json({ success: true, data: sprint });
}));

router.put('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!sprint) return next(new AppError('Sprint not found', 404));
  res.json({ success: true, data: sprint });
}));

router.patch('/:id/start', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) return next(new AppError('Sprint not found', 404));
  sprint.status = 'active';
  await sprint.save();
  res.json({ success: true, message: 'Sprint started', data: sprint });
}));

router.patch('/:id/complete', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) return next(new AppError('Sprint not found', 404));
  const { forwardTasksTo, retrospective } = req.body;
  
  if (forwardTasksTo) {
    await Task.updateMany({ sprint: sprint._id, status: { $ne: 'completed' }, isDeleted: false }, { sprint: forwardTasksTo });
  } else {
    await Task.updateMany({ sprint: sprint._id, status: { $ne: 'completed' }, isDeleted: false }, { $unset: { sprint: 1 } });
  }
  
  sprint.status = 'completed';
  sprint.completedAt = new Date();
  sprint.completedBy = req.user._id;
  if (retrospective) sprint.retrospective = retrospective;
  await sprint.save();
  res.json({ success: true, message: 'Sprint completed', data: sprint });
}));

router.get('/:id/tasks', mongoIdValidator(), catchAsync(async (req, res) => {
  const tasks = await Task.find({ sprint: req.params.id, isDeleted: false })
    .populate('assignees', 'name avatar').sort('order');
  res.json({ success: true, data: tasks });
}));

module.exports = router;
