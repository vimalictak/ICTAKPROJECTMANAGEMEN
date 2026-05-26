/**
 * Socket.IO Server
 * @description Real-time communication for kanban, notifications, and collaboration
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const notificationService = require('./services/notificationService');
const logger = require('./config/logger');

let io;

/**
 * Get the Socket.IO instance
 */
const getIO = () => io;

/**
 * Initialize Socket.IO server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000',
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Set IO in notification service
  notificationService.setIO(io);

  // ─── Authentication Middleware ────────────────────────────────────────────

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select('name avatar email roles organization isActive')
        .lean();

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      logger.warn('Socket auth failed:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────────────────

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: ${userId} (${socket.id})`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Join organization room if user has one
    if (socket.user.organization) {
      socket.join(`org:${socket.user.organization}`);
    }

    // ─── Project Room Management ──────────────────────────────────────────

    socket.on('join:project', (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
        logger.debug(`User ${userId} joined project:${projectId}`);
      }
    });

    socket.on('leave:project', (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    // ─── Sprint Room Management ───────────────────────────────────────────

    socket.on('join:sprint', (sprintId) => {
      if (sprintId) {
        socket.join(`sprint:${sprintId}`);
      }
    });

    socket.on('leave:sprint', (sprintId) => {
      if (sprintId) {
        socket.leave(`sprint:${sprintId}`);
      }
    });

    // ─── Task Events (Kanban) ─────────────────────────────────────────────

    // Optimistic kanban drag-drop sync
    socket.on('task:drag-start', ({ taskId, projectId }) => {
      socket.to(`project:${projectId}`).emit('task:drag-start', { taskId, userId });
    });

    socket.on('task:drag-end', ({ taskId, projectId }) => {
      socket.to(`project:${projectId}`).emit('task:drag-end', { taskId });
    });

    // User is typing a comment
    socket.on('comment:typing', ({ taskId }) => {
      socket.to(`task:${taskId}`).emit('comment:typing', {
        userId,
        user: { name: socket.user.name, avatar: socket.user.avatar },
      });
    });

    socket.on('join:task', (taskId) => {
      if (taskId) socket.join(`task:${taskId}`);
    });

    socket.on('leave:task', (taskId) => {
      if (taskId) socket.leave(`task:${taskId}`);
    });

    // ─── Presence ─────────────────────────────────────────────────────────

    socket.on('presence:update', ({ projectId, status }) => {
      if (projectId) {
        socket.to(`project:${projectId}`).emit('presence:update', {
          userId,
          user: { name: socket.user.name, avatar: socket.user.avatar },
          status: status || 'online',
        });
      }
    });

    // ─── Notifications ────────────────────────────────────────────────────

    socket.on('notification:read', async ({ notificationIds }) => {
      try {
        await notificationService.markAsRead(userId, notificationIds);
      } catch (error) {
        logger.error('Error marking notifications read:', error);
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${userId} (reason: ${reason})`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
};

/**
 * Emit event to all project members
 */
const emitToProject = (projectId, event, data) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
};

/**
 * Emit event to specific user
 */
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit event to organization
 */
const emitToOrg = (orgId, event, data) => {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToProject,
  emitToUser,
  emitToOrg,
};
