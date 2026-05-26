const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { mongoIdValidator } = require('../middleware/validationMiddleware');
const { Feedback, Story } = require('../models');
const Project = require('../models/Project');

router.use(protect);

router.get('/', catchAsync(async (req, res) => {
  const { project, status, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };
  if (project) filter.project = project;
  if (status) filter.status = status;
  const feedbacks = await Feedback.find(filter).populate('submittedBy', 'name avatar email').populate('reviewedBy', 'name').sort('-createdAt').limit(parseInt(limit));
  res.json({ success: true, data: feedbacks });
}));

router.post('/', catchAsync(async (req, res) => {
  const feedback = await Feedback.create({ ...req.body, submittedBy: req.user._id });
  res.status(201).json({ success: true, data: feedback });
}));

router.get('/:id', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id).populate('submittedBy', 'name avatar email').populate('reviewedBy', 'name');
  if (!feedback) return next(new AppError('Feedback not found', 404));
  res.json({ success: true, data: feedback });
}));

router.patch('/:id/status', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const feedback = await Feedback.findByIdAndUpdate(req.params.id, {
    status: req.body.status, reviewedBy: req.user._id, reviewedAt: new Date(), reviewNotes: req.body.notes,
  }, { new: true });
  if (!feedback) return next(new AppError('Feedback not found', 404));
  res.json({ success: true, data: feedback });
}));

router.post('/:id/convert-to-story', mongoIdValidator(), catchAsync(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) return next(new AppError('Feedback not found', 404));
  const project = await Project.findById(feedback.project);

  const story = await Story.create({
    title: feedback.title,
    description: feedback.description,
    project: feedback.project,
    organization: project.organization,
    owner: req.user._id,
    createdBy: req.user._id,
    priority: feedback.priority,
    sourceFeedback: feedback._id,
    ...req.body,
  });

  feedback.status = 'converted';
  feedback.convertedToStory = story._id;
  feedback.convertedAt = new Date();
  feedback.convertedBy = req.user._id;
  await feedback.save();

  res.json({ success: true, message: 'Feedback converted to story', data: { story, feedback } });
}));

module.exports = router;
