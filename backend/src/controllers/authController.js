/**
 * Authentication Controller
 * @description Handles all authentication operations
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AuditLog, Notification } = require('../models');
const { catchAsync } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');
const {
  generateAccessToken,
  generateRefreshToken,
  sendTokenResponse,
  createAuditLog,
} = require('../middleware/authMiddleware');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, password, organizationId } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered. Please use a different email or login.', 409));
  }

  // Create user
  const user = await User.create({
    name: name?.trim() || 'User',
    email,
    password,
    organization: organizationId,
    roles: Array.isArray(req.body.roles) && req.body.roles.length > 0 ? req.body.roles : ['developer'],
    isActive: true,
  });

  // Generate email verification token
  if (user.createEmailVerificationToken) {
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    try {
      await emailService.sendEmailVerification(user, verificationToken);
    } catch (error) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error('Failed to send verification email:', error);
    }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    entity: 'user',
    entityId: user._id,
    entityName: `${user.firstName} ${user.lastName}`,
    user: user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    description: 'User registered',
  });

  // sendTokenResponse will generate & persist the refresh token automatically
  sendTokenResponse(user, 201, res, 'Registration successful. Please verify your email.');
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email, isDeleted: false }).select('+password +refreshTokens');

  if (!user || !(await user.comparePassword(password))) {
    // Track failed attempts
    if (user && user.incrementLoginAttempts) {
      await user.incrementLoginAttempts();
    }

    await createAuditLog({
      action: 'login_failed',
      entity: 'user',
      entityName: email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Failed login attempt for ${email}`,
    });

    return next(new AppError('Invalid email or password', 401));
  }

  // Check if account is locked
  if (user.isLocked) {
    return next(new AppError('Account is temporarily locked due to too many failed attempts. Please try again later.', 423));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact your administrator.', 403));
  }

  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }

  // Update last login
  user.lastLogin = new Date();
  user.lastLoginIp = req.ip;

  // Add to login history (keep last 20)
  if (!user.loginHistory) user.loginHistory = [];
  user.loginHistory = [
    {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      device: req.get('User-Agent'),
      success: true,
      timestamp: new Date(),
    },
    ...user.loginHistory.slice(0, 19),
  ];

  // Generate refresh token and save it to the user's document
  const refreshToken = generateRefreshToken(user._id);

  // Remove expired tokens, keep at most 4 old ones, add the new one
  const validTokens = (user.refreshTokens || [])
    .filter((t) => t.expiresAt > new Date())
    .slice(0, 4);

  user.refreshTokens = [
    {
      token: refreshToken,
      device: req.get('User-Agent'),
      ip: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    ...validTokens,
  ];

  await user.save({ validateBeforeSave: false });

  // Audit log
  await createAuditLog({
    action: 'login',
    entity: 'user',
    entityId: user._id,
    entityName: `${user.firstName} ${user.lastName}`,
    user: user._id,
    organization: user.organization,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    description: 'User logged in',
  });

  // Pass the already-persisted refresh token so sendTokenResponse
  // does NOT generate a second one.
  sendTokenResponse(user, 200, res, 'Login successful', {
    existingRefreshToken: refreshToken,
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

  if (refreshToken && req.user) {
    // Remove specific refresh token
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: { token: refreshToken } },
    });
  }

  // Clear cookies
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });

  // Audit log
  await createAuditLog({
    action: 'logout',
    entity: 'user',
    entityId: req.user?._id,
    entityName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'unknown',
    user: req.user?._id,
    ipAddress: req.ip,
    description: 'User logged out',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
const refreshTokenHandler = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;

  if (!token) {
    return next(new AppError('Refresh token not provided', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');

  if (!user || !user.isActive) {
    return next(new AppError('User not found or inactive', 401));
  }

  // Verify token exists in database (token rotation)
  const tokenExists = (user.refreshTokens || []).some(
    (t) => t.token === token && t.expiresAt > new Date()
  );

  if (!tokenExists) {
    // Potential token reuse - invalidate all tokens
    await User.findByIdAndUpdate(user._id, { $set: { refreshTokens: [] } });
    return next(new AppError('Token reuse detected. Please log in again.', 401));
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  // Rotate refresh token: remove old, add new
  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { token } },
  });
  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        $each: [{
          token: newRefreshToken,
          device: req.get('User-Agent'),
          ip: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }],
        $slice: -5,
      },
    },
  });

  // Set new cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  res.cookie('access_token', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('organization', 'name slug logo plan settings branding');

  res.status(200).json({
    success: true,
    data: user?.toSafeObject ? user.toSafeObject() : user,
  });
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email, isDeleted: false });

  if (!user) {
    // Don't reveal whether user exists
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordReset(user, resetToken);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Failed to send password reset email. Please try again.', 500));
  }

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

/**
 * @desc    Reset password
 * @route   PATCH /api/v1/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Password reset token is invalid or has expired', 400));
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Invalidate all sessions
  await user.save();

  await createAuditLog({
    action: 'password_reset',
    entity: 'user',
    entityId: user._id,
    entityName: `${user.firstName} ${user.lastName}`,
    user: user._id,
    ipAddress: req.ip,
    description: 'Password reset',
  });

  sendTokenResponse(user, 200, res, 'Password reset successful');
});

/**
 * @desc    Verify email
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Verification token is invalid or has expired', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  await createAuditLog({
    action: 'email_verified',
    entity: 'user',
    entityId: user._id,
    entityName: `${user.firstName} ${user.lastName}`,
    user: user._id,
    ipAddress: req.ip,
    description: 'Email verified',
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

/**
 * @desc    Change password
 * @route   PATCH /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = newPassword;
  user.refreshTokens = []; // Invalidate all other sessions
  await user.save();

  await createAuditLog({
    action: 'password_changed',
    entity: 'user',
    entityId: user._id,
    user: user._id,
    ipAddress: req.ip,
    description: 'Password changed',
  });

  sendTokenResponse(user, 200, res, 'Password changed successfully');
});

/**
 * @desc    Google OAuth callback handler
 */
const googleCallback = catchAsync(async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.redirect(`${process.env.CLIENT_URL || process.env.FRONTEND_URL}/login?error=google_auth_failed`);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to DB
  await User.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        $each: [{
          token: refreshToken,
          device: req.get('User-Agent'),
          ip: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }],
        $slice: -5,
      },
    },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  // Redirect to frontend
  res.redirect(`${process.env.CLIENT_URL || process.env.FRONTEND_URL}/dashboard`);
});

module.exports = {
  register,
  login,
  logout,
  refreshToken: refreshTokenHandler,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
  googleCallback,
};
