/**
 * MongoDB Database Configuration
 * @description Mongoose connection with retry logic and event handlers
 */

const mongoose = require('mongoose');
const logger = require('./logger');

let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

  if (!mongoUri) {
    throw new Error('MongoDB URI is not defined in environment variables');
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  try {
    const conn = await mongoose.connect(mongoUri, options);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    retryCount = 0;
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      logger.info(`Retrying connection (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return connectDB();
    }

    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
  }
};

// Mongoose event handlers
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

// Close connection on app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('Mongoose connection closed due to app termination');
  process.exit(0);
});

module.exports = { connectDB, mongoose };
