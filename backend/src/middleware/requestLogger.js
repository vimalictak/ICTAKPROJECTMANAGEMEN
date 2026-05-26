/**
 * Request Logger Middleware
 */

const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.user?._id,
      userAgent: req.get('User-Agent'),
    };

    if (res.statusCode >= 500) {
      logger.error('Request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request', logData);
    } else {
      logger.info('Request', logData);
    }
  });

  next();
};

module.exports = requestLogger;
