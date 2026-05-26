/**
 * Sprint Model
 */

const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    goal: { type: String, maxlength: 1000 },
    description: { type: String, maxlength: 5000 },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'cancelled'],
      default: 'planning',
    },
    capacity: { type: Number, default: 0 }, // Story points
    velocity: { type: Number, default: 0 }, // Actual velocity
    sprintNumber: { type: Number, default: 1 },

    // Retrospective
    retrospective: {
      whatWentWell: String,
      whatCouldBeImproved: String,
      actionItems: [String],
      completedAt: Date,
    },

    // Metrics
    metrics: {
      plannedStoryPoints: { type: Number, default: 0 },
      completedStoryPoints: { type: Number, default: 0 },
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      addedDuringSprintTasks: { type: Number, default: 0 },
      removedFromSprintTasks: { type: Number, default: 0 },
    },

    // Burndown data
    burndownData: [
      {
        date: Date,
        remaining: Number,
        ideal: Number,
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

sprintSchema.index({ project: 1, status: 1 });
sprintSchema.index({ organization: 1 });
sprintSchema.index({ startDate: 1, endDate: 1 });

const Sprint = mongoose.model('Sprint', sprintSchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Story Model (Epic/User Story)
 */

const storySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Story title is required'],
      trim: true,
      maxlength: [500, 'Title cannot exceed 500 characters'],
    },
    description: { type: String, maxlength: 50000 },
    acceptanceCriteria: [
      {
        criterion: String,
        isMet: { type: Boolean, default: false },
      },
    ],
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['backlog', 'ready', 'in_progress', 'done', 'archived'],
      default: 'backlog',
    },
    storyPoints: { type: Number, min: 0 },
    labels: [String],
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
    dependencies: [
      {
        story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
        type: { type: String, enum: ['blocks', 'is_blocked_by', 'relates_to'] },
      },
    ],
    // Source feedback if converted from feedback
    sourceFeedback: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

storySchema.index({ project: 1, isDeleted: 1 });
storySchema.index({ sprint: 1 });
storySchema.index({ status: 1 });

const Story = mongoose.model('Story', storySchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comment Model
 */

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [10000, 'Comment cannot exceed 10000 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, // For replies

    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attachments: [
      {
        name: String,
        url: String,
        size: Number,
        mimeType: String,
      },
    ],

    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
      },
    ],

    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

commentSchema.index({ task: 1, isDeleted: 1 });
commentSchema.index({ story: 1 });
commentSchema.index({ author: 1 });

const Comment = mongoose.model('Comment', commentSchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notification Model
 */

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'task_updated',
        'task_completed',
        'task_commented',
        'task_mentioned',
        'sprint_started',
        'sprint_ending',
        'sprint_completed',
        'project_updated',
        'project_member_added',
        'deadline_approaching',
        'feedback_submitted',
        'feedback_status_changed',
        'story_assigned',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String, // Frontend route
    data: mongoose.Schema.Types.Mixed, // Additional context data

    isRead: { type: Boolean, default: false },
    readAt: Date,
    isEmailSent: { type: Boolean, default: false },
    emailSentAt: Date,

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AuditLog Model
 */

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'create', 'update', 'delete', 'restore',
        'login', 'logout', 'login_failed',
        'role_assigned', 'role_removed',
        'status_changed', 'password_changed', 'password_reset',
        'email_verified', 'file_uploaded', 'file_deleted',
        'member_added', 'member_removed',
        'sprint_started', 'sprint_completed',
        'task_assigned', 'task_completed',
      ],
    },
    entity: {
      type: String,
      enum: [
        'user', 'organization', 'project', 'task',
        'sprint', 'story', 'comment', 'file', 'notification',
        'feedback', 'settings',
      ],
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String,

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],

    ipAddress: String,
    userAgent: String,
    device: String,

    description: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
// Auto-delete audit logs after 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Feedback Model (Client Feedback System)
 */

const feedbackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 500 },
    description: { type: String, maxlength: 50000 },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'accepted', 'rejected', 'converted', 'completed'],
      default: 'submitted',
    },
    category: {
      type: String,
      enum: ['bug', 'feature_request', 'improvement', 'question', 'other'],
      default: 'other',
    },
    attachments: [
      {
        name: String,
        url: String,
        size: Number,
        mimeType: String,
      },
    ],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,

    // If converted to story
    convertedToStory: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    convertedAt: Date,
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Form-based submission
    formId: String,
    customFields: [
      {
        label: String,
        value: mongoose.Schema.Types.Mixed,
      },
    ],

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

feedbackSchema.index({ project: 1, status: 1 });
feedbackSchema.index({ submittedBy: 1 });
feedbackSchema.index({ organization: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = { Sprint, Story, Comment, Notification, AuditLog, Feedback };
