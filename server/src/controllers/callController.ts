import type { Request, Response } from 'express';
import { callService } from '../services/callService.js';
import { logger } from '../config/logger.js';

export const callController = {
  /**
   * Make outbound call
   */
  async makeCall(req: Request, res: Response) {
    try {
      const { to, leadId } = req.body;
      const userId = (req as any).user?.id;

      if (!to) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }

      // Validate phone number format
      const formattedTo = callService.formatPhoneNumber(to);
      if (!callService.validatePhoneNumber(formattedTo)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format'
        });
      }

      const result = await callService.makeCall({
        to: formattedTo,
        userId,
        leadId
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            callId: result.callId,
            to: formattedTo,
            from: result.fromNumber,
            initiatedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Error in makeCall controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Handle incoming call webhook
   */
  async webhook(req: Request, res: Response) {
    try {
      logger.info('Received call webhook', { body: req.body });

      await callService.handleIncomingCallWebhook(req.body);

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Error in call webhook controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  },

  /**
   * Answer incoming call
   */
  async answerCall(req: Request, res: Response) {
    try {
      const { callControlId } = req.params;

      if (!callControlId) {
        return res.status(400).json({
          success: false,
          error: 'Call control ID is required'
        });
      }

      const result = await callService.answerCall(callControlId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            callId: result.callId,
            status: 'answered'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Error in answerCall controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to answer call'
      });
    }
  },

  /**
   * Hang up call
   */
  async hangupCall(req: Request, res: Response) {
    try {
      const { callControlId } = req.params;

      if (!callControlId) {
        return res.status(400).json({
          success: false,
          error: 'Call control ID is required'
        });
      }

      const result = await callService.hangupCall(callControlId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            callId: result.callId,
            status: 'hung_up'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Error in hangupCall controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to hang up call'
      });
    }
  },

  /**
   * Get call status
   */
  async getCallStatus(req: Request, res: Response) {
    try {
      const { callControlId } = req.params;

      if (!callControlId) {
        return res.status(400).json({
          success: false,
          error: 'Call control ID is required'
        });
      }

      const status = await callService.getCallStatus(callControlId);

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      logger.error('Error in getCallStatus controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get call status'
      });
    }
  },

  /**
   * Get call history
   */
  async getCallHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const callHistory = await callService.getCallHistory(userId);

      res.json({
        success: true,
        data: {
          calls: callHistory,
          total: callHistory.length
        }
      });
    } catch (error: any) {
      logger.error('Error in getCallHistory controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get call history'
      });
    }
  }
};
