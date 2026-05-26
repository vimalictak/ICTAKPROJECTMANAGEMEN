/**
 * Background Jobs using node-cron (lightweight, no Redis dependency)
 * For production scale, swap to BullMQ with Redis
 */
const cron = require('node-cron')
const { Task, Sprint, User, Notification } = require('../models')
const notificationService = require('../services/notificationService')
const logger = require('../config/logger')

let jobsRunning = false

function startJobs() {
  if (jobsRunning) return
  jobsRunning = true
  logger.info('Background jobs starting...')

  // ── Every hour: Deadline Reminders ──────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(23, 59, 59, 999)
      const now = new Date()

      const tasks = await Task.find({
        dueDate: { $gte: now, $lte: tomorrow },
        status: { $nin: ['completed', 'cancelled'] },
        isDeleted: false,
      }).populate('assignee', 'firstName lastName email')

      for (const task of tasks) {
        if (!task.assignee) continue
        await notificationService.create({
          recipient: task.assignee._id,
          type: 'deadline_alert',
          title: 'Task Due Tomorrow',
          message: `"${task.title}" is due tomorrow`,
          data: { taskId: task._id },
        })
      }
      if (tasks.length > 0) logger.info(`Sent ${tasks.length} deadline reminders`)
    } catch (err) {
      logger.error('Deadline reminder job error:', err)
    }
  })

  // ── Every day at 9am: Sprint Ending Soon ─────────────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const sprints = await Sprint.find({
        endDate: { $lte: threeDaysFromNow, $gte: new Date() },
        status: 'active',
        isDeleted: false,
      }).populate('project', 'name members')

      for (const sprint of sprints) {
        const members = sprint.project?.members || []
        for (const member of members) {
          await notificationService.create({
            recipient: member.user,
            type: 'sprint_ending',
            title: 'Sprint Ending Soon',
            message: `Sprint "${sprint.name}" ends in ${Math.ceil((sprint.endDate - new Date()) / 86400000)} days`,
            data: { sprintId: sprint._id, projectId: sprint.project._id },
          })
        }
      }
    } catch (err) {
      logger.error('Sprint ending job error:', err)
    }
  })

  // ── Every Sunday midnight: Auto-complete overdue sprints ──────────
  cron.schedule('0 0 * * 0', async () => {
    try {
      const now = new Date()
      const overdueSprints = await Sprint.find({
        endDate: { $lt: now },
        status: 'active',
        isDeleted: false,
      })

      for (const sprint of overdueSprints) {
        // Move incomplete tasks back to backlog
        await Task.updateMany(
          { sprint: sprint._id, status: { $ne: 'completed' }, isDeleted: false },
          { $unset: { sprint: '' } }
        )
        sprint.status = 'completed'
        await sprint.save()
        logger.info(`Auto-completed sprint: ${sprint.name}`)
      }
    } catch (err) {
      logger.error('Auto-complete sprint job error:', err)
    }
  })

  // ── Every 15 minutes: Clean up expired refresh tokens ────────────
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date()
      await User.updateMany(
        {},
        { $pull: { refreshTokens: { expiresAt: { $lt: now } } } }
      )
    } catch (err) {
      logger.error('Token cleanup job error:', err)
    }
  })

  logger.info('Background jobs started ✓')
}

function stopJobs() {
  jobsRunning = false
  logger.info('Background jobs stopped')
}

module.exports = { startJobs, stopJobs }
