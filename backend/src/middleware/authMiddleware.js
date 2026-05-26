/**
 * Authentication Middleware
 * @description JWT verification, role-based access control, and permission checks
 */

const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const { AuditLog } = require('../models');
const { AppError } = require('./errorMiddleware');
const logger = require('../config/logger');

// ─── JWT Token Generation ─────────────────────────────────────────────────────

/**
 * Generate access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      iss: 'projectflow',
      aud: 'projectflow-client',
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      type: 'refresh',
      iss: 'projectflow',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Send tokens as cookies and response.
 *
 * IMPORTANT: This only generates tokens and sets cookies / sends the JSON
 * response. It does NOT save the refresh token to the user's document.
 * The caller is responsible for saving the refresh token to the DB *before*
 * calling this, or passing { skipRefreshGenerate: true } and supplying
 * an already-persisted refreshToken.
 *
 * Options:
 *   existingRefreshToken – if provided, skip generating a new one (the
 *     login flow already generated & persisted one).
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success', options = {}) => {
  const accessToken = generateAccessToken(user._id);

  // If caller already generated & saved a refresh token, reuse it.
  // Otherwise generate a new one (register / resetPassword paths).
  let refreshToken;
  if (options.existingRefreshToken) {
    refreshToken = options.existingRefreshToken;
  } else {
    refreshToken = generateRefreshToken(user._id);

    // Persist the newly generated refresh token
    // Fire-and-forget; failures are logged but don't block the response.
    User.findByIdAndUpdate(user._id, {
      $push: {
        refreshTokens: {
          $each: [{
            token: refreshToken,
            device: 'register',
            ip: 'unknown',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }],
          $slice: -5,
        },
      },
    }).catch(err => logger.error('Failed to persist refresh token:', err));
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  // Access token cookie (15 minutes)
  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  // Refresh token cookie (7 days)
  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const userObj = user.toSafeObject ? user.toSafeObject() : user.toObject();

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: userObj,
      accessToken,
      refreshToken,
    },
  });
};

// ─── Protect Middleware ───────────────────────────────────────────────────────

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  return passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    if (err) {
      return next(new AppError('Authentication error', 500));
    }

    if (!user) {
      const message = info?.message || 'Authentication required. Please log in.';
      return next(new AppError(message, 401));
    }

    req.user = user;

    // Set organization context from header or user's organization
    const orgId = req.headers['x-organization-id'] || req.user.organization?._id;
    if (orgId) {
      req.organizationId = orgId;
    }

    next();
  })(req, res, next);
};

/**
 * Optionally authenticate (for public routes that benefit from auth context)
 */
const optionalAuth = async (req, res, next) => {
  return passport.authenticate('jwt', { session: false }, async (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

// ─── Role-Based Access Control ────────────────────────────────────────────────

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const hasRole = roles.some((role) => req.user.roles.includes(role));

    if (!hasRole) {
      return next(
        new AppError(
          `You don't have permission to perform this action. Required roles: ${roles.join(', ')}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Check specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Super admins bypass all permission checks
    if (req.user.roles.includes('super_admin')) {
      return next();
    }

    if (!req.user.hasPermission(permission)) {
      return next(
        new AppError(`You don't have the required permission: ${permission}`, 403)
      );
    }

    next();
  };
};

/**
 * Role hierarchy check
 */
const isAtLeast = (minimumRole) => {
  const hierarchy = {
    super_admin: 7,
    admin: 6,
    manager: 5,
    developer: 4,
    qa: 3,
    client: 2,
    viewer: 1,
  };

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userMaxLevel = Math.max(
      ...req.user.roles.map((r) => hierarchy[r] || 0)
    );

    if (userMaxLevel < (hierarchy[minimumRole] || 0)) {
      return next(
        new AppError(`Insufficient privileges. Minimum role required: ${minimumRole}`, 403)
      );
    }

    next();
  };
};

/**
 * Verify user owns the resource or has admin rights
 */
const isOwnerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      // Admins bypass ownership check
      if (req.user.hasRole('super_admin', 'admin')) {
        return next();
      }

      const ownerId = await getOwnerId(req);

      if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
        return next(
          new AppError("You don't have permission to modify this resource", 403)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Verify email is verified
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(
      new AppError('Please verify your email address to access this feature', 403)
    );
  }
  next();
};

// ─── Audit Logging Middleware ─────────────────────────────────────────────────

/**
 * Create audit log entry
 */
const createAuditLog = async (data) => {
  try {
    await AuditLog.create(data);
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
};

/**
 * Audit middleware factory
 */
const audit = (action, entity) => {
  return async (req, res, next) => {
    // Store original json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      if (data?.success) {
        createAuditLog({
          action,
          entity,
          entityId: data?.data?._id || req.params.id,
          entityName: data?.data?.name || data?.data?.title,
          user: req.user?._id,
          organization: req.organizationId || req.user?.organization?._id,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          description: `${action} ${entity}`,
          metadata: {
            method: req.method,
            path: req.path,
          },
        });
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
  requirePermission,
  isAtLeast,
  isOwnerOrAdmin,
  requireEmailVerified,
  generateAccessToken,
  generateRefreshToken,
  sendTokenResponse,
  createAuditLog,
  audit,
};
