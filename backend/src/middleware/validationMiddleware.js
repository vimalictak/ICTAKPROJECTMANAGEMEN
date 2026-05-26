/**
 * Validation Middleware
 * @description Express validator integration with reusable validators
 */

const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorMiddleware');

/**
 * Run validation and return errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return next(new AppError('Validation failed', 422, errorMessages));
  }
  next();
};

// ─── Auth Validators ──────────────────────────────────────────────────────────

const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  validate,
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  validate,
];

const resetPasswordValidator = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  validate,
];

// ─── Project Validators ───────────────────────────────────────────────────────

const projectValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Name must be 2-200 characters'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.body.startDate && value < req.body.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid priority'),
  body('visibility')
    .optional()
    .isIn(['private', 'team', 'organization', 'public']).withMessage('Invalid visibility'),
  validate,
];

// ─── Task Validators ──────────────────────────────────────────────────────────

const taskValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 2, max: 500 }).withMessage('Title must be 2-500 characters'),
  body('project')
    .notEmpty().withMessage('Project ID is required')
    .isMongoId().withMessage('Invalid project ID'),
  body('priority')
    .optional()
    .isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid priority'),
  body('type')
    .optional()
    .isIn(['task', 'bug', 'feature', 'improvement', 'research', 'chore']).withMessage('Invalid task type'),
  body('estimatedHours')
    .optional()
    .isNumeric().withMessage('Estimated hours must be a number')
    .isFloat({ min: 0 }).withMessage('Estimated hours must be positive'),
  body('storyPoints')
    .optional()
    .isNumeric().withMessage('Story points must be a number')
    .isInt({ min: 0, max: 100 }).withMessage('Story points must be between 0 and 100'),
  validate,
];

// ─── Sprint Validators ────────────────────────────────────────────────────────

const sprintValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Sprint name is required')
    .isLength({ min: 2, max: 200 }),
  body('project')
    .notEmpty().withMessage('Project ID is required')
    .isMongoId().withMessage('Invalid project ID'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date')
    .custom((value, { req }) => {
      if (value <= req.body.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  validate,
];

// ─── Pagination Validators ────────────────────────────────────────────────────

const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate,
];

// ─── MongoDB ID Validator ─────────────────────────────────────────────────────

const mongoIdValidator = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName} format`),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  projectValidator,
  taskValidator,
  sprintValidator,
  paginationValidator,
  mongoIdValidator,
};
