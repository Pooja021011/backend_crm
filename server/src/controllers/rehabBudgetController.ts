import type { Request, Response } from 'express';
import { rehabBudgetRepository } from '../repositories/rehabBudgetRepository.js';
import { rehabCalculationService } from '../services/rehabCalculationService.js';
import { logger } from '../config/logger.js';

export const rehabBudgetController = {
  /**
   * Get rehab budget for a lead
   */
  async getBudget(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const budget = await rehabBudgetRepository.getByLeadId(leadId);

      res.json({
        success: true,
        data: budget
      });
    } catch (error: any) {
      logger.error('Error in getBudget controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get rehab budget'
      });
    }
  },

  /**
   * Calculate rehab budget
   */
  async calculate(req: Request, res: Response) {
    try {
      const { sqft, finishLevel, toggledItems, numberOfBathrooms, numberOfWindows } = req.body;

      if (!sqft || !finishLevel || !toggledItems) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: sqft, finishLevel, toggledItems'
        });
      }

      const calculation = rehabCalculationService.calculate({
        sqft,
        finishLevel,
        toggledItems,
        numberOfBathrooms,
        numberOfWindows
      });

      res.json({
        success: true,
        data: calculation
      });
    } catch (error: any) {
      logger.error('Error in calculate controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate rehab budget'
      });
    }
  },

  /**
   * Save rehab budget
   */
  async saveBudget(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { finishLevel, toggledItems, customValues, subtotal, contingencyAmount, totalCost } = req.body;

      if (!toggledItems || subtotal === undefined || totalCost === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const budget = await rehabBudgetRepository.upsert(leadId, {
        finishLevel,
        toggledItems,
        customValues,
        subtotal,
        contingencyAmount: contingencyAmount || 0,
        totalCost
      });

      res.json({
        success: true,
        data: budget
      });
    } catch (error: any) {
      logger.error('Error in saveBudget controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to save rehab budget'
      });
    }
  },

  /**
   * Delete rehab budget
   */
  async deleteBudget(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      await rehabBudgetRepository.delete(leadId);

      res.json({
        success: true,
        message: 'Rehab budget deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error in deleteBudget controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete rehab budget'
      });
    }
  }
};

