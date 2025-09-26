import { Request, Response } from 'express';
import { compsService } from '../services/compsService';
import { logger } from '../config/logger';

export const compsController = {
  async listLeadComps(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const comps = await compsService.getComparablesByLeadId(leadId);
      res.json(comps);
    } catch (error) {
      logger.error('Error listing lead comparables: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to list comparables' });
    }
  },

  async searchComparables(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Convert string parameters to appropriate types
      const searchFilters = {
        city: filters.city as string,
        state: filters.state as string,
        zip: filters.zip as string,
        minBeds: filters.minBeds ? parseInt(filters.minBeds as string) : undefined,
        maxBeds: filters.maxBeds ? parseInt(filters.maxBeds as string) : undefined,
        minBaths: filters.minBaths ? parseInt(filters.minBaths as string) : undefined,
        maxBaths: filters.maxBaths ? parseInt(filters.maxBaths as string) : undefined,
        minSqft: filters.minSqft ? parseInt(filters.minSqft as string) : undefined,
        maxSqft: filters.maxSqft ? parseInt(filters.maxSqft as string) : undefined,
        minPrice: filters.minPrice ? parseInt(filters.minPrice as string) : undefined,
        maxPrice: filters.maxPrice ? parseInt(filters.maxPrice as string) : undefined,
        soldAfter: filters.soldAfter ? new Date(filters.soldAfter as string) : undefined,
        soldBefore: filters.soldBefore ? new Date(filters.soldBefore as string) : undefined
      };

      const comps = await compsService.searchComparables(searchFilters, limit);
      res.json(comps);
    } catch (error) {
      logger.error('Error searching comparables: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to search comparables' });
    }
  },

  async createComparable(req: Request, res: Response): Promise<void> {
    try {
      const comparable = await compsService.createComparable(req.body);
      res.status(201).json(comparable);
    } catch (error) {
      logger.error('Error creating comparable: ' + (error as Error).message);
      
      if (error instanceof Error && error.message.includes('must be')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create comparable' });
      }
    }
  },

  async addCompToLead(req: Request, res: Response): Promise<void> {
    try {
      const { leadId, comparableId } = req.params;
      const leadComp = await compsService.addComparableToLead(leadId, comparableId);
      res.status(201).json(leadComp);
    } catch (error) {
      logger.error('Error adding comparable to lead: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to add comparable to lead' });
    }
  },

  async removeCompFromLead(req: Request, res: Response): Promise<void> {
    try {
      const { leadId, comparableId } = req.params;
      await compsService.removeComparableFromLead(leadId, comparableId);
      res.status(204).send();
    } catch (error) {
      logger.error('Error removing comparable from lead: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to remove comparable from lead' });
    }
  },

  async updateComparable(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const comparable = await compsService.updateComparable(id, req.body);
      res.json(comparable);
    } catch (error) {
      logger.error('Error updating comparable: ' + (error as Error).message);
      
      if (error instanceof Error && error.message.includes('must be')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update comparable' });
      }
    }
  },

  async deleteComparable(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await compsService.deleteComparable(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting comparable: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to delete comparable' });
    }
  },

  async analyzeComps(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const analysis = await compsService.analyzeComps(leadId);
      res.json(analysis);
    } catch (error) {
      logger.error('Error analyzing comparables: ' + (error as Error).message);
      
      if (error instanceof Error && error.message.includes('No valid comparables')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to analyze comparables' });
      }
    }
  },

  async suggestComps(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { city, state, zip, beds, baths, sqft } = req.query;

      if (!city || !state) {
        res.status(400).json({ error: 'City and state are required for comp suggestions' });
        return;
      }

      const leadAddress = {
        city: city as string,
        state: state as string,
        zip: zip as string
      };

      const suggestions = await compsService.suggestComps(
        leadAddress,
        beds ? parseInt(beds as string) : undefined,
        baths ? parseInt(baths as string) : undefined,
        sqft ? parseInt(sqft as string) : undefined
      );

      res.json(suggestions);
    } catch (error) {
      logger.error('Error suggesting comparables: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to suggest comparables' });
    }
  },

  async autoFetchComps(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { radius } = req.query;

      // TODO: Implement auto-fetch from MLS/external APIs
      res.status(501).json({ error: 'Auto-fetch comparables not yet implemented - requires MLS integration' });
    } catch (error) {
      logger.error('Error auto-fetching comparables: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to auto-fetch comparables' });
    }
  }
};
