import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { reminderController } from '../controllers/reminderController.js';

const router = Router();

// All reminder routes require authentication
router.use(authenticate);

// Get all reminders for authenticated user
router.get('/', reminderController.getUserReminders);

// Get reminder counts for badge display
router.get('/counts', reminderController.getReminderCounts);

// Get SLA status for user
router.get('/sla-status', reminderController.getSLAStatus);

// Get reminders filtered by type
router.get('/type/:type', reminderController.getRemindersByType);

// Get reminders filtered by priority
router.get('/priority/:priority', reminderController.getRemindersByPriority);

// Acknowledge a reminder
router.post('/:reminderId/acknowledge', reminderController.acknowledgeReminder);

export default router;
