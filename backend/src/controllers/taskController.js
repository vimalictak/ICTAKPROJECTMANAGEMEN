/**
 * Task Controller
 * @description Complete task management with kanban, time tracking, and real-time updates
 */

const Task = require('../models/Task');
const Project = require('../models/Project');
const { Notification } = require('../models');
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { createAuditLog } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');
const { getIO } = require('../socket');
const mongoose = require('mongoose');

/**
 * Build task query with filters
 */
const buildTaskQuery = (queryParams, baseFilter = {}) => {
  const {
    status,
    priority,
    type,
    assignee,
    sprint,
    labels,
    search,
    startDate,
    endDate,
    overdue,
    noSprint,
    columnId,
  } = queryParams;

  const filter = { ...baseFilter, isDeleted: false };

  if (status) filter.status = { $in: status.split(',') };
  if (priority) filter.priority = { $in: priority.split(',') };
  if (type) filter.type = { $in: type.split(',') };
  if (assignee) filter.assignees = { $in: assignee.split(',') };
  if (sprint) filter.sprint = sprint;
  if (noSprint === 'true') filter.sprint = { $exists: false };
  if (columnId) filter.columnId = columnId;
  if (labels) filter.labels = { $in: labels.split(',') };

  if (search) {
    filter.$text = { $search: search };
  }

  if (startDate || endDate) {
    filter.dueDate = {};
    if (startDate) filter.dueDate.$gte = new Date(startDate);
    if (endDate) filter.dueDate.$lte = new Date(endDate);
  }

  if (overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'completed' };
  }

  return filter;
};

/**
 * @desc    Get all tasks for a project
 * @route   GET /api/v1/tasks?project=:id
 * @access  Private
 */
const getTasks = catchAsync(async (req, res) => {
  const {
    project,
    page = 1,
    limit = 50,
    sort = '-createdAt',
    parent,
    grouped,
  } = req.query;

  const baseFilter = {};
  if (project) baseFilter.project = project;
  if (parent === 'null') baseFilter.parent = { $exists: false };
  else if (parent) baseFilter.parent = parent;

  const filter = buildTaskQuery(req.query, baseFilter);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignees', 'name avatar email')
      .populate('owner', 'name avatar')
      .populate('createdBy', 'name avatar')
      .populate('sprint', 'name status')
      .populate('story', 'title')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Task.countDocuments(filter),
  ]);

  // Group by column for kanban if requested
  if (grouped === 'column') {
    const columns = {};
    tasks.forEach((task) => {
      const col = task.columnId || 'todo';
      if (!columns[col]) columns[col] = [];
      columns[col].push(task);
    });

    return res.status(200).json({
      success: true,
      data: { columns, tasks },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  }

  res.status(200).json({
    success: true,
    data: tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single task
 * @route   GET /api/v1/tasks/:id
 * @access  Private
 */
const getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false })
    .populate('assignees', 'name avatar email designation')
    .populate('owner', 'name avatar email')
    .populate('createdBy', 'name avatar')
    .populate('sprint', 'name status startDate endDate')
    .populate('story', 'title priority')
    .populate('project', 'name key boardColumns')
    .populate('parent', 'title taskKey')
    .populate('watchers', 'name avatar')
    .populate({
      path: 'subtasks',
      match: { isDeleted: false },
      populate: { path: 'assignees', select: 'name avatar' },
    })
    .populate({
      path: 'comments',
      match: { isDeleted: false, parent: { $exists: false } },
      populate: { path: 'author', select: 'name avatar' },
      options: { sort: { createdAt: -1 }, limit: 20 },
    })
    .populate('timeLogs.user', 'name avatar');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

/**
 * @desc    Create task
 * @route   POST /api/v1/tasks
 * @access  Private
 */
const createTask = catchAsync(async (req, res, next) => {
  const {
    title, description, project: projectId, sprint, story,
    assignees, priority, type, startDate, dueDate,
    estimatedHours, storyPoints, labels, checklist,
    columnId, parent, acceptanceCriteria,
  } = req.body;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Generate task key
  const taskCount = await Task.countDocuments({ project: projectId });
  const taskKey = `${project.key}-${taskCount + 1}`;

  const task = await Task.create({
    title,
    description,
    taskKey,
    project: projectId,
    organization: project.organization,
    sprint,
    story,
    owner: req.user._id,
    createdBy: req.user._id,
    assignees: assignees || [],
    priority: priority || 'medium',
    type: type || 'task',
    startDate,
    dueDate,
    estimatedHours,
    storyPoints,
    labels: labels || [],
    checklist: checklist || [],
    columnId: columnId || 'todo',
    status: 'todo',
    parent,
    acceptanceCriteria: acceptanceCriteria || [],
  });

  // Update project metrics
  await Project.findByIdAndUpdate(projectId, {
    $inc: { 'metrics.totalTasks': 1 },
  });

  const populatedTask = await Task.findById(task._id)
    .populate('assignees', 'name avatar email')
    .populate('owner', 'name avatar')
    .populate('createdBy', 'name avatar')
    .populate('project', 'name key');

  // Send notifications to assignees
  if (assignees?.length > 0) {
    await notificationService.notifyTaskAssignment(populatedTask, req.user);
  }

  // Real-time update
  const io = getIO();
  if (io) {
    io.to(`project:${projectId}`).emit('task:created', populatedTask);
  }

  await createAuditLog({
    action: 'create',
    entity: 'task',
    entityId: task._id,
    entityName: task.title,
    user: req.user._id,
    organization: project.organization,
    ipAddress: req.ip,
    description: `Created task: ${task.title}`,
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: populatedTask,
  });
});

/**
 * @desc    Update task
 * @route   PUT /api/v1/tasks/:id
 * @access  Private
 */
const updateTask = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const allowedUpdates = [
    'title', 'description', 'assignees', 'priority', 'type',
    'startDate', 'dueDate', 'estimatedHours', 'storyPoints',
    'labels', 'checklist', 'status', 'columnId', 'progress',
    'sprint', 'story', 'acceptanceCriteria', 'watchers',
    'customMetric', 'order', 'boardOrder', 'color', 'group',
    'reminders', 'tags',
  ];

  const updates = {};
  const changes = [];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      const oldValue = task[field];
      const newValue = req.body[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field, oldValue, newValue });
        updates[field] = newValue;
      }
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(200).json({ success: true, message: 'No changes made', data: task });
  }

  // Handle status change
  if (updates.status === 'completed' && task.status !== 'completed') {
    updates.completedAt = new Date();
    updates.progress = 100;
    // Update project metrics
    await Project.findByIdAndUpdate(task.project, {
      $inc: { 'metrics.completedTasks': 1 },
    });
  } else if (task.status === 'completed' && updates.status && updates.status !== 'completed') {
    updates.completedAt = null;
    await Project.findByIdAndUpdate(task.project, {
      $inc: { 'metrics.completedTasks': -1 },
    });
  }

  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
    .populate('assignees', 'name avatar email')
    .populate('owner', 'name avatar')
    .populate('sprint', 'name status')
    .populate('project', 'name key');

  // Notify assignees of changes
  if (updates.assignees) {
    await notificationService.notifyTaskAssignment(updatedTask, req.user);
  }

  // Real-time update
  const io = getIO();
  if (io) {
    io.to(`project:${task.project}`).emit('task:updated', updatedTask);
  }

  await createAuditLog({
    action: 'update',
    entity: 'task',
    entityId: task._id,
    entityName: task.title,
    user: req.user._id,
    changes,
    ipAddress: req.ip,
    description: `Updated task: ${task.title}`,
  });

  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: updatedTask,
  });
});

/**
 * @desc    Delete task (soft delete)
 * @route   DELETE /api/v1/tasks/:id
 * @access  Private
 */
const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  await Task.findByIdAndUpdate(req.params.id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: req.user._id,
  });

  // Update project metrics
  await Project.findByIdAndUpdate(task.project, {
    $inc: { 'metrics.totalTasks': -1 },
    ...(task.status === 'completed' ? { $inc: { 'metrics.completedTasks': -1 } } : {}),
  });

  // Real-time update
  const io = getIO();
  if (io) {
    io.to(`project:${task.project}`).emit('task:deleted', { id: task._id });
  }

  await createAuditLog({
    action: 'delete',
    entity: 'task',
    entityId: task._id,
    entityName: task.title,
    user: req.user._id,
    ipAddress: req.ip,
    description: `Deleted task: ${task.title}`,
  });

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
  });
});

/**
 * @desc    Update task column (Kanban drag & drop)
 * @route   PATCH /api/v1/tasks/:id/move
 * @access  Private
 */
const moveTask = catchAsync(async (req, res, next) => {
  const { columnId, order, status } = req.body;
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const oldColumnId = task.columnId;
  const updates = { columnId, order };
  if (status) updates.status = status;

  if (status === 'completed' && task.status !== 'completed') {
    updates.completedAt = new Date();
    await Project.findByIdAndUpdate(task.project, {
      $inc: { 'metrics.completedTasks': 1 },
    });
  }

  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true }
  ).populate('assignees', 'name avatar');

  // Real-time update for kanban board
  const io = getIO();
  if (io) {
    io.to(`project:${task.project}`).emit('task:moved', {
      taskId: task._id,
      fromColumn: oldColumnId,
      toColumn: columnId,
      order,
      task: updatedTask,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Task moved successfully',
    data: updatedTask,
  });
});

/**
 * @desc    Log time on task
 * @route   POST /api/v1/tasks/:id/time-logs
 * @access  Private
 */
const logTime = catchAsync(async (req, res, next) => {
  const { hours, description, date } = req.body;

  if (!hours || hours <= 0) {
    return next(new AppError('Valid hours are required', 400));
  }

  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const timeLog = {
    user: req.user._id,
    hours: parseFloat(hours),
    description,
    date: date || new Date(),
    loggedAt: new Date(),
  };

  task.timeLogs.push(timeLog);
  task.totalLoggedHours = task.timeLogs.reduce((sum, log) => sum + log.hours, 0);
  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate('timeLogs.user', 'name avatar');

  res.status(201).json({
    success: true,
    message: 'Time logged successfully',
    data: updatedTask,
  });
});

/**
 * @desc    Add/remove watcher
 * @route   PATCH /api/v1/tasks/:id/watch
 * @access  Private
 */
const toggleWatcher = catchAsync(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const userId = req.user._id.toString();
  const isWatching = task.watchers.map((w) => w.toString()).includes(userId);

  const update = isWatching
    ? { $pull: { watchers: req.user._id } }
    : { $addToSet: { watchers: req.user._id } };

  await Task.findByIdAndUpdate(req.params.id, update);

  res.status(200).json({
    success: true,
    message: isWatching ? 'Removed from watchers' : 'Added to watchers',
    data: { isWatching: !isWatching },
  });
});

/**
 * @desc    Bulk update tasks (for sprint assignment, etc.)
 * @route   PATCH /api/v1/tasks/bulk
 * @access  Private
 */
const bulkUpdateTasks = catchAsync(async (req, res) => {
  const { taskIds, updates } = req.body;

  const allowedBulkFields = ['sprint', 'assignees', 'priority', 'status', 'labels', 'columnId'];
  const filteredUpdates = {};

  allowedBulkFields.forEach((field) => {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  });

  const result = await Task.updateMany(
    { _id: { $in: taskIds }, isDeleted: false },
    filteredUpdates
  );

  res.status(200).json({
    success: true,
    message: `Updated ${result.modifiedCount} tasks`,
    data: { modifiedCount: result.modifiedCount },
  });
});

/**
 * @desc    Get task activity/changelog
 * @route   GET /api/v1/tasks/:id/activity
 * @access  Private
 */
const getTaskActivity = catchAsync(async (req, res, next) => {
  const { AuditLog } = require('../models');

  const activity = await AuditLog.find({
    entity: 'task',
    entityId: req.params.id,
  })
    .populate('user', 'name avatar')
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    success: true,
    data: activity,
  });
});

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  logTime,
  toggleWatcher,
  bulkUpdateTasks,
  getTaskActivity,
};
