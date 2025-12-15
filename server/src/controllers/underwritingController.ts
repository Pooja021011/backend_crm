import type { Request, Response } from 'express';
import { underwritingRepository } from '../repositories/underwritingRepository.js';
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

      if (!arv || !rehabCost) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: arv, rehabCost'
        });
      }

      // Calculate final offer
      const finalOffer = (arv * 0.72) - rehabCost - 25000;

      const calculation = await underwritingRepository.create({
        leadId,
        arv,
        rehabCost,
        taxes: taxes || 1000,
        timeline: timeline || 6,
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
  }
};
