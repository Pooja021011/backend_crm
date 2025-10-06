import type { Request, Response } from 'express';
import { googleSheetsWebhookService } from '../services/googleSheetsWebhookService.js';
import { leadAssignmentService } from '../services/leadAssignmentService.js';
import crypto from 'crypto';

// Webhook secret for validation (should be in env variables in production)
const WEBHOOK_SECRET = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || 'your-secure-webhook-secret-change-this';

export const googleSheetsWebhookController = {
  /**
   * Handle incoming webhook from Google Sheets
   * POST /api/google-sheets/webhook
   */
  handleWebhook: async (req: Request, res: Response) => {
    try {
      // Validate webhook signature if provided
      const signature = req.headers['x-webhook-signature'] as string;
      if (signature) {
        const isValid = validateWebhookSignature(req.body, signature);
        if (!isValid) {
          return res.status(401).json({
            success: false,
            error: 'Invalid webhook signature',
          });
        }
      }

      const { lead, leads } = req.body;

      // Handle single lead
      if (lead) {
        const createdLead = await googleSheetsWebhookService.processIncomingLead(lead);
        return res.status(201).json({
          success: true,
          data: createdLead,
          message: 'Lead created and assigned successfully',
        });
      }

      // Handle batch leads
      if (leads && Array.isArray(leads)) {
        const results = await googleSheetsWebhookService.processBatchLeads(leads);
        return res.status(200).json({
          success: true,
          data: results,
          message: `Processed ${results.successful.length} leads successfully, ${results.failed.length} failed`,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid request format. Expected "lead" or "leads" in request body',
      });
    } catch (error: any) {
      console.error('Webhook error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        message: error.message,
      });
    }
  },

  /**
   * Test webhook endpoint
   * POST /api/google-sheets/test-webhook
   */
  testWebhook: async (req: Request, res: Response) => {
    try {
      const testLead = {
        leadType: 'SELLER',
        firstName: 'Test',
        lastName: 'Lead',
        email: 'test@example.com',
        phone: '+1234567890',
        address1: '123 Test St',
        city: 'Charlotte',
        state: 'NC',
        zip: '28202',
        motivation: 'Testing webhook integration',
        notes: 'This is a test lead from webhook',
        leadSource: 'Google Sheets Test',
      };

      const createdLead = await googleSheetsWebhookService.processIncomingLead(testLead);

      return res.status(201).json({
        success: true,
        data: createdLead,
        message: 'Test lead created successfully',
      });
    } catch (error: any) {
      console.error('Test webhook error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create test lead',
        message: error.message,
      });
    }
  },

  /**
   * Get webhook statistics
   * GET /api/google-sheets/stats
   */
  getWebhookStats: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const stats = await googleSheetsWebhookService.getWebhookStats(start, end);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching webhook stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch webhook statistics',
        message: error.message,
      });
    }
  },

  /**
   * Get distribution stats
   * GET /api/google-sheets/distribution-stats
   */
  getDistributionStats: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const stats = await leadAssignmentService.getDistributionStats(start, end);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching distribution stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch distribution statistics',
        message: error.message,
      });
    }
  },

  /**
   * Get webhook configuration info
   * GET /api/google-sheets/config
   */
  getWebhookConfig: async (req: Request, res: Response) => {
    try {
      const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
      const webhookUrl = `${baseUrl}/api/google-sheets/webhook`;

      return res.json({
        success: true,
        data: {
          webhookUrl,
          method: 'POST',
          contentType: 'application/json',
          requiresAuthentication: true,
          headers: {
            'x-webhook-signature': 'HMAC-SHA256 signature (optional)',
          },
          samplePayload: {
            lead: {
              leadType: 'SELLER',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              phone: '+1234567890',
              address1: '123 Main St',
              city: 'Charlotte',
              state: 'NC',
              zip: '28202',
              motivation: 'Quick sale needed',
              leadSource: 'Google Sheets',
            },
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get webhook configuration',
        message: error.message,
      });
    }
  },
};

/**
 * Validate webhook signature using HMAC-SHA256
 */
function validateWebhookSignature(payload: any, signature: string): boolean {
  try {
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}
