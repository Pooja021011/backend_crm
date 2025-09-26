import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { notificationController } from '../controllers/notificationController.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get all notifications for authenticated user
router.get('/', notificationController.getUserNotifications);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark notification as read
router.post('/:notificationId/read', notificationController.markAsRead);

// Auto-clear notifications
router.post('/auto-clear/message-reply', notificationController.autoClearOnMessageReply);
router.post('/auto-clear/task-complete', notificationController.autoClearOnTaskComplete);
router.post('/auto-clear/lead-update', notificationController.autoClearOnLeadUpdate);

// Create test notifications (development only)
router.post('/test', notificationController.createTestNotifications);

export default router;
