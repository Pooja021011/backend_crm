import { Router } from 'express';
import { smsController } from '../controllers/smsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All SMS routes require authentication
router.use(authenticate);

// Send single SMS
router.post('/send', (req, res, next) => 
  smsController.sendSMS(req, res).catch(next)
);

// Send bulk SMS
router.post('/send-bulk', (req, res, next) => 
  smsController.sendBulkSMS(req, res).catch(next)
);

// Get message status
router.get('/status/:messageId', (req, res, next) => 
  smsController.getMessageStatus(req, res).catch(next)
);

// Get available phone numbers
router.get('/numbers', (req, res, next) => 
  smsController.getAvailableNumbers(req, res).catch(next)
);

// Get SMS history/conversations
router.get('/history', (req, res, next) => 
  smsController.getSMSHistory(req, res).catch(next)
);

// Webhook endpoint for incoming SMS (no auth required)
router.post('/webhook', (req, res, next) => 
  smsController.webhook(req, res).catch(next)
);

export default router;
