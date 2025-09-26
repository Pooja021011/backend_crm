import { Request, Response } from 'express';
import { underwritingService } from '../services/underwritingService';
import { logger } from '../config/logger';

export const underwritingController = {
  async listScenarios(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const scenarios = await underwritingService.getScenariosByLeadId(leadId);
      res.json(scenarios);
    } catch (error) {
      logger.error('Error listing underwriting scenarios: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to list scenarios' });
    }
  },

  async getScenario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scenario = await underwritingService.getScenarioById(id);
      
      if (!scenario) {
        res.status(404).json({ error: 'Scenario not found' });
        return;
      }

      res.json(scenario);
    } catch (error) {
      logger.error('Error getting underwriting scenario: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get scenario' });
    }
  },

  async createScenario(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const userId = (req as any).user?.id;
      
      const scenarioData = {
        ...req.body,
        leadId,
        createdById: userId
      };

      const scenario = await underwritingService.createScenario(scenarioData);
      res.status(201).json(scenario);
    } catch (error) {
      logger.error('Error creating underwriting scenario: ' + (error as Error).message);
      
      if (error instanceof Error && error.message.includes('must be')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create scenario' });
      }
    }
  },

  async updateScenario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scenario = await underwritingService.updateScenario(id, req.body);
      res.json(scenario);
    } catch (error) {
      logger.error('Error updating underwriting scenario: ' + (error as Error).message);
      
      if (error instanceof Error && error.message.includes('must be')) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof Error && error.message === 'Scenario not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update scenario' });
      }
    }
  },

  async deleteScenario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await underwritingService.deleteScenario(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting underwriting scenario: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to delete scenario' });
    }
  },

  async setPrimary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scenario = await underwritingService.setPrimaryScenario(id);
      res.json(scenario);
    } catch (error) {
      logger.error('Error setting primary scenario: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to set primary scenario' });
    }
  },

  async calculateScenario(req: Request, res: Response): Promise<void> {
    try {
      const inputs = req.body;
      const outputs = underwritingService.calculateScenario(inputs);
      res.json({ inputs, outputs });
    } catch (error) {
      logger.error('Error calculating scenario: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to calculate scenario' });
    }
  },

  async duplicateScenario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = (req as any).user?.id;

      if (!name || name.trim().length === 0) {
        res.status(400).json({ error: 'Name is required for duplicate scenario' });
        return;
      }

      const scenario = await underwritingService.duplicateScenario(id, name.trim(), userId);
      res.status(201).json(scenario);
    } catch (error) {
      logger.error('Error duplicating scenario: ' + (error as Error).message);
      
      if (error instanceof Error && error.message === 'Scenario not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to duplicate scenario' });
      }
    }
  },

  async exportToPDF(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // TODO: Implement PDF export
      res.status(501).json({ error: 'PDF export not yet implemented' });
    } catch (error) {
      logger.error('Error exporting scenario to PDF: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to export scenario' });
    }
  }
};