import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { inboxController } from '../controllers/inboxController.js';

const router = Router();
router.use(authenticate);

router.get('/tasks', (req, res, next) => inboxController.myTasks(req, res).catch(next));
router.post('/tasks/:taskId/mark-read', (req, res, next) => inboxController.markTaskRead(req, res).catch(next));
router.post('/communications/:communicationId/mark-read', (req, res, next) => inboxController.markCommunicationRead(req, res).catch(next));
router.post('/emails/:emailId/mark-read', (req, res, next) => inboxController.markGmailEmailRead(req, res).catch(next));
router.get('/communications', (req, res, next) => inboxController.communications(req, res).catch(next));

export default router;


