import type { Request, Response } from 'express';
import { pipelineService } from '../services/pipelineService.js';
import { logger } from '../config/logger.js';

export const pipelineController = {
  /**
   * Get pipeline stages for a specific pipeline
   */
  async getPipelineStages(req: Request, res: Response) {
    try {
      const { pipelineKey } = req.params;
      
      if (!pipelineKey) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline key is required'
        });
      }

      const stages = await pipelineService.getPipelineStages(pipelineKey.toUpperCase());

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
      res.status(500).json({
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
  }
};
