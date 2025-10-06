import type { Request, Response } from 'express';
import { leadDistributionService } from '../services/leadDistributionService.js';

export const leadDistributionController = {
  // Get all ACQ agents with their distribution settings (Admin only)
  getAcquisitionsAgents: async (_req: Request, res: Response) => {
    try {
      const agents = await leadDistributionService.getAcquisitionsAgentsWithSettings();
      res.json({ success: true, data: agents });
    } catch (error: any) {
      console.error('Error fetching acquisitions agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch acquisitions agents',
        message: error.message,
      });
    }
  },

  // Update distribution settings for multiple agents (Admin only)
  updateDistributionSettings: async (req: Request, res: Response) => {
    try {
      const { agents, useEqualDistribution } = req.body;

      // Validation
      if (!Array.isArray(agents) || agents.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Agents array is required and must not be empty',
        });
      }

      if (typeof useEqualDistribution !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'useEqualDistribution must be a boolean',
        });
      }

      // Validate agent data
      for (const agent of agents) {
        if (!agent.userId || typeof agent.receiveLeads !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: 'Each agent must have userId and receiveLeads properties',
          });
        }

        if (!useEqualDistribution && agent.receiveLeads) {
          if (
            typeof agent.distributionPercentage !== 'number' ||
            agent.distributionPercentage < 0 ||
            agent.distributionPercentage > 100
          ) {
            return res.status(400).json({
              success: false,
              error: 'Distribution percentage must be a number between 0 and 100',
            });
          }
        }
      }

      const updatedAgents = await leadDistributionService.updateDistributionSettings({
        agents,
        useEqualDistribution,
      });

      res.json({
        success: true,
        data: updatedAgents,
        message: 'Lead distribution settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating distribution settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update distribution settings',
        message: error.message,
      });
    }
  },

  // Get distribution settings for current user
  getUserSettings: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const settings = await leadDistributionService.getUserDistributionSettings(userId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error fetching user distribution settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch distribution settings',
        message: error.message,
      });
    }
  },
};
