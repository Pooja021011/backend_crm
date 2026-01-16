import type { Request, Response } from 'express';
import { pipelineService } from '../services/pipelineService.js';
import { logger } from '../config/logger.js';

export const pipelineController = {
  /**
   * Get pipeline stages for a specific pipeline (filtered by user role permissions)
   */
  async getPipelineStages(req: Request, res: Response) {
    try {
      const { pipelineKey } = req.params;
      const user = (req as any).user;
      const userRoles = user?.roles || [];
      
      if (!pipelineKey) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline key is required'
        });
      }

      const stages = await pipelineService.getPipelineStagesForUser(pipelineKey.toUpperCase(), userRoles);

      res.json({
        success: true,
        data: stages
      });
    } catch (error: any) {
      logger.error('Error in getPipelineStages controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Get leads in pipeline with their current stages
   */
  async getPipelineLeads(req: Request, res: Response) {
    try {
      const { pipelineKey } = req.params;
      const { needsAttention, assignedUserId } = req.query;
      
      if (!pipelineKey) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline key is required'
        });
      }

      const leads = await pipelineService.getPipelineLeads(
        pipelineKey.toUpperCase(),
        {
          needsAttention: needsAttention === 'true',
          assignedUserId: assignedUserId as string
        }
      );

      res.json({
        success: true,
        data: leads
      });
    } catch (error: any) {
      logger.error('Error in getPipelineLeads controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Move lead to different pipeline stage
   */
  async moveLeadToStage(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { stageId } = req.body;
      const userId = (req as any).user?.id;

      if (!leadId || !stageId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID and stage ID are required'
        });
      }

      const result = await pipelineService.moveLeadToStage(leadId, stageId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error in moveLeadToStage controller', { error: error.message });
      // Validation errors (e.g., missing required fields) should not be treated as 500s
      if (error?.code === 'VALIDATION_REQUIRED') {
        return res.status(400).json({
          success: false,
          error: error.message || 'Validation required',
          code: error.code,
          requiredFields: error.requiredFields || [],
          stageName: error.stageName
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  },

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(req: Request, res: Response) {
    try {
      const { pipelineKey } = req.params;
      
      if (!pipelineKey) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline key is required'
        });
      }

      const stats = await pipelineService.getPipelineStats(pipelineKey.toUpperCase());

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error in getPipelineStats controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Get leads that need attention
   */
  async getNeedsAttentionLeads(req: Request, res: Response) {
    try {
      const { pipelineKey } = req.params;
      
      if (!pipelineKey) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline key is required'
        });
      }

      const leads = await pipelineService.getNeedsAttentionLeads(pipelineKey.toUpperCase());

      res.json({
        success: true,
        data: leads
      });
    } catch (error: any) {
      logger.error('Error in getNeedsAttentionLeads controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Get pipeline access for user
   */
  async getPipelineAccess(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userRoles = user?.roles || [];
      
      const access = pipelineService.getPipelineAccess(userRoles);
      
      res.json({
        success: true,
        data: access
      });
    } catch (error: any) {
      logger.error('Error in getPipelineAccess controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Get previous/next lead IDs for pipeline navigation.
   * Used as a fallback when LeadEdit is loaded without PipelineNavContext (e.g., refresh/direct link).
   */
  async getPipelineLeadNav(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userRoles = user?.roles || [];
      const userId = user?.id;

      const currentLeadId = (req.query.currentLeadId as string) || (req.query.leadId as string);
      if (!currentLeadId) {
        return res.status(400).json({ success: false, error: 'currentLeadId is required' });
      }

      const leadSourceId = (req.query.leadSourceId as string) || (req.query.sourceId as string);
      const needsAttention = req.query.needsAttention === 'true';
      const transactionPipelineView = req.query.transactionPipelineView === 'true';

      // Determine pipeline keys to consider
      const pipelineKeysRaw = (req.query.pipelineKeys as string) || '';
      const pipelineKeyRaw = (req.query.pipelineKey as string) || '';

      let pipelineKeys: string[] = [];
      if (pipelineKeysRaw) {
        pipelineKeys = pipelineKeysRaw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      } else if (pipelineKeyRaw) {
        pipelineKeys = [pipelineKeyRaw.toUpperCase()];
      } else {
        // Default behavior: match Pipeline page defaults by role
        const access = pipelineService.getPipelineAccess(userRoles);
        if (transactionPipelineView && access.allowedPipelines.includes('TRANSACTION')) {
          pipelineKeys = ['TRANSACTION'];
        } else if (userRoles.includes('ADMIN') || userRoles.includes('MANAGER') || userRoles.includes('EXECUTIVE')) {
          // Pipeline.tsx shows Acquisitions then Dispositions for Admin/Manager
          pipelineKeys = ['ACQUISITIONS', 'DISPOSITIONS'];
        } else {
          // For ACQ/DISP/TC, use allowed pipelines order
          pipelineKeys = access.allowedPipelines.filter((k) => k !== 'TRANSACTION' || transactionPipelineView);
          if (pipelineKeys.length === 0 && access.allowedPipelines.length > 0) {
            pipelineKeys = [access.allowedPipelines[0]];
          }
        }
      }

      // Enforce assigned-only navigation for roles that have assigned-only access
      const access = pipelineService.getPipelineAccess(userRoles);
      const assignedUserId = access.canViewAssignedOnly ? userId : (req.query.assignedUserId as string | undefined);

      const result = await pipelineService.getPipelineLeadNav(pipelineKeys, currentLeadId, {
        needsAttention,
        leadSourceId,
        assignedUserId,
        userRole: userRoles[0],
        userId,
      });

      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error in getPipelineLeadNav controller', { error: error.message });
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * Update needs attention status for leads
   */
  async updateNeedsAttention(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userRoles = user?.roles || [];
      const userId = user?.id;
      
      await pipelineService.updateNeedsAttentionStatus(userRoles, userId);
      
      res.json({
        success: true,
        message: 'Needs attention status updated successfully'
      });
    } catch (error: any) {
      logger.error('Error in updateNeedsAttention controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Create default stages for a pipeline (Admin only)
   */
  async createDefaultStages(req: Request, res: Response) {
    try {
      const { pipelineKey } = req.params;
      const user = (req as any).user;
      
      // Check admin permission
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      await pipelineService.createDefaultStages(pipelineKey.toUpperCase());
      
      res.json({
        success: true,
        message: 'Default stages created successfully'
      });
    } catch (error: any) {
      logger.error('Error in createDefaultStages controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Update pipeline stage (Admin only)
   */
  async updatePipelineStage(req: Request, res: Response) {
    try {
      const { stageId } = req.params;
      const user = (req as any).user;
      
      // Check admin permission
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      await pipelineService.updatePipelineStage(stageId, req.body);
      
      res.json({
        success: true,
        message: 'Pipeline stage updated successfully'
      });
    } catch (error: any) {
      logger.error('Error in updatePipelineStage controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Get enhanced pipeline leads with role-based filtering
   */
  async getEnhancedPipelineLeads(req: Request, res: Response) {
    try {
      const { pipelineKey } = req.params;
      const user = (req as any).user;
      const userRoles = user?.roles || [];
      const userId = user?.id;
      const leadSourceId = (req.query.leadSourceId as string) || (req.query.sourceId as string);
      const assignedUserId = (req.query.assignedUserId as string) || undefined;
      const dispAgentId = (req.query.dispAgentId as string) || undefined;
      const createdFrom = (req.query.createdFrom as string) || undefined;
      const createdTo = (req.query.createdTo as string) || undefined;
      const lastTouchedFrom = (req.query.lastTouchedFrom as string) || undefined;
      const lastTouchedTo = (req.query.lastTouchedTo as string) || undefined;
      
      // Multi-select agent filters - handle arrays
      const acqAgentIds = req.query.acqAgentIds 
        ? (Array.isArray(req.query.acqAgentIds) ? req.query.acqAgentIds : [req.query.acqAgentIds]) as string[]
        : undefined;
      const dispAgentIds = req.query.dispAgentIds 
        ? (Array.isArray(req.query.dispAgentIds) ? req.query.dispAgentIds : [req.query.dispAgentIds]) as string[]
        : undefined;
      
      const filters = {
        needsAttention: req.query.needsAttention === 'true',
        leadSourceId,
        assignedUserId,
        dispAgentId,
        createdFrom,
        createdTo,
        lastTouchedFrom,
        lastTouchedTo,
        acqAgentIds,
        dispAgentIds,
        userRole: userRoles[0], // Primary role
        userId: userId
      };

      const leads = await pipelineService.getPipelineLeads(pipelineKey.toUpperCase(), filters);

      res.json({
        success: true,
        data: leads
      });
    } catch (error: any) {
      logger.error('Error in getEnhancedPipelineLeads controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  async getLeadSources(req: Request, res: Response): Promise<void> {
    try {
      const sources = await pipelineService.getLeadSources();
      res.json({ success: true, data: sources });
    } catch (error) {
      logger.error('Error getting lead sources:', error);
      res.status(500).json({ success: false, error: 'Failed to get lead sources' });
    }
  },

  /**
   * Update stage role permissions (Admin only)
   */
  async updateStageRolePermissions(req: Request, res: Response) {
    try {
      const { stageId } = req.params;
      const { allowedRoles } = req.body; // Array of role names
      const user = (req as any).user;
      
      // Check admin permission
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      await pipelineService.updateStageRolePermissions(stageId, allowedRoles);
      
      res.json({
        success: true,
        message: 'Stage permissions updated successfully'
      });
    } catch (error: any) {
      logger.error('Error in updateStageRolePermissions controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
};
