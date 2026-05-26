/**
 * User Model
 * @description Enterprise user management with RBAC, audit trail, and security features
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    // ─── Basic Info ─────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    // ─── Auth ────────────────────────────────────────────────────────────
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: String,
    refreshTokens: [
      {
        token: String,
        device: String,
        ip: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],

    // ─── Email Verification ──────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // ─── Password Reset ──────────────────────────────────────────────────
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,

    // ─── Profile ─────────────────────────────────────────────────────────
    avatar: String,
    bio: { type: String, maxlength: 500 },
    phone: String,
    timezone: { type: String, default: 'UTC' },
    locale: { type: String, default: 'en' },
    department: String,
    designation: String,
    employeeId: String,

    // ─── Organization & Roles ────────────────────────────────────────────
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    roles: [
      {
        type: String,
        enum: ['super_admin', 'admin', 'manager', 'developer', 'qa', 'client', 'viewer'],
        default: 'developer',
      },
    ],
    customPermissions: [String], // Additional fine-grained permissions

    // ─── Status ──────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ─── Session & Security ──────────────────────────────────────────────
    lastLogin: Date,
    lastLoginIp: String,
    loginHistory: [
      {
        ip: String,
        userAgent: String,
        device: String,
        success: Boolean,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // ─── Notification Preferences ────────────────────────────────────────
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      inAppNotifications: { type: Boolean, default: true },
      taskAssignment: { type: Boolean, default: true },
      taskComments: { type: Boolean, default: true },
      sprintUpdates: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
      deadlineReminders: { type: Boolean, default: true },
      mentionAlerts: { type: Boolean, default: true },
    },

    // ─── UI Preferences ──────────────────────────────────────────────────
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      language: { type: String, default: 'en' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
      defaultView: { type: String, default: 'dashboard' },
    },

    // ─── MFA ─────────────────────────────────────────────────────────────
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaBackupCodes: [{ type: String, select: false }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

userSchema.index({ email: 1 });
userSchema.index({ organization: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ isActive: 1, isDeleted: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('primaryRole').get(function () {
  const roleHierarchy = ['super_admin', 'admin', 'manager', 'developer', 'qa', 'client', 'viewer'];
  for (const role of roleHierarchy) {
    if (this.roles.includes(role)) return role;
  }
  return this.roles[0] || 'viewer';
});

// ─── Middleware ───────────────────────────────────────────────────────────────

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compare provided password with hashed password
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if password changed after JWT was issued
 */
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Generate password reset token
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

/**
 * Generate email verification token
 */
userSchema.methods.createEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

/**
 * Check if user has a specific role
 */
userSchema.methods.hasRole = function (...roles) {
  return roles.some((role) => this.roles.includes(role));
};

/**
 * Check if user has a specific permission
 */
userSchema.methods.hasPermission = function (permission) {
  return this.customPermissions?.includes(permission);
};

/**
 * Increment failed login attempts
 */
userSchema.methods.incrementLoginAttempts = async function () {
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours
  const MAX_ATTEMPTS = 5;

  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };
  if (this.failedLoginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Find active, non-deleted users
 */
userSchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, isActive: true, isDeleted: false });
};

// ─── Sanitize output ──────────────────────────────────────────────────────────

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.mfaSecret;
  delete obj.mfaBackupCodes;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
