import { google } from 'googleapis';
import { prisma } from '../config/db.js';
import { googleSheetsWebhookService } from './googleSheetsWebhookService.js';

export const googleSheetsService = {
  /**
   * Get Google Sheets configuration
   */
  async getConfig() {
    let config = await prisma.googleSheetsConfig.findUnique({
      where: { id: 'global' },
    });

    if (!config) {
      // Create default config
      config = await prisma.googleSheetsConfig.create({
        data: {
          id: 'global',
          syncEnabled: false,
          syncInterval: 60,
        },
      });
    }

    return config;
  },

  /**
   * Update Google Sheets configuration
   */
  async updateConfig(data: {
    credentials?: any;
    spreadsheetId?: string;
    sheetName?: string;
    syncEnabled?: boolean;
    syncInterval?: number;
    columnMappings?: any;
  }) {
    return prisma.googleSheetsConfig.upsert({
      where: { id: 'global' },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        id: 'global',
        ...data,
        syncEnabled: data.syncEnabled ?? false,
        syncInterval: data.syncInterval ?? 60,
      },
    });
  },

  /**
   * Test Google Sheets connection
   */
  async testConnection() {
    const config = await this.getConfig();

    if (!config.credentials || !config.spreadsheetId) {
      throw new Error('Google Sheets not configured. Please add credentials and spreadsheet ID.');
    }

    try {
      const sheets = await this.getSheetsClient();
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: config.spreadsheetId,
      });

      return {
        success: true,
        title: spreadsheet.data.properties?.title,
        sheets: spreadsheet.data.sheets?.map((s) => s.properties?.title),
      };
    } catch (error: any) {
      throw new Error(`Google Sheets connection failed: ${error.message}`);
    }
  },

  /**
   * Get authenticated Google Sheets client
   */
  async getSheetsClient() {
    const config = await this.getConfig();

    if (!config.credentials) {
      throw new Error('Google Sheets credentials not configured');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: config.credentials as any,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
  },

  /**
   * Sync leads from Google Sheets
   */
  async syncLeads() {
    const config = await this.getConfig();

    if (!config.syncEnabled) {
      throw new Error('Google Sheets sync is not enabled');
    }

    if (!config.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    // Update status to running
    await prisma.googleSheetsConfig.update({
      where: { id: 'global' },
      data: { lastSyncStatus: 'running' },
    });

    try {
      const sheets = await this.getSheetsClient();
      const sheetName = config.sheetName || 'Sheet1';

      // Get all data from the sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A:Z`, // Get columns A to Z
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        await this.updateSyncStatus('success', null, 0);
        return { processed: 0, created: 0, duplicates: 0, errors: 0 };
      }

      // First row is headers
      const headers = rows[config.headerRow - 1].map((h) => h.toString().trim());
      const dataRows = rows.slice(config.headerRow);

      const results = {
        processed: 0,
        created: 0,
        duplicates: 0,
        errors: 0,
      };

      // Process each row
      for (const row of dataRows) {
        results.processed++;

        // Skip empty rows
        if (row.every((cell) => !cell || cell === '')) continue;

        try {
          // Convert row to lead object
          const leadData: any = {};
          headers.forEach((header, index) => {
            if (row[index]) {
              leadData[header] = row[index];
            }
          });

          // Check for duplicate
          const isDuplicate = await this.checkDuplicate(leadData);
          if (isDuplicate) {
            results.duplicates++;
            continue;
          }

          // Create lead
          await googleSheetsWebhookService.processIncomingLead(leadData);
          results.created++;
        } catch (error: any) {
          console.error('Error processing row:', error.message);
          results.errors++;
        }
      }

      // Update sync status
      await this.updateSyncStatus('success', null, results.created);

      return results;
    } catch (error: any) {
      console.error('Sync error:', error);
      await this.updateSyncStatus('error', error.message, 0);
      throw error;
    }
  },

  /**
   * Check if lead already exists (duplicate detection)
   */
  async checkDuplicate(leadData: any): Promise<boolean> {
    const email = leadData.email?.toLowerCase().trim();
    const phone = leadData.phone?.replace(/[^\d]/g, ''); // Remove non-digits

    if (!email && !phone) return false;

    // Check in seller details
    const existingSeller = await prisma.sellerDetail.findFirst({
      where: {
        OR: [
          email ? { email: { equals: email, mode: 'insensitive' } } : {},
          phone ? { phone: { contains: phone } } : {},
        ],
      },
    });

    if (existingSeller) return true;

    // Check in buyer details
    const existingBuyer = await prisma.buyerDetail.findFirst({
      where: {
        OR: [
          email ? { email: { equals: email, mode: 'insensitive' } } : {},
          phone ? { phone: { contains: phone } } : {},
        ],
      },
    });

    if (existingBuyer) return true;

    // Check in vendor details
    const existingVendor = await prisma.vendorDetail.findFirst({
      where: {
        OR: [
          email ? { email: { equals: email, mode: 'insensitive' } } : {},
          phone ? { phone: { contains: phone } } : {},
        ],
      },
    });

    return !!existingVendor;
  },

  /**
   * Update sync status
   */
  async updateSyncStatus(status: string, error: string | null, leadsAdded: number) {
    const config = await this.getConfig();

    return prisma.googleSheetsConfig.update({
      where: { id: 'global' },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        lastSyncError: error,
        totalLeadsSynced: config.totalLeadsSynced + leadsAdded,
      },
    });
  },

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const config = await this.getConfig();

    // Get leads synced in last 24 hours
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentLeads = await prisma.lead.count({
      where: {
        createdAt: { gte: last24Hours },
        customFields: {
          path: ['leadSource'],
          equals: 'Google Sheets',
        },
      },
    });

    return {
      syncEnabled: config.syncEnabled,
      lastSyncAt: config.lastSyncAt,
      lastSyncStatus: config.lastSyncStatus,
      lastSyncError: config.lastSyncError,
      totalLeadsSynced: config.totalLeadsSynced,
      leadsLast24Hours: recentLeads,
      syncInterval: config.syncInterval,
    };
  },

  /**
   * Manual trigger sync
   */
  async triggerManualSync() {
    const config = await this.getConfig();

    if (!config.syncEnabled) {
      throw new Error('Sync is not enabled. Please enable sync in settings.');
    }

    return this.syncLeads();
  },
};
