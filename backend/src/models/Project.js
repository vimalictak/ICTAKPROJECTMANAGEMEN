/**
 * Project Model
 * @description Full-featured project management schema
 */

const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'missed'],
    default: 'pending',
  },
  completedAt: Date,
});

const customFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url'],
    required: true,
  },
  options: [String], // For select/multiselect
  value: mongoose.Schema.Types.Mixed,
  isRequired: { type: Boolean, default: false },
});

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    key: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 10,
    },
    description: { type: String, maxlength: 5000 },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    // Ownership & Team
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['owner', 'admin', 'manager', 'developer', 'qa', 'client', 'viewer'],
          default: 'developer',
        },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Client
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clientName: String,

    // Dates
    startDate: Date,
    endDate: Date,
    financialYear: String,

    // Classification
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'],
      default: 'planning',
    },
    category: String,
    tags: [String],

    // Visibility
    visibility: {
      type: String,
      enum: ['private', 'team', 'organization', 'public'],
      default: 'team',
    },

    // Financial
    budget: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      spent: { type: Number, default: 0 },
    },

    // Kanban Configuration
    boardColumns: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        color: { type: String, default: '#6366f1' },
        order: { type: Number, default: 0 },
        wipLimit: { type: Number, default: 0 }, // 0 = unlimited
        isDefault: { type: Boolean, default: false },
        isDone: { type: Boolean, default: false },
      },
    ],

    // Features
    milestones: [milestoneSchema],
    customFields: [customFieldSchema],
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

    // Template
    isTemplate: { type: Boolean, default: false },
    templateFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    // Metrics
    metrics: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      totalSprints: { type: Number, default: 0 },
      activeSprints: { type: Number, default: 0 },
      totalStoryPoints: { type: Number, default: 0 },
      completedStoryPoints: { type: Number, default: 0 },
      totalHoursEstimated: { type: Number, default: 0 },
      totalHoursLogged: { type: Number, default: 0 },
    },

    // Workflow Settings
    workflow: {
      sprintsEnabled: { type: Boolean, default: true },
      storiesEnabled: { type: Boolean, default: true },
      timeTrackingEnabled: { type: Boolean, default: true },
      estimationUnit: {
        type: String,
        enum: ['story_points', 'hours', 'days'],
        default: 'story_points',
      },
    },

    // Soft Delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    isArchived: { type: Boolean, default: false },
    archivedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

projectSchema.index({ organization: 1, isDeleted: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

projectSchema.virtual('completionPercentage').get(function () {
  if (this.metrics.totalTasks === 0) return 0;
  return Math.round((this.metrics.completedTasks / this.metrics.totalTasks) * 100);
});

projectSchema.virtual('isOverdue').get(function () {
  if (!this.endDate) return false;
  return this.endDate < new Date() && this.status !== 'completed';
});

// ─── Middleware ───────────────────────────────────────────────────────────────

projectSchema.pre('save', function (next) {
  // Auto-generate project key from name
  if (this.isNew && !this.key) {
    this.key = this.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .substring(0, 6) || 'PROJ';
  }

  // Set default Kanban columns for new projects
  if (this.isNew && this.boardColumns.length === 0) {
    this.boardColumns = [
      { id: 'todo', name: 'To Do', color: '#94a3b8', order: 0, isDefault: true },
      { id: 'pending', name: 'Pending', color: '#f59e0b', order: 1 },
      { id: 'in_progress', name: 'In Progress', color: '#6366f1', order: 2 },
      { id: 'in_review', name: 'In Review', color: '#8b5cf6', order: 3 },
      { id: 'completed', name: 'Completed', color: '#22c55e', order: 4, isDone: true },
    ];
  }

  next();
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
