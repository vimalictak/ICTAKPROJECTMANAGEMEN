const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const { Sprint } = require('../models');
const mongoose = require('mongoose');

router.use(protect);

// Project summary report
router.get('/project/:id/summary', catchAsync(async (req, res) => {
  const projectId = mongoose.Types.ObjectId.createFromHexString(req.params.id);
  const [tasksByStatus, tasksByPriority, tasksByAssignee, timeStats] = await Promise.all([
    Task.aggregate([
      { $match: { project: projectId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 }, storyPoints: { $sum: '$storyPoints' } } },
    ]),
    Task.aggregate([
      { $match: { project: projectId, isDeleted: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { project: projectId, isDeleted: false, assignees: { $exists: true, $ne: [] } } },
      { $unwind: '$assignees' },
      { $group: { _id: '$assignees', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, count: 1, completed: 1, 'user.name': 1, 'user.avatar': 1 } },
    ]),
    Task.aggregate([
      { $match: { project: projectId, isDeleted: false } },
      { $group: { _id: null, totalEstimated: { $sum: '$estimatedHours' }, totalLogged: { $sum: '$totalLoggedHours' }, totalStoryPoints: { $sum: '$storyPoints' } } },
    ]),
  ]);

  res.json({ success: true, data: { tasksByStatus, tasksByPriority, tasksByAssignee, timeStats: timeStats[0] || {} } });
}));

// Sprint velocity report
router.get('/project/:id/velocity', catchAsync(async (req, res) => {
  const sprints = await Sprint.find({ project: req.params.id, status: 'completed', isDeleted: false })
    .select('name sprintNumber velocity metrics startDate endDate').sort('sprintNumber').limit(10);
  res.json({ success: true, data: sprints });
}));

// Team workload
router.get('/project/:id/workload', catchAsync(async (req, res) => {
  const projectId = mongoose.Types.ObjectId.createFromHexString(req.params.id);
  const workload = await Task.aggregate([
    { $match: { project: projectId, isDeleted: false, status: { $ne: 'completed' } } },
    { $unwind: { path: '$assignees', preserveNullAndEmpty: true } },
    { $group: { _id: '$assignees', taskCount: { $sum: 1 }, storyPoints: { $sum: '$storyPoints' }, estimatedHours: { $sum: '$estimatedHours' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmpty: true } },
    { $project: { _id: 1, taskCount: 1, storyPoints: 1, estimatedHours: 1, 'user.name': 1, 'user.avatar': 1, 'user.email': 1 } },
  ]);
  res.json({ success: true, data: workload });
}));

// Dashboard overview
router.get('/dashboard', catchAsync(async (req, res) => {
  const orgId = req.user.organization?._id || req.user.organization;
  const Project = require('../models/Project');
  const filter = orgId ? { organization: orgId, isDeleted: false } : { isDeleted: false };

  const [projectStats, taskStats, recentActivity] = await Promise.all([
    Project.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { ...filter, assignees: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.find({ assignees: req.user._id, isDeleted: false })
      .populate('project', 'name key').populate('assignees', 'name avatar')
      .sort('-updatedAt').limit(5).lean(),
  ]);

  res.json({ success: true, data: { projectStats, taskStats, recentActivity } });
}));

module.exports = router;
