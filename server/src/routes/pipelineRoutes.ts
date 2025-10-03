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

// Get pipeline access for current user
router.get('/access', pipelineController.getPipelineAccess);

// Update needs attention status
router.post('/update-attention', pipelineController.updateNeedsAttention);

// Enhanced pipeline leads with role-based filtering
router.get('/:pipelineKey/enhanced-leads', pipelineController.getEnhancedPipelineLeads);

// Lead sources for filtering (used by ACQ agents)
router.get('/lead-sources', pipelineController.getLeadSources);

// Admin-only routes for pipeline management
router.post('/:pipelineKey/default-stages', pipelineController.createDefaultStages);
router.put('/stages/:stageId', pipelineController.updatePipelineStage);
router.put('/stages/:stageId/permissions', pipelineController.updateStageRolePermissions);

export default router;
