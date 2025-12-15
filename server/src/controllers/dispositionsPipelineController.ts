import { Request, Response } from 'express';
import { dispositionsPipelineService } from '../services/dispositionsPipelineService.js';

export const dispositionsPipelineController = {
  /**
   * GET /api/v1/metrics/dispositions/pipeline/funnel
   * Get dispositions pipeline funnel data
   */
  async getFunnel(req: Request, res: Response) {
    try {
      const { period = 'This Month' } = req.query;
      
      const data = await dispositionsPipelineService.getPipelineFunnel(period as string);
      
      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error fetching dispositions pipeline funnel:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch dispositions pipeline funnel',
      });
    }
  },

  /**
   * GET /api/v1/metrics/dispositions/pipeline/timeline
   * Get dispositions pipeline timeline metrics
   */
  async getTimeline(req: Request, res: Response) {
    try {
      const { period = 'This Month' } = req.query;
      
      const data = await dispositionsPipelineService.getPipelineTimeline(period as string);
      
      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error fetching dispositions pipeline timeline:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch dispositions pipeline timeline',
      });
    }
  },
};

