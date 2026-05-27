/**
 * Project Routes
 */
const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect, restrictTo, createAuditLog } = require('../middleware/authMiddleware');
const { projectValidator, paginationValidator, mongoIdValidator } = require('../middleware/validationMiddleware');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { getIO } = require('../socket');

router.use(protect);

/**
 * Get all projects for current user/org
 */
router.get('/', paginationValidator, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, search, archived } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {
    isDeleted: false,
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
  };

  if (req.user.organization) {
    filter.$or.push({ organization: req.user.organization._id || req.user.organization });
  }

  if (status) filter.status = status;
  if (archived === 'true') filter.isArchived = true;
  else if (archived !== 'include') filter.isArchived = { $ne: true };
  if (search) filter.$text = { $search: search };

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate('owner', 'name avatar email')
      .populate('lead', 'name avatar')
      .populate('members.user', 'name avatar email')
      .sort('-updatedAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Project.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: projects,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
}));

/**
 * Get single project
 */
router.get('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const project = await Project.findOne({ _id: req.params.id, isDeleted: false })
    .populate('owner', 'name avatar email designation')
    .populate('lead', 'name avatar email')
    .populate('members.user', 'name avatar email designation roles')
    .populate('client', 'name avatar email')
    .populate('members.addedBy', 'name');

  if (!project) return next(new AppError('Project not found', 404));

  res.status(200).json({ success: true, data: project });
}));

/**
 * Create project
 */
router.post('/', projectValidator, catchAsync(async (req, res, next) => {
  const project = await Project.create({
    ...req.body,
    owner: req.user._id,
    organization: req.body.organization || req.user.organization?._id || req.user.organization,
    members: [{ user: req.user._id, role: 'owner', addedBy: req.user._id }],
  });

  const populated = await Project.findById(project._id)
    .populate('owner', 'name avatar email')
    .populate('members.user', 'name avatar');

  await createAuditLog({
    action: 'create', entity: 'project', entityId: project._id,
    entityName: project.name, user: req.user._id,
    organization: project.organization, ipAddress: req.ip,
    description: `Created project: ${project.name}`,
  });

  res.status(201).json({ success: true, message: 'Project created successfully', data: populated });
}));

/**
 * Update project
 */
router.put('/:id', mongoIdValidator(), projectValidator, catchAsync(async (req, res, next) => {
  const project = await Project.findOne({ _id: req.params.id, isDeleted: false });
  if (!project) return next(new AppError('Project not found', 404));

  const allowedFields = [
    'name', 'description', 'startDate', 'endDate', 'priority', 'status',
    'visibility', 'tags', 'budget', 'lead', 'client', 'clientName',
    'milestones', 'customFields', 'boardColumns', 'workflow', 'category',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) project[field] = req.body[field];
  });

  await project.save();

  const io = getIO();
  if (io) io.to(`project:${project._id}`).emit('project:updated', project);

  res.status(200).json({ success: true, message: 'Project updated successfully', data: project });
}));

/**
 * Delete project (soft)
 */
router.delete('/:id', mongoIdValidator(), restrictTo('admin', 'manager', 'super_admin'), catchAsync(async (req, res, next) => {
  const project = await Project.findOne({ _id: req.params.id, isDeleted: false });
  if (!project) return next(new AppError('Project not found', 404));

  await Project.findByIdAndUpdate(req.params.id, {
    isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id,
  });

  res.status(200).json({ success: true, message: 'Project deleted successfully' });
}));

/**
 * Get project members
 */
router.get('/:id/members', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const project = await Project.findOne({ _id: req.params.id, isDeleted: false })
    .populate('members.user', 'name avatar email designation roles');

  if (!project) return next(new AppError('Project not found', 404));

  res.status(200).json({ success: true, data: { members: project.members } });
}));

/**
 * Add member to project
 */
router.post('/:id/members', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const { userId, role = 'developer' } = req.body;
  const project = await Project.findOne({ _id: req.params.id, isDeleted: false });
  if (!project) return next(new AppError('Project not found', 404));

  const existingMember = project.members.find((m) => m.user.toString() === userId);
  if (existingMember) return next(new AppError('User is already a member of this project', 409));

  project.members.push({ user: userId, role, addedBy: req.user._id });
  await project.save();

  const populated = await Project.findById(project._id).populate('members.user', 'name avatar email');

  res.status(200).json({ success: true, message: 'Member added successfully', data: populated });
}));

/**
 * Remove member from project
 */
router.delete('/:id/members/:userId', catchAsync(async (req, res, next) => {
  const project = await Project.findOne({ _id: req.params.id, isDeleted: false });
  if (!project) return next(new AppError('Project not found', 404));

  project.members = project.members.filter((m) => m.user.toString() !== req.params.userId);
  await project.save();

  res.status(200).json({ success: true, message: 'Member removed successfully' });
}));

/**
 * Update board columns
 */
router.patch('/:id/board-columns', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const { columns } = req.body;
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { boardColumns: columns },
    { new: true }
  );
  if (!project) return next(new AppError('Project not found', 404));

  const io = getIO();
  if (io) io.to(`project:${project._id}`).emit('project:columns-updated', { columns: project.boardColumns });

  res.status(200).json({ success: true, data: project.boardColumns });
}));

/**
 * Get project dashboard stats
 */
router.get('/:id/stats', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const projectId = req.params.id;

  const [taskStats, recentTasks] = await Promise.all([
    Task.aggregate([
      { $match: { project: require('mongoose').Types.ObjectId.createFromHexString(projectId), isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          storyPoints: { $sum: '$storyPoints' },
          estimatedHours: { $sum: '$estimatedHours' },
          loggedHours: { $sum: '$totalLoggedHours' },
        },
      },
    ]),
    Task.find({ project: projectId, isDeleted: false })
      .populate('assignees', 'name avatar')
      .sort('-updatedAt')
      .limit(5)
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: { taskStats, recentTasks },
  });
}));

/**
 * Archive/unarchive project
 */
router.patch('/:id/archive', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const project = await Project.findOne({ _id: req.params.id, isDeleted: false });
  if (!project) return next(new AppError('Project not found', 404));

  project.isArchived = !project.isArchived;
  project.archivedAt = project.isArchived ? new Date() : null;
  await project.save();

  res.status(200).json({
    success: true,
    message: project.isArchived ? 'Project archived' : 'Project unarchived',
    data: project,
  });
}));

module.exports = router;
