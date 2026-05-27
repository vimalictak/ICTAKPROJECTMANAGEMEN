#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const readline = require('readline');
const { connectDB, mongoose } = require('../src/config/database');

const Task = require('../src/models/Task');
const Project = require('../src/models/Project');
const Organization = require('../src/models/Organization');
const { Sprint, Story, Comment, Notification, AuditLog, Feedback, FeedbackForm } = require('../src/models');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a)));

async function run() {
  console.log('Cleanup script — will remove Projects, Sprints, Stories, Tasks, Feedback and related data.');

  const skipConfirm = process.argv.includes('--yes') || process.env.FORCE === 'true';

  if (!skipConfirm) {
    console.log('\nThis operation is destructive and irreversible.');
    const answer = await ask("Type 'DELETE' to confirm: ");
    if (answer !== 'DELETE') {
      console.log('Confirmation failed — aborting.');
      process.exit(1);
    }
  }

  try {
    await connectDB();

    const results = {};

    // Order matters: remove child entities first
    results.comments = (await Comment.deleteMany({})).deletedCount || 0;
    results.feedback = (await Feedback.deleteMany({})).deletedCount || 0;
    results.feedbackForms = (await FeedbackForm.deleteMany({})).deletedCount || 0;
    results.tasks = (await Task.deleteMany({})).deletedCount || 0;
    results.stories = (await Story.deleteMany({})).deletedCount || 0;
    results.sprints = (await Sprint.deleteMany({})).deletedCount || 0;
    results.notifications = (await Notification.deleteMany({})).deletedCount || 0;
    results.auditLogs = (await AuditLog.deleteMany({})).deletedCount || 0;
    results.projects = (await Project.deleteMany({})).deletedCount || 0;

    // Optionally remove organizations
    // results.organizations = (await Organization.deleteMany({})).deletedCount || 0;

    console.log('\nDeletion summary:');
    Object.entries(results).forEach(([k, v]) => console.log(`- ${k}: ${v}`));

    console.log('\nDone. Closing DB connection.');
    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    await mongoose.connection.close();
    rl.close();
    process.exit(2);
  }
}

run();
