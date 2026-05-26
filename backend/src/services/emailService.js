/**
 * Email Service
 * @description Nodemailer-based email service with templates
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  getBaseTemplate(content, title) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px 40px; text-align: center; }
          .header img { height: 36px; margin-bottom: 12px; }
          .header h1 { color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 4px; }
          .content { padding: 40px; }
          .content h2 { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
          .content p { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
          .btn { display: inline-block; padding: 14px 28px; background: #6366f1; color: white !important; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 8px 0; }
          .btn:hover { background: #4f46e5; }
          .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
          .footer { background: #f8fafc; padding: 24px 40px; text-align: center; font-size: 13px; color: #94a3b8; }
          .footer a { color: #6366f1; text-decoration: none; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
          .badge-high { background: #fee2e2; color: #dc2626; }
          .badge-medium { background: #fef3c7; color: #d97706; }
          .badge-low { background: #dcfce7; color: #16a34a; }
          .task-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .meta { font-size: 13px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ProjectFlow Enterprise</h1>
            <p>Project Management Platform</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>This email was sent by <a href="${process.env.APP_URL}">ProjectFlow Enterprise</a></p>
            <p>© ${new Date().getFullYear()} ProjectFlow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendEmail({ to, subject, html, text }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP not configured, skipping email:', subject);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'ProjectFlow'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || subject,
      });

      logger.info(`Email sent: ${info.messageId} to ${to}`);
      return info;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  async sendEmailVerification(user, token) {
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email/${token}`;

    const content = `
      <h2>Verify Your Email Address</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Welcome to ProjectFlow Enterprise! Please verify your email address to get started.</p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      </div>
      <div class="divider"></div>
      <p class="meta">If you didn't create an account, you can safely ignore this email.</p>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Verify your ProjectFlow account',
      html: this.getBaseTemplate(content, 'Verify Email'),
    });
  }

  async sendPasswordReset(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${token}`;

    const content = `
      <h2>Reset Your Password</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>
      <p>This link expires in <strong>10 minutes</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <div class="divider"></div>
      <p class="meta">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Reset your ProjectFlow password',
      html: this.getBaseTemplate(content, 'Reset Password'),
    });
  }

  async sendTaskAssignment(user, task, assignedBy) {
    const taskUrl = `${process.env.FRONTEND_URL}/tasks/${task._id}`;

    const content = `
      <h2>New Task Assigned to You</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p><strong>${assignedBy.name}</strong> has assigned a task to you.</p>
      <div class="task-card">
        <p style="font-weight: 600; margin-bottom: 8px;">${task.title}</p>
        ${task.description ? `<p class="meta">${task.description.substring(0, 200)}${task.description.length > 200 ? '...' : ''}</p>` : ''}
        <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
          <span class="badge badge-${task.priority === 'high' || task.priority === 'critical' ? 'high' : task.priority === 'medium' ? 'medium' : 'low'}">${task.priority?.toUpperCase()}</span>
          ${task.dueDate ? `<span class="meta">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
        </div>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${taskUrl}" class="btn">View Task</a>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: `Task assigned: ${task.title}`,
      html: this.getBaseTemplate(content, 'Task Assigned'),
    });
  }

  async sendDeadlineReminder(user, task) {
    const taskUrl = `${process.env.FRONTEND_URL}/tasks/${task._id}`;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    const content = `
      <h2>Task Deadline Reminder</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>This is a reminder that the following task is due ${daysUntilDue <= 0 ? '<strong>today</strong>' : `in <strong>${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</strong>`}.</p>
      <div class="task-card">
        <p style="font-weight: 600; margin-bottom: 8px;">${task.title}</p>
        <p class="meta">Due: ${dueDate.toLocaleDateString()} • Progress: ${task.progress || 0}%</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${taskUrl}" class="btn">View Task</a>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: `Deadline reminder: ${task.title}`,
      html: this.getBaseTemplate(content, 'Deadline Reminder'),
    });
  }

  async sendSprintNotification(user, sprint, eventType) {
    const sprintUrl = `${process.env.FRONTEND_URL}/sprints/${sprint._id}`;
    const titles = {
      started: 'Sprint Started',
      ending_soon: 'Sprint Ending Soon',
      completed: 'Sprint Completed',
    };

    const messages = {
      started: `Sprint <strong>${sprint.name}</strong> has started! The team has ${Math.ceil((new Date(sprint.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days to complete the sprint.`,
      ending_soon: `Sprint <strong>${sprint.name}</strong> is ending in 2 days. Make sure to complete your assigned tasks.`,
      completed: `Sprint <strong>${sprint.name}</strong> has been completed successfully!`,
    };

    const content = `
      <h2>${titles[eventType] || 'Sprint Update'}</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>${messages[eventType] || ''}</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${sprintUrl}" class="btn">View Sprint</a>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: `${titles[eventType]}: ${sprint.name}`,
      html: this.getBaseTemplate(content, titles[eventType]),
    });
  }

  async sendMentionNotification(user, comment, task, mentionedBy) {
    const taskUrl = `${process.env.FRONTEND_URL}/tasks/${task._id}`;

    const content = `
      <h2>You Were Mentioned</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p><strong>${mentionedBy.name}</strong> mentioned you in a comment on <strong>${task.title}</strong>.</p>
      <div class="task-card">
        <p class="meta">"${comment.content.substring(0, 300)}${comment.content.length > 300 ? '...' : ''}"</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${taskUrl}" class="btn">View Comment</a>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: `${mentionedBy.name} mentioned you in a comment`,
      html: this.getBaseTemplate(content, 'Mention Notification'),
    });
  }

  async sendWelcomeEmail(user, organization) {
    const loginUrl = `${process.env.FRONTEND_URL}/auth/login`;

    const content = `
      <h2>Welcome to ProjectFlow Enterprise! 🎉</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>You've been added to <strong>${organization?.name || 'ProjectFlow Enterprise'}</strong>. You can now log in and start collaborating with your team.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" class="btn">Log In to ProjectFlow</a>
      </div>
      <div class="divider"></div>
      <p>ProjectFlow Enterprise helps your team:</p>
      <ul style="margin: 12px 0 12px 20px; color: #475569;">
        <li>Manage projects with Kanban boards</li>
        <li>Track sprints and backlogs</li>
        <li>Collaborate in real-time</li>
        <li>Generate insightful reports</li>
      </ul>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Welcome to ProjectFlow Enterprise',
      html: this.getBaseTemplate(content, 'Welcome'),
    });
  }
}

module.exports = new EmailService();
