/**
 * Task Routes
 */
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { taskValidator, mongoIdValidator, paginationValidator } = require('../middleware/validationMiddleware');

router.use(protect);

router.route('/')
  .get(paginationValidator, taskController.getTasks)
  .post(taskValidator, taskController.createTask);

router.patch('/bulk', taskController.bulkUpdateTasks);

router.route('/:id')
  .get(mongoIdValidator(), taskController.getTask)
  .put(mongoIdValidator(), taskController.updateTask)
  .delete(mongoIdValidator(), taskController.deleteTask);

router.patch('/:id/move', mongoIdValidator(), taskController.moveTask);
router.post('/:id/time-logs', mongoIdValidator(), taskController.logTime);
router.patch('/:id/watch', mongoIdValidator(), taskController.toggleWatcher);
router.get('/:id/activity', mongoIdValidator(), taskController.getTaskActivity);

module.exports = router;
