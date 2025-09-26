import { Request, Response } from 'express';
import { marketingPlatformService } from '../services/marketingPlatformService.js';
import { logger } from '../config/logger.js';

export const marketingPlatformController = {
  async listPlatforms(req: Request, res: Response): Promise<void> {
    try {
      const { type, isActive } = req.query;
      
      const filters: any = {};
      if (type) filters.type = type as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const platforms = await marketingPlatformService.getAllPlatforms(filters);
      res.json({ success: true, data: platforms });
    } catch (error) {
      logger.error('Error listing marketing platforms: ' + (error as Error).message);
      res.status(500).json({ success: false, error: 'Failed to list marketing platforms' });
    }
  },

  async getPlatform(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const platform = await marketingPlatformService.getPlatformById(id);
      res.json({ success: true, data: platform });
    } catch (error) {
      logger.error('Error getting marketing platform: ' + (error as Error).message);
      
      if ((error as Error).message === 'Marketing platform not found') {
        res.status(404).json({ success: false, error: 'Platform not found' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to get marketing platform' });
      }
    }
  },

  async createPlatform(req: Request, res: Response): Promise<void> {
    try {
      const platformData = req.body;
      const platform = await marketingPlatformService.createPlatform(platformData);
      res.status(201).json({ success: true, data: platform });
    } catch (error) {
      logger.error('Error creating marketing platform: ' + (error as Error).message);
      
      if ((error as Error).message.includes('required') || (error as Error).message.includes('Invalid')) {
        res.status(400).json({ success: false, error: (error as Error).message });
      } else {
        res.status(500).json({ success: false, error: 'Failed to create marketing platform' });
      }
    }
  },

  async updatePlatform(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const platform = await marketingPlatformService.updatePlatform(id, updates);
      res.json({ success: true, data: platform });
    } catch (error) {
      logger.error('Error updating marketing platform: ' + (error as Error).message);
      
      if ((error as Error).message === 'Marketing platform not found') {
        res.status(404).json({ success: false, error: 'Platform not found' });
      } else if ((error as Error).message.includes('Invalid')) {
        res.status(400).json({ success: false, error: (error as Error).message });
      } else {
        res.status(500).json({ success: false, error: 'Failed to update marketing platform' });
      }
    }
  },

  async deletePlatform(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await marketingPlatformService.deletePlatform(id);
      res.json({ success: true, message: 'Marketing platform deleted successfully' });
    } catch (error) {
      logger.error('Error deleting marketing platform: ' + (error as Error).message);
      
      if ((error as Error).message === 'Marketing platform not found') {
        res.status(404).json({ success: false, error: 'Platform not found' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to delete marketing platform' });
      }
    }
  },

  async togglePlatformStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const platform = await marketingPlatformService.togglePlatformStatus(id);
      res.json({ success: true, data: platform });
    } catch (error) {
      logger.error('Error toggling platform status: ' + (error as Error).message);
      
      if ((error as Error).message === 'Platform not found') {
        res.status(404).json({ success: false, error: 'Platform not found' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to toggle platform status' });
      }
    }
  },

  async getPlatformsByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { activeOnly } = req.query;
      
      const platforms = await marketingPlatformService.getPlatformsByType(
        type, 
        activeOnly !== 'false'
      );
      res.json({ success: true, data: platforms });
    } catch (error) {
      logger.error('Error getting platforms by type: ' + (error as Error).message);
      res.status(500).json({ success: false, error: 'Failed to get platforms by type' });
    }
  },

  async getDefaultPlatforms(req: Request, res: Response): Promise<void> {
    try {
      const defaults = marketingPlatformService.getDefaultPlatforms();
      res.json({ success: true, data: defaults });
    } catch (error) {
      logger.error('Error getting default platforms: ' + (error as Error).message);
      res.status(500).json({ success: false, error: 'Failed to get default platforms' });
    }
  }
};
