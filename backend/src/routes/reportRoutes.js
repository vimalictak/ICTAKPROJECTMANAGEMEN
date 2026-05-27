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

// Organization velocity report
router.get('/velocity', catchAsync(async (req, res) => {
  const orgId = req.user.organization?._id || req.user.organization;
  const filter = orgId ? { organization: orgId, status: 'completed', isDeleted: false } : { status: 'completed', isDeleted: false };
  
  const sprints = await Sprint.find(filter)
    .select('name sprintNumber velocity metrics startDate endDate').sort('endDate').limit(10);
    
  const formattedVelocity = sprints.map(s => ({
    sprint: s.name || `Sprint ${s.sprintNumber}`,
    planned: s.metrics?.plannedStoryPoints || 0,
    completed: s.metrics?.completedStoryPoints || s.velocity || 0
  }));
  res.json({ success: true, data: formattedVelocity });
}));

// Organization workload
router.get('/workload', catchAsync(async (req, res) => {
  const orgId = req.user.organization?._id || req.user.organization;
  const filter = orgId ? { organization: orgId, isDeleted: false, status: { $ne: 'completed' } } : { isDeleted: false, status: { $ne: 'completed' } };
  
  const workload = await Task.aggregate([
    { $match: filter },
    { $unwind: { path: '$assignees', preserveNullAndEmpty: true } },
    { $group: { _id: '$assignees', tasks: { $sum: 1 }, hours: { $sum: '$estimatedHours' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmpty: true } },
    { $project: { _id: 1, tasks: 1, hours: { $ifNull: ['$hours', 0] }, name: '$user.name' } },
  ]);
  
  const formattedWorkload = workload.map(w => ({
    name: w.name || 'Unassigned',
    tasks: w.tasks,
    hours: w.hours
  }));
  res.json({ success: true, data: formattedWorkload });
}));

// Dashboard overview
router.get('/dashboard', catchAsync(async (req, res) => {
  const orgId = req.user.organization?._id || req.user.organization;
  const Project = require('../models/Project');
  const Task = require('../models/Task');
  const { Sprint } = require('../models');
  const User = require('../models/User');

  const filter = orgId ? { organization: orgId, isDeleted: false } : { isDeleted: false };

  const [activeProjects, openTasks, activeSprints, teamMembers] = await Promise.all([
    Project.countDocuments({ ...filter, status: 'active' }),
    Task.countDocuments({ ...filter, status: { $ne: 'completed' } }),
    Sprint.countDocuments({ ...filter, status: { $in: ['active', 'planning'] } }),
    User.countDocuments(orgId ? { organization: orgId, isActive: true } : { isActive: true })
  ]);
  const stats = { activeProjects, openTasks, activeSprints, teamMembers };

  const tasksByStatusData = await Task.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const tasksByStatus = tasksByStatusData.map(t => ({ 
    name: t._id ? t._id.charAt(0).toUpperCase() + t._id.slice(1) : 'Unknown', 
    value: t.count 
  }));

  const tasksByPriorityData = await Task.aggregate([
    { $match: filter },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);
  const tasksByPriority = tasksByPriorityData.map(t => ({ 
    name: t._id ? t._id.charAt(0).toUpperCase() + t._id.slice(1) : 'Medium', 
    value: t.count 
  }));

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const weeklyActivityData = await Task.aggregate([
    { $match: { ...filter, createdAt: { $gte: lastWeek } } },
    { $group: { _id: { $dayOfWeek: "$createdAt" }, created: { $sum: 1 } } }
  ]);
  
  const completedWeeklyActivityData = await Task.aggregate([
    { $match: { ...filter, status: 'completed', completedAt: { $gte: lastWeek } } },
    { $group: { _id: { $dayOfWeek: "$completedAt" }, completed: { $sum: 1 } } }
  ]);
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyActivity = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayIndex = date.getDay();
    const mongoDay = dayIndex + 1;
    
    const createdItem = weeklyActivityData.find(d => d._id === mongoDay);
    const completedItem = completedWeeklyActivityData.find(d => d._id === mongoDay);
    
    weeklyActivity.push({
      day: daysOfWeek[dayIndex],
      created: createdItem ? createdItem.created : 0,
      completed: completedItem ? completedItem.completed : 0,
    });
  }

  const teamWorkload = await Task.aggregate([
    { $match: { ...filter, status: { $ne: 'completed' } } },
    { $unwind: { path: '$assignees', preserveNullAndEmpty: true } },
    { $group: { _id: '$assignees', taskCount: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmpty: true } },
    { $project: { _id: 1, taskCount: 1, 'user.name': 1, 'user.avatar': 1 } },
  ]);

  const recentActivity = await Task.find({ assignees: req.user._id, isDeleted: false })
    .populate('project', 'name key').populate('assignees', 'name avatar')
    .sort('-updatedAt').limit(5).lean();

  res.json({ 
    success: true, 
    data: { 
      stats, 
      tasksByStatus, 
      tasksByPriority,
      weeklyActivity, 
      teamWorkload,
      recentActivity
    } 
  });
}));

module.exports = router;
