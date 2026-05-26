/**
 * Swagger API Documentation Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ProjectFlow Enterprise API',
      version: '1.0.0',
      description: 'Enterprise Project Management API - Complete REST API documentation',
      contact: {
        name: 'ProjectFlow Support',
        email: 'support@projectflow.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api/v1`,
        description: 'Development Server',
      },
      {
        url: 'https://api.projectflow.com/api/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Organizations', description: 'Organization management' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Tasks', description: 'Task management' },
      { name: 'Sprints', description: 'Sprint management' },
      { name: 'Stories', description: 'Story management' },
      { name: 'Comments', description: 'Comments' },
      { name: 'Notifications', description: 'Notification system' },
      { name: 'Reports', description: 'Reports and analytics' },
      { name: 'Feedback', description: 'Client feedback system' },
      { name: 'Audit', description: 'Audit logs' },
      { name: 'Search', description: 'Global search' },
      { name: 'Files', description: 'File management' },
    ],
  },
  apis: [
    `${__dirname}/../routes/*.js`,
    `${__dirname}/../models/*.js`,
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
