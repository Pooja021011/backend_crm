import type { Request, Response } from 'express';
import { underwritingRepository } from '../repositories/underwritingRepository.js';
import { underwritingService } from '../services/underwritingService.js';
import { logger } from '../config/logger.js';

export const underwritingController = {
  /**
   * Get underwriting calculations for a lead
   */
  async getCalculations(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const calculations = await underwritingRepository.getByLeadId(leadId);

      res.json({
        success: true,
        data: calculations
      });
    } catch (error: any) {
      logger.error('Error in getCalculations controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get underwriting calculations'
      });
    }
  },

  /**
   * Get latest calculation for a lead
   */
  async getLatest(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const calculation = await underwritingRepository.getLatest(leadId);

      res.json({
        success: true,
        data: calculation
      });
    } catch (error: any) {
      logger.error('Error in getLatest controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get latest calculation'
      });
    }
  },

  /**
   * Calculate final offer
   */
  async calculate(req: Request, res: Response) {
    try {
      const { arv, rehabCost } = req.body;

      if (!arv || !rehabCost) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: arv, rehabCost'
        });
      }

      // Formula: (ARV × 72%) - Rehab - $25,000
      const finalOffer = (arv * 0.72) - rehabCost - 25000;

      res.json({
        success: true,
        data: {
          arv,
          rehabCost,
          finalOffer: Math.round(finalOffer * 100) / 100
        }
      });
    } catch (error: any) {
      logger.error('Error in calculate controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate final offer'
      });
    }
  },

  /**
   * Save underwriting calculation
   */
  async saveCalculation(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { arv, rehabCost, taxes, timeline, notes } = req.body;
      const userId = (req as any).user?.id;

      // Taxes/timeline must be provided by user (no auto-defaults).
      if (!arv || !rehabCost || !taxes || !timeline) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: arv, rehabCost, taxes, timeline'
        });
      }
      if (Number(taxes) <= 0 || Number(timeline) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Taxes and timeline must be greater than 0'
        });
      }

      // Calculate final offer
      const finalOffer = (arv * 0.72) - rehabCost - 25000;

      const calculation = await underwritingRepository.create({
        leadId,
        arv,
        rehabCost,
        taxes,
        timeline,
        finalOffer: Math.round(finalOffer * 100) / 100,
        calculatedBy: userId,
        notes
      });

      res.status(201).json({
        success: true,
        data: calculation
      });
    } catch (error: any) {
      logger.error('Error in saveCalculation controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to save calculation'
      });
    }
  },

  /**
   * Delete a calculation
   */
  async deleteCalculation(req: Request, res: Response) {
    try {
      const { calculationId } = req.params;
      await underwritingRepository.delete(calculationId);

      res.json({
        success: true,
        message: 'Calculation deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error in deleteCalculation controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete calculation'
      });
    }
  },

  // ========== SCENARIO METHODS ==========

  /**
   * Get all scenarios for a lead
   */
  async getScenarios(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const scenarios = await underwritingService.getScenariosByLeadId(leadId);

      res.json({
        success: true,
        data: scenarios
      });
    } catch (error: any) {
      logger.error('Error in getScenarios controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get underwriting scenarios'
      });
    }
  },

  /**
   * Get a scenario by ID
   */
  async getScenario(req: Request, res: Response) {
    try {
      const { scenarioId } = req.params;
      const scenario = await underwritingService.getScenarioById(scenarioId);

      if (!scenario) {
        return res.status(404).json({
          success: false,
          error: 'Scenario not found'
        });
      }

      res.json({
        success: true,
        data: scenario
      });
    } catch (error: any) {
      logger.error('Error in getScenario controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get scenario'
      });
    }
  },

  /**
   * Create a new scenario
   */
  async createScenario(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { name, isPrimary, inputs, outputs } = req.body;
      const userId = (req as any).user?.id;

      if (!name || !inputs) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, inputs'
        });
      }

      const scenario = await underwritingService.createScenario({
        leadId,
        name,
        isPrimary,
        inputs,
        outputs,
        createdById: userId
      });

      res.status(201).json({
        success: true,
        data: scenario
      });
    } catch (error: any) {
      logger.error('Error in createScenario controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create scenario'
      });
    }
  },

  /**
   * Update a scenario
   */
  async updateScenario(req: Request, res: Response) {
    try {
      const { scenarioId } = req.params;
      const { name, isPrimary, inputs, outputs } = req.body;

      const scenario = await underwritingService.updateScenario(scenarioId, {
        name,
        isPrimary,
        inputs,
        outputs
      });

      res.json({
        success: true,
        data: scenario
      });
    } catch (error: any) {
      logger.error('Error in updateScenario controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update scenario'
      });
    }
  },

  /**
   * Delete a scenario
   */
  async deleteScenario(req: Request, res: Response) {
    try {
      const { scenarioId } = req.params;
      await underwritingService.deleteScenario(scenarioId);

      res.json({
        success: true,
        message: 'Scenario deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error in deleteScenario controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete scenario'
      });
    }
  },

  /**
   * Set a scenario as primary
   */
  async setPrimaryScenario(req: Request, res: Response) {
    try {
      const { scenarioId } = req.params;
      const scenario = await underwritingService.setPrimaryScenario(scenarioId);

      res.json({
        success: true,
        data: scenario
      });
    } catch (error: any) {
      logger.error('Error in setPrimaryScenario controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to set primary scenario'
      });
    }
  },

  /**
   * Duplicate a scenario
   */
  async duplicateScenario(req: Request, res: Response) {
    try {
      const { scenarioId } = req.params;
      const { name } = req.body;
      const userId = (req as any).user?.id;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: name'
        });
      }

      const scenario = await underwritingService.duplicateScenario(scenarioId, name, userId);

      res.status(201).json({
        success: true,
        data: scenario
      });
    } catch (error: any) {
      logger.error('Error in duplicateScenario controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to duplicate scenario'
      });
    }
  },

  /**
   * Calculate scenario outputs (doesn't save)
   */
  async calculateScenario(req: Request, res: Response) {
    try {
      const { inputs } = req.body;

      if (!inputs) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: inputs'
        });
      }

      const outputs = underwritingService.calculateScenario(inputs);

      res.json({
        success: true,
        data: outputs
      });
    } catch (error: any) {
      logger.error('Error in calculateScenario controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate scenario'
      });
    }
  }
};
