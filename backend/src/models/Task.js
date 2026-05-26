/**
 * Task Model
 * @description Full-featured task management with time tracking, dependencies, and more
 */

const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  order: { type: Number, default: 0 },
});

const timeLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hours: { type: Number, required: true, min: 0.01 },
  description: String,
  date: { type: Date, default: Date.now },
  loggedAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema(
  {
    // ─── Core Fields ─────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [500, 'Title cannot exceed 500 characters'],
    },
    description: { type: String, maxlength: 50000 },
    taskKey: String, // e.g., PROJ-123

    // ─── Relationships ────────────────────────────────────────────────────
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
    story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // For subtasks

    // ─── Assignment ───────────────────────────────────────────────────────
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ─── Status & Priority ────────────────────────────────────────────────
    status: {
      type: String,
      default: 'todo',
    },
    columnId: { type: String, default: 'todo' }, // Kanban column
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    type: {
      type: String,
      enum: ['task', 'bug', 'feature', 'improvement', 'research', 'chore'],
      default: 'task',
    },

    // ─── Dates ───────────────────────────────────────────────────────────
    startDate: Date,
    dueDate: Date,
    completedAt: Date,

    // ─── Estimation & Time ────────────────────────────────────────────────
    estimatedHours: { type: Number, min: 0 },
    storyPoints: { type: Number, min: 0, max: 100 },
    progress: { type: Number, default: 0, min: 0, max: 100 },

    // Time logs
    timeLogs: [timeLogSchema],
    totalLoggedHours: { type: Number, default: 0 },

    // ─── Custom Measurable Units ──────────────────────────────────────────
    customMetric: {
      name: String,
      unit: String,
      target: Number,
      current: Number,
    },

    // ─── Labels & Tags ────────────────────────────────────────────────────
    labels: [String],
    tags: [String],
    color: String,

    // ─── Content ─────────────────────────────────────────────────────────
    checklist: [checklistItemSchema],
    attachments: [
      {
        name: String,
        url: String,
        size: Number,
        mimeType: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ─── Dependencies ─────────────────────────────────────────────────────
    dependencies: [
      {
        task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        type: {
          type: String,
          enum: ['blocks', 'is_blocked_by', 'relates_to', 'duplicates'],
          default: 'relates_to',
        },
      },
    ],

    // ─── Recurrence ───────────────────────────────────────────────────────
    isRecurring: { type: Boolean, default: false },
    recurrence: {
      pattern: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
      interval: { type: Number, default: 1 },
      daysOfWeek: [Number], // 0=Sun, 6=Sat
      endDate: Date,
      count: Number,
      nextDue: Date,
    },

    // ─── Reminder ─────────────────────────────────────────────────────────
    reminders: [
      {
        remindAt: Date,
        message: String,
        sent: { type: Boolean, default: false },
      },
    ],

    // ─── Order ────────────────────────────────────────────────────────────
    order: { type: Number, default: 0 }, // Position in column
    boardOrder: { type: Number, default: 0 },

    // ─── Grouping ─────────────────────────────────────────────────────────
    group: String,
    epicLink: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },

    // ─── Acceptance Criteria ──────────────────────────────────────────────
    acceptanceCriteria: [
      {
        criterion: String,
        isMet: { type: Boolean, default: false },
      },
    ],

    // ─── Soft Delete ──────────────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ─── Created by ───────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

taskSchema.index({ project: 1, isDeleted: 1 });
taskSchema.index({ sprint: 1, isDeleted: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ organization: 1 });
taskSchema.index({ parent: 1 });
taskSchema.index({ columnId: 1, order: 1 });
taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ createdAt: -1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

taskSchema.virtual('subtasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'parent',
});

taskSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'task',
});

taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() && this.status !== 'completed';
});

taskSchema.virtual('completionPercentage').get(function () {
  if (this.checklist.length === 0) return this.progress;
  const completed = this.checklist.filter((i) => i.isCompleted).length;
  return Math.round((completed / this.checklist.length) * 100);
});

// ─── Middleware ───────────────────────────────────────────────────────────────

// Update total logged hours when time logs change
taskSchema.pre('save', function (next) {
  if (this.isModified('timeLogs')) {
    this.totalLoggedHours = this.timeLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
  }
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
