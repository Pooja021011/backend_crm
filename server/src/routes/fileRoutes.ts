import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { fileController } from '../controllers/fileController.js';

const router = Router();

router.use(authenticate);

router.get('/:fileId/download', (req, res, next) => fileController.download(req, res).catch(next));

export default router;

