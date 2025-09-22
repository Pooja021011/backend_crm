import { Router } from 'express';
import { pipelineController } from '../controllers/pipelineController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All pipeline routes require authentication
router.use(authenticate);

// Get pipeline stages for a specific pipeline
router.get('/:pipelineKey/stages', pipelineController.getPipelineStages);

// Get all leads in a pipeline
router.get('/:pipelineKey/leads', pipelineController.getPipelineLeads);

// Move lead to different stage
router.put('/leads/:leadId/move', pipelineController.moveLeadToStage);

// Get pipeline statistics
router.get('/:pipelineKey/stats', pipelineController.getPipelineStats);

// Get leads that need attention
router.get('/:pipelineKey/needs-attention', pipelineController.getNeedsAttentionLeads);

export default router;
