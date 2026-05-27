const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { mongoIdValidator } = require('../middleware/validationMiddleware');
const { Feedback, FeedbackForm, Story } = require('../models');
const Project = require('../models/Project');
const Task = require('../models/Task');

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK FORMS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Get all feedback forms for a project or organization
router.get('/forms', protect, catchAsync(async (req, res) => {
  const { project, status } = req.query;
  const filter = {
    organization: req.user.organization,
    isDeleted: false,
  };
  if (project) filter.project = project;
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ['draft', 'published'] };
  }

  const forms = await FeedbackForm.find(filter)
    .populate('createdBy', 'name avatar email')
    .populate('publishedBy', 'name avatar email')
    .sort('-createdAt');
  res.json({ success: true, data: forms });
}));

// Get all feedback forms for a project by path param
router.get('/forms/:projectId', protect, mongoIdValidator('projectId'), catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = {
    project: req.params.projectId,
    organization: req.user.organization,
    isDeleted: false,
  };
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ['draft', 'published'] };
  }

  const forms = await FeedbackForm.find(filter)
    .populate('createdBy', 'name avatar email')
    .populate('publishedBy', 'name avatar email')
    .sort('-createdAt');
  res.json({ success: true, data: forms });
}));

// Get single feedback form
router.get('/form/:id', optionalAuth, mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const form = await FeedbackForm.findById(req.params.id)
    .populate('createdBy', 'name avatar email')
    .populate('publishedBy', 'name avatar email');

  if (!form || form.isDeleted) return next(new AppError('Form not found', 404));

  if (form.status !== 'published') {
    if (!req.user || form.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('Form not found', 404));
    }
  }

  res.json({ success: true, data: form });
}));

router.use(protect);

// Create new feedback form
router.post('/form', catchAsync(async (req, res, next) => {
  const { projectId, title, description, fields, categories, allowTaskResponse, collectEmail, collectName, showProgressBar } = req.body;

  if (!projectId || !title || !fields || fields.length === 0) {
    return next(new AppError('Project ID, title, and at least one field are required', 400));
  }

  const project = await Project.findById(projectId);
  if (!project) return next(new AppError('Project not found', 404));

  const form = await FeedbackForm.create({
    title,
    description,
    fields: fields.map((f, index) => ({ ...f, order: index })),
    project: projectId,
    organization: project.organization,
    createdBy: req.user._id,
    categories: categories || ['ui_ux', 'bug', 'suggestion', 'other'],
    allowTaskResponse: allowTaskResponse !== false,
    collectEmail: collectEmail !== false,
    collectName: collectName !== false,
    showProgressBar: showProgressBar !== false,
  });

  res.status(201).json({ success: true, data: form });
}));

// Update feedback form
router.patch('/form/:id', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const form = await FeedbackForm.findById(req.params.id);
  if (!form || form.isDeleted) return next(new AppError('Form not found', 404));

  // Only creator can update draft forms
  if (form.status === 'draft' && form.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the form creator can update draft forms', 403));
  }

  const updates = ['title', 'description', 'fields', 'categories', 'allowTaskResponse', 'collectEmail', 'collectName', 'showProgressBar'];
  updates.forEach(field => {
    if (req.body[field] !== undefined) {
      form[field] = req.body[field];
    }
  });

  await form.save();
  res.json({ success: true, data: form });
}));

// Publish feedback form
router.post('/form/:id/publish', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const form = await FeedbackForm.findById(req.params.id);
  if (!form || form.isDeleted) return next(new AppError('Form not found', 404));

  if (form.status === 'published') {
    return next(new AppError('Form is already published', 400));
  }

  form.status = 'published';
  form.publishedAt = new Date();
  form.publishedBy = req.user._id;
  await form.save();

  res.json({ success: true, message: 'Form published successfully', data: form });
}));

// Archive feedback form
router.post('/form/:id/archive', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const form = await FeedbackForm.findById(req.params.id);
  if (!form || form.isDeleted) return next(new AppError('Form not found', 404));

  form.status = 'archived';
  await form.save();

  res.json({ success: true, message: 'Form archived successfully', data: form });
}));

// Soft-delete feedback form
router.delete('/form/:id', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const form = await FeedbackForm.findById(req.params.id);
  if (!form || form.isDeleted) return next(new AppError('Form not found', 404));

  form.isDeleted = true;
  await form.save();

  res.json({ success: true, message: 'Form deleted successfully' });
}));

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK SUBMISSION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Get all feedback
router.get('/', protect, catchAsync(async (req, res) => {
  const { project, status, formId, category, page = 1, limit = 20 } = req.query;
  const filter = {
    isDeleted: false,
    organization: req.user.organization,
  };
  if (project) filter.project = project;
  if (status) filter.status = status;
  if (formId) filter.formId = formId;
  if (category) filter.category = category;

  const skip = (page - 1) * limit;
  const feedbacks = await Feedback.find(filter)
    .populate('submittedBy', 'name avatar email')
    .populate('reviewedBy', 'name')
    .populate('respondToTask', 'title')
    .populate('formId', 'title')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Feedback.countDocuments(filter);

  res.json({ success: true, data: feedbacks, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
}));

// Submit feedback
router.post('/', optionalAuth, catchAsync(async (req, res, next) => {
  const { projectId, formId, category = 'other', customFields = [], respondToTask, submitterName, submitterEmail } = req.body;

  if (!projectId) {
    return next(new AppError('Project ID is required', 400));
  }

  const project = await Project.findById(projectId);
  if (!project) return next(new AppError('Project not found', 404));

  let form = null;
  if (formId) {
    form = await FeedbackForm.findById(formId);
    if (!form || form.isDeleted) {
      return next(new AppError('Form not found', 404));
    }
    if (form.status === 'archived' || form.responseClosed) {
      return next(new AppError('This form is no longer accepting responses', 400));
    }
    if (form.status !== 'published' && (!req.user || form.createdBy.toString() !== req.user._id.toString())) {
      return next(new AppError('Form not found', 404));
    }
  } else if (!req.user) {
    return next(new AppError('Authentication required to submit feedback without a published form', 401));
  }

  const submittedBy = req.user ? req.user._id : null;
  const submitterNameValue = submitterName || req.user?.name || '';
  const submitterEmailValue = submitterEmail || req.user?.email || '';

  const feedback = await Feedback.create({
    project: projectId,
    organization: project.organization,
    submittedBy,
    submitterName: submitterNameValue,
    submitterEmail: submitterEmailValue,
    category,
    customFields,
    formId: formId || null,
    respondToTask: respondToTask || null,
    respondToTaskTitle: respondToTask ? (await Task.findById(respondToTask))?.title : null,
    title: customFields.find(f => f.label === 'title')?.value || 'Feedback Submission',
    description: customFields.find(f => f.label === 'description')?.value || '',
  });

  // Increment form response count
  if (form) {
    form.totalResponses += 1;
    await form.save();
  }

  res.status(201).json({ success: true, data: feedback });
}));

// Get single feedback
router.get('/:id', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id)
    .populate('submittedBy', 'name avatar email')
    .populate('reviewedBy', 'name')
    .populate('respondToTask', 'title')
    .populate('formId', 'title');
  if (!feedback) return next(new AppError('Feedback not found', 404));
  res.json({ success: true, data: feedback });
}));

// Delete feedback
router.delete('/:id', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback || feedback.isDeleted) return next(new AppError('Feedback not found', 404));
  feedback.isDeleted = true;
  await feedback.save();
  res.json({ success: true, message: 'Feedback deleted successfully' });
}));

// Update feedback status
router.patch('/:id/status', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
  const feedback = await Feedback.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      reviewNotes: req.body.notes,
    },
    { new: true }
  );
  if (!feedback) return next(new AppError('Feedback not found', 404));
  res.json({ success: true, data: feedback });
}));

// Convert feedback to story
router.post('/:id/convert-to-story', mongoIdValidator('id'), catchAsync(async (req, res, next) => {
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
    priority: req.body.priority || 'medium',
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
