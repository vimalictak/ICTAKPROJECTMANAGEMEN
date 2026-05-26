/**
 * ProjectFlow Enterprise - Main Server Entry Point
 * @description Express.js server with Socket.IO integration
 */

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { initSocket } = require('./socket');
const logger = require('./config/logger');
const { startJobs } = require('./jobs');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected');

    // Initialize job scheduler
    startJobs();
    logger.info('✅ Job scheduler initialized');

    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = server;
