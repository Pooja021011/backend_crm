import { Request, Response } from 'express';
import { marketingService } from '../services/marketingService';
import { logger } from '../config/logger';

export const marketingController = {
  async listLeadResources(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const resources = await marketingService.getResourcesByLeadId(leadId);
      res.json(resources);
    } catch (error) {
      logger.error('Error listing lead marketing resources: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to list marketing resources' });
    }
  },

  async getResourcesByType(req: Request, res: Response): Promise<void> {
    try {
      const { leadId, type } = req.params;
      const resources = await marketingService.getResourcesByType(leadId, type);
      res.json(resources);
    } catch (error) {
      logger.error('Error getting resources by type: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get resources by type' });
    }
  },

  async getResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const resource = await marketingService.getResourceById(id);
      
      if (!resource) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      res.json(resource);
    } catch (error) {
      logger.error('Error getting marketing resource: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get resource' });
    }
  },

  async createResource(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const resourceData = {
        ...req.body,
        leadId
      };

      const resource = await marketingService.createResource(resourceData);
      res.status(201).json(resource);
    } catch (error) {
      logger.error('Error creating marketing resource: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('cannot be empty') ||
        error.message.includes('Invalid') ||
        error.message.includes('must have')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create resource' });
      }
    }
  },

  async updateResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const resource = await marketingService.updateResource(id, req.body);
      res.json(resource);
    } catch (error) {
      logger.error('Error updating marketing resource: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('cannot be empty') ||
        error.message.includes('Invalid') ||
        error.message.includes('must have')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update resource' });
      }
    }
  },

  async deleteResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await marketingService.deleteResource(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting marketing resource: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to delete resource' });
    }
  },

  async toggleResourceStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const resource = await marketingService.toggleResourceStatus(id);
      res.json(resource);
    } catch (error) {
      logger.error('Error toggling resource status: ' + (error as Error).message);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to toggle resource status' });
      }
    }
  },

  async getResourceStats(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const stats = await marketingService.getResourceStats(leadId);
      res.json(stats);
    } catch (error) {
      logger.error('Error getting resource stats: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get resource stats' });
    }
  },

  async createMarketingCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const campaignData = {
        ...req.body,
        leadId
      };

      if (!campaignData.campaignName || !campaignData.resources || !Array.isArray(campaignData.resources)) {
        res.status(400).json({ error: 'Campaign name and resources array are required' });
        return;
      }

      const resources = await marketingService.createMarketingCampaign(campaignData);
      res.status(201).json(resources);
    } catch (error) {
      logger.error('Error creating marketing campaign: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('cannot be empty') ||
        error.message.includes('Invalid') ||
        error.message.includes('must have')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create marketing campaign' });
      }
    }
  },

  async duplicateResources(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { sourceLeadId } = req.body;

      if (!sourceLeadId) {
        res.status(400).json({ error: 'Source lead ID is required' });
        return;
      }

      const resources = await marketingService.duplicateResourcesForLead(sourceLeadId, leadId);
      res.status(201).json(resources);
    } catch (error) {
      logger.error('Error duplicating marketing resources: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to duplicate resources' });
    }
  },

  async getMarketingOverview(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const overview = await marketingService.getMarketingOverview(leadId);
      res.json(overview);
    } catch (error) {
      logger.error('Error getting marketing overview: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get marketing overview' });
    }
  },

  async generatePublicLinks(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const publicLinks = await marketingService.generatePublicLinks(leadId);
      res.json(publicLinks);
    } catch (error) {
      logger.error('Error generating public links: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to generate public links' });
    }
  }
};