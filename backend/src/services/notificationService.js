/**
 * Notification Service
 * @description Creates in-app and email notifications with real-time socket delivery
 */

const { Notification } = require('../models');
const emailService = require('./emailService');
const logger = require('../config/logger');

let io;

const setIO = (socketIO) => {
  io = socketIO;
};

/**
 * Create and deliver a notification
 */
const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  link,
  data,
  organization,
  sendEmail = false,
  emailFn = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      link,
      data,
      organization,
    });

    // Populate for socket emit
    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name avatar')
      .lean();

    // Real-time delivery via Socket.IO
    if (io) {
      io.to(`user:${recipient}`).emit('notification:new', populated);
    }

    // Email notification
    if (sendEmail && emailFn) {
      try {
        await emailFn();
        await Notification.findByIdAndUpdate(notification._id, {
          isEmailSent: true,
          emailSentAt: new Date(),
        });
      } catch (emailError) {
        logger.error('Email notification failed:', emailError);
      }
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
  }
};

/**
 * Notify task assignees
 */
const notifyTaskAssignment = async (task, assignedBy) => {
  const assignees = task.assignees || [];

  for (const assignee of assignees) {
    const recipientId = assignee._id || assignee;
    if (recipientId.toString() === assignedBy._id.toString()) continue;

    await createNotification({
      recipient: recipientId,
      sender: assignedBy._id,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${assignedBy.name} assigned you to "${task.title}"`,
      link: `/tasks/${task._id}`,
      data: { taskId: task._id, projectId: task.project },
      organization: task.organization,
      sendEmail: true,
      emailFn: async () => {
        const User = require('../models/User');
        const user = await User.findById(recipientId);
        if (user?.notificationSettings?.emailNotifications && user?.notificationSettings?.taskAssignment) {
          await emailService.sendTaskAssignment(user, task, assignedBy);
        }
      },
    });
  }
};

/**
 * Notify task comment mention
 */
const notifyMention = async (comment, task, mentionedUsers, author) => {
  for (const userId of mentionedUsers) {
    if (userId.toString() === author._id.toString()) continue;

    await createNotification({
      recipient: userId,
      sender: author._id,
      type: 'task_mentioned',
      title: 'You were mentioned',
      message: `${author.name} mentioned you in a comment on "${task.title}"`,
      link: `/tasks/${task._id}`,
      data: { taskId: task._id, commentId: comment._id },
      organization: task.organization,
      sendEmail: true,
      emailFn: async () => {
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user?.notificationSettings?.emailNotifications && user?.notificationSettings?.mentionAlerts) {
          await emailService.sendMentionNotification(user, comment, task, author);
        }
      },
    });
  }
};

/**
 * Notify sprint events
 */
const notifySprintEvent = async (sprint, project, eventType) => {
  const User = require('../models/User');

  // Get project members
  const memberIds = project.members.map((m) => m.user);
  const members = await User.find({ _id: { $in: memberIds }, isActive: true });

  const messages = {
    started: `Sprint "${sprint.name}" has started`,
    ending_soon: `Sprint "${sprint.name}" is ending in 2 days`,
    completed: `Sprint "${sprint.name}" has been completed`,
  };

  for (const member of members) {
    await createNotification({
      recipient: member._id,
      type: `sprint_${eventType === 'ending_soon' ? 'ending' : eventType}`,
      title: `Sprint ${eventType.replace('_', ' ')}`,
      message: messages[eventType],
      link: `/projects/${project._id}/sprints/${sprint._id}`,
      data: { sprintId: sprint._id, projectId: project._id },
      organization: project.organization,
      sendEmail: member.notificationSettings?.sprintUpdates,
      emailFn: async () => {
        if (member.notificationSettings?.emailNotifications) {
          await emailService.sendSprintNotification(member, sprint, eventType);
        }
      },
    });
  }
};

/**
 * Notify task deadline approaching
 */
const notifyDeadlineApproaching = async (task, daysUntilDue) => {
  const User = require('../models/User');

  for (const assigneeId of task.assignees) {
    const user = await User.findById(assigneeId);
    if (!user || !user.isActive) continue;

    await createNotification({
      recipient: assigneeId,
      type: 'deadline_approaching',
      title: 'Task Deadline Approaching',
      message: `"${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
      link: `/tasks/${task._id}`,
      data: { taskId: task._id, dueDate: task.dueDate },
      organization: task.organization,
      sendEmail: true,
      emailFn: async () => {
        if (user.notificationSettings?.emailNotifications && user.notificationSettings?.deadlineReminders) {
          await emailService.sendDeadlineReminder(user, task);
        }
      },
    });
  }
};

/**
 * Mark notifications as read
 */
const markAsRead = async (userId, notificationIds) => {
  const query = { recipient: userId, isRead: false };
  if (notificationIds?.length > 0) {
    query._id = { $in: notificationIds };
  }

  await Notification.updateMany(query, {
    isRead: true,
    readAt: new Date(),
  });

  // Emit read event
  if (io) {
    io.to(`user:${userId}`).emit('notification:read', { notificationIds });
  }
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipient: userId, isRead: false });
};

module.exports = {
  setIO,
  createNotification,
  notifyTaskAssignment,
  notifyMention,
  notifySprintEvent,
  notifyDeadlineApproaching,
  markAsRead,
  getUnreadCount,
};
