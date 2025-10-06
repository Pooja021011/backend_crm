import type { Request, Response } from 'express';
import { googleSheetsService } from '../services/googleSheetsService.js';
import { schedulerService } from '../services/schedulerService.js';

export const googleSheetsConfigController = {
  /**
   * Get Google Sheets configuration
   */
  getConfig: async (_req: Request, res: Response) => {
    try {
      const config = await googleSheetsService.getConfig();
      
      // Don't send full credentials to frontend, just indicate if they exist
      const safeConfig = {
        ...config,
        credentials: config.credentials ? { configured: true } : null,
      };

      res.json({
        success: true,
        data: safeConfig,
      });
    } catch (error: any) {
      console.error('Error getting config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        message: error.message,
      });
    }
  },

  /**
   * Update Google Sheets configuration
   */
  updateConfig: async (req: Request, res: Response) => {
    try {
      const { credentials, spreadsheetId, sheetName, syncEnabled, syncInterval, columnMappings } = req.body;

      const config = await googleSheetsService.updateConfig({
        credentials,
        spreadsheetId,
        sheetName,
        syncEnabled,
        syncInterval,
        columnMappings,
      });

      // Restart scheduler if sync settings changed
      if (syncEnabled !== undefined || syncInterval !== undefined) {
        await schedulerService.restartGoogleSheetsSync();
      }

      // Don't send full credentials back
      const safeConfig = {
        ...config,
        credentials: config.credentials ? { configured: true } : null,
      };

      res.json({
        success: true,
        data: safeConfig,
        message: 'Configuration updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        message: error.message,
      });
    }
  },

  /**
   * Test connection to Google Sheets
   */
  testConnection: async (_req: Request, res: Response) => {
    try {
      const result = await googleSheetsService.testConnection();
      
      res.json({
        success: true,
        data: result,
        message: 'Successfully connected to Google Sheets',
      });
    } catch (error: any) {
      console.error('Error testing connection:', error);
      res.status(500).json({
        success: false,
        error: 'Connection test failed',
        message: error.message,
      });
    }
  },

  /**
   * Manual trigger sync
   */
  triggerSync: async (_req: Request, res: Response) => {
    try {
      const results = await googleSheetsService.triggerManualSync();
      
      res.json({
        success: true,
        data: results,
        message: 'Sync completed successfully',
      });
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      res.status(500).json({
        success: false,
        error: 'Sync failed',
        message: error.message,
      });
    }
  },

  /**
   * Get sync statistics
   */
  getSyncStats: async (_req: Request, res: Response) => {
    try {
      const stats = await googleSheetsService.getSyncStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting sync stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync statistics',
        message: error.message,
      });
    }
  },
};
