import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { inboxController } from '../controllers/inboxController.js';

const router = Router();
router.use(authenticate);

router.get('/tasks', (req, res, next) => inboxController.myTasks(req, res).catch(next));
router.get('/communications', (req, res, next) => inboxController.communications(req, res).catch(next));

export default router;


