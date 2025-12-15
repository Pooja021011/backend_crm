import { Router } from 'express';
import { dispositionsPipelineController } from '../controllers/dispositionsPipelineController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/metrics/dispositions/pipeline/funnel
router.get('/metrics/dispositions/pipeline/funnel', dispositionsPipelineController.getFunnel);

// GET /api/v1/metrics/dispositions/pipeline/timeline
router.get('/metrics/dispositions/pipeline/timeline', dispositionsPipelineController.getTimeline);

export default router;

