import { Request, Response } from 'express';
import { priceHistoryService, PriceFieldName } from '../services/priceHistoryService.js';

export const priceHistoryController = {
  /**
   * Get all price history for a lead
   * GET /api/v1/leads/:leadId/price-history
   */
  async getPriceHistory(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { fieldName, startDate, endDate } = req.query;

      const filters: any = {};
      if (fieldName) {
        filters.fieldName = fieldName as PriceFieldName;
      }
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const history = await priceHistoryService.getPriceHistoryByLeadId(leadId, filters);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching price history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch price history',
      });
    }
  },

  /**
   * Create a price history entry
   * POST /api/v1/leads/:leadId/price-history
   */
  async createPriceHistory(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { fieldName, oldValue, newValue, note } = req.body;
      const userId = (req as any).user?.id;

      if (!fieldName || newValue === undefined) {
        return res.status(400).json({
          success: false,
          error: 'fieldName and newValue are required',
        });
      }

      const entry = await priceHistoryService.createPriceHistory({
        leadId,
        fieldName,
        oldValue,
        newValue,
        changedById: userId,
        note,
      });

      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      console.error('Error creating price history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create price history',
      });
    }
  },

  /**
   * Get price history summary (latest values for each field)
   * GET /api/v1/leads/:leadId/price-history/summary
   */
  async getPriceHistorySummary(req: Request, res: Response) {
    try {
      const { leadId } = req.params;

      const summary = await priceHistoryService.getPriceHistorySummary(leadId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching price history summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch price history summary',
      });
    }
  },

  /**
   * Get lead timeline with price history
   * GET /api/v1/leads/:leadId/timeline
   */
  async getLeadTimeline(req: Request, res: Response) {
    try {
      const { leadId } = req.params;

      const timeline = await priceHistoryService.getLeadTimeline(leadId);

      if (!timeline) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
      }

      res.json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      console.error('Error fetching lead timeline:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lead timeline',
      });
    }
  },

  /**
   * Track price change (auto-tracking endpoint)
   * POST /api/v1/leads/:leadId/price-history/track
   */
  async trackPriceChange(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { fieldName, oldValue, newValue, note } = req.body;
      const userId = (req as any).user?.id;

      if (!fieldName || newValue === undefined) {
        return res.status(400).json({
          success: false,
          error: 'fieldName and newValue are required',
        });
      }

      const entry = await priceHistoryService.trackPriceChange(
        leadId,
        fieldName,
        oldValue,
        newValue,
        userId,
        note
      );

      // entry is null if value didn't change
      res.status(entry ? 201 : 200).json({
        success: true,
        data: entry,
        tracked: !!entry,
      });
    } catch (error) {
      console.error('Error tracking price change:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track price change',
      });
    }
  },

  /**
   * Batch track multiple price changes
   * POST /api/v1/leads/:leadId/price-history/track-batch
   */
  async trackBatchPriceChanges(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { changes } = req.body;
      const userId = (req as any).user?.id;

      if (!Array.isArray(changes)) {
        return res.status(400).json({
          success: false,
          error: 'changes must be an array',
        });
      }

      const results = await priceHistoryService.trackMultiplePriceChanges(
        leadId,
        changes,
        userId
      );

      res.status(201).json({
        success: true,
        data: results,
        trackedCount: results.length,
      });
    } catch (error) {
      console.error('Error tracking batch price changes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track price changes',
      });
    }
  },

  /**
   * Delete a price history entry
   * DELETE /api/v1/leads/:leadId/price-history/:historyId
   */
  async deletePriceHistory(req: Request, res: Response) {
    try {
      const { historyId } = req.params;

      await priceHistoryService.deletePriceHistory(historyId);

      res.json({
        success: true,
        message: 'Price history entry deleted',
      });
    } catch (error) {
      console.error('Error deleting price history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete price history',
      });
    }
  },
};

