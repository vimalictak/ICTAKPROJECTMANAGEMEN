const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

router.use(protect);

router.get('/', catchAsync(async (req, res) => {
  const { q, type, limit = 10 } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, data: { tasks: [], projects: [], users: [] } });

  const regex = new RegExp(q, 'i');
  const orgFilter = req.user.organization ? { organization: req.user.organization._id || req.user.organization } : {};

  const [tasks, projects, users] = await Promise.all([
    type && type !== 'task' ? [] : Task.find({ ...orgFilter, isDeleted: false, $or: [{ title: regex }, { taskKey: regex }] })
      .select('title taskKey status priority project').populate('project', 'name key').limit(parseInt(limit)).lean(),
    type && type !== 'project' ? [] : Project.find({ ...orgFilter, isDeleted: false, $or: [{ name: regex }, { key: regex }] })
      .select('name key status priority').limit(parseInt(limit)).lean(),
    type && type !== 'user' ? [] : User.find({ ...orgFilter, isDeleted: false, isActive: true, $or: [{ name: regex }, { email: regex }] })
      .select('name email avatar roles designation').limit(parseInt(limit)).lean(),
  ]);

  res.json({ success: true, data: { tasks, projects, users } });
}));

module.exports = router;
