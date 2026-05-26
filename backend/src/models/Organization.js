/**
 * Organization Model
 * @description Multi-tenant organization management
 */

const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, maxlength: 1000 },
    logo: String,
    website: String,
    industry: String,
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Contact
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },

    // Subscription
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    planExpiry: Date,
    maxUsers: { type: Number, default: 5 },
    maxProjects: { type: Number, default: 3 },

    // Settings
    settings: {
      allowGuestAccess: { type: Boolean, default: false },
      requireEmailVerification: { type: Boolean, default: true },
      defaultRole: {
        type: String,
        enum: ['developer', 'qa', 'client', 'viewer'],
        default: 'developer',
      },
      timezone: { type: String, default: 'UTC' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
      workingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5], // Mon-Fri
      },
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      allowedDomains: [String], // For SSO domain restriction
    },

    // Branding
    branding: {
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#0ea5e9' },
      logo: String,
      favicon: String,
    },

    // SMTP settings for this org
    smtp: {
      host: String,
      port: Number,
      user: String,
      password: { type: String, select: false },
      fromName: String,
      fromEmail: String,
      isCustom: { type: Boolean, default: false },
    },

    // Status
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    // Analytics
    stats: {
      totalUsers: { type: Number, default: 0 },
      totalProjects: { type: Number, default: 0 },
      totalTasks: { type: Number, default: 0 },
      storageUsed: { type: Number, default: 0 }, // bytes
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ isActive: 1, isDeleted: 1 });

// ─── Middleware ───────────────────────────────────────────────────────────────

organizationSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
