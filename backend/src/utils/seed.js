/**
 * Database Seed Script
 * Usage: NODE_ENV=development node src/utils/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/database');
const logger = require('../config/logger');

// Import models from their individual files (User, Organization, Project, Task
// are standalone files; Sprint is in models/index.js along with other models)
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { Sprint, Story, Comment, Notification, AuditLog, Feedback } = require('../models');

const SEED_DATA = {
  organization: {
    name: 'Acme Corporation',
    slug: 'acme-corp',
    description: 'Demo organization for ProjectFlow',
    plan: 'enterprise',
  },
  users: [
    { firstName: 'Super', lastName: 'Admin', email: 'superadmin@projectflow.dev', password: 'Admin@1234', roles: ['super-admin'], isVerified: true },
    { firstName: 'Alice', lastName: 'Manager', email: 'alice@projectflow.dev', password: 'Admin@1234', roles: ['admin', 'manager'], isVerified: true },
    { firstName: 'Bob', lastName: 'Developer', email: 'bob@projectflow.dev', password: 'Admin@1234', roles: ['developer'], isVerified: true },
    { firstName: 'Carol', lastName: 'QA', email: 'carol@projectflow.dev', password: 'Admin@1234', roles: ['qa'], isVerified: true },
    { firstName: 'David', lastName: 'Client', email: 'client@projectflow.dev', password: 'Admin@1234', roles: ['client'], isVerified: true },
  ],
  projects: [
    { name: 'Website Redesign', key: 'WEB', description: 'Complete overhaul of the company website', priority: 'high', status: 'active' },
    { name: 'Mobile App', key: 'MOB', description: 'Native mobile application for iOS and Android', priority: 'critical', status: 'active' },
    { name: 'API Integration', key: 'API', description: 'Third-party API integrations', priority: 'medium', status: 'planning' },
  ],
};

async function seed() {
  logger.info('Starting database seed...');
  await connectDB();

  // Confirm non-production
  if (process.env.NODE_ENV === 'production') {
    logger.error('Seed script cannot run in production!');
    process.exit(1);
  }

  try {
    // Clean existing data
    logger.info('Cleaning existing data...');
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Sprint.deleteMany({}),
      Story.deleteMany({}),
      Comment.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      Feedback.deleteMany({}),
    ]);

    // Create organization
    logger.info('Creating organization...');
    const org = await Organization.create(SEED_DATA.organization);

    // Create users
    logger.info('Creating users...');
    const createdUsers = [];
    for (const userData of SEED_DATA.users) {
      const hashedPw = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPw,
        organization: org._id,
        roles: userData.roles,
        isActive: true,
        isEmailVerified: true,
      });
      createdUsers.push(user);

      // Add to org members
      if (!org.members) org.members = [];
      org.members.push({ user: user._id, role: userData.roles[0] });
    }
    await org.save();

    const [superAdmin, alice, bob, carol] = createdUsers;

    // Create projects
    logger.info('Creating projects...');
    const createdProjects = [];
    for (const projData of SEED_DATA.projects) {
      const proj = await Project.create({
        ...projData,
        organization: org._id,
        owner: alice._id,
        members: [
          { user: alice._id, role: 'owner' },
          { user: bob._id, role: 'developer' },
          { user: carol._id, role: 'qa' },
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
      createdProjects.push(proj);
    }

    const [webProject] = createdProjects;

    // Create sprint for first project
    logger.info('Creating sprints...');
    const sprint = await Sprint.create({
      name: 'Sprint 1',
      goal: 'Complete homepage and navigation',
      project: webProject._id,
      organization: org._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'active',
      capacity: 40,
      createdBy: alice._id,
    });

    // Create tasks
    logger.info('Creating tasks...');
    const TASKS = [
      { title: 'Design homepage mockup', status: 'completed', priority: 'high', assignee: bob._id },
      { title: 'Implement hero section', status: 'in-progress', priority: 'high', assignee: bob._id },
      { title: 'Write unit tests for auth', status: 'todo', priority: 'medium', assignee: carol._id },
      { title: 'Set up CI/CD pipeline', status: 'in-review', priority: 'critical', assignee: alice._id },
      { title: 'Database optimization', status: 'pending', priority: 'medium', assignee: bob._id },
      { title: 'API documentation', status: 'todo', priority: 'low', assignee: bob._id },
      { title: 'Performance testing', status: 'todo', priority: 'high', assignee: carol._id },
      { title: 'Security audit', status: 'todo', priority: 'critical', assignee: alice._id },
    ];

    let taskNum = 1;
    for (const taskData of TASKS) {
      await Task.create({
        ...taskData,
        taskKey: `${webProject.key}-${taskNum}`,
        project: webProject._id,
        organization: org._id,
        sprint: taskNum <= 5 ? sprint._id : undefined,
        owner: alice._id,
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        estimatedHours: Math.floor(Math.random() * 8) + 2,
        storyPoints: [1, 2, 3, 5, 8][Math.floor(Math.random() * 5)],
        createdBy: alice._id,
      });
      taskNum++;
    }

    logger.info('');
    logger.info('✅ Seed completed successfully!');
    logger.info('─────────────────────────────────');
    logger.info('Demo Accounts:');
    SEED_DATA.users.forEach(u =>
      logger.info(`  ${u.roles[0].padEnd(12)} → ${u.email} / ${u.password}`)
    );
    logger.info('─────────────────────────────────');

    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
