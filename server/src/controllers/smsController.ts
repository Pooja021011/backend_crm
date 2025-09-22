import type { Request, Response } from 'express';
import { smsService } from '../services/smsService.js';
import { logger } from '../config/logger.js';

export const smsController = {
  /**
   * Send single SMS
   */
  async sendSMS(req: Request, res: Response) {
    try {
      const { to, text, leadId } = req.body;
      const userId = (req as any).user?.id;

      if (!to || !text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, text'
        });
      }

      // Validate phone number format
      const formattedTo = smsService.formatPhoneNumber(to);
      if (!smsService.validatePhoneNumber(formattedTo)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format'
        });
      }

      const result = await smsService.sendSMS({
        to: formattedTo,
        from: process.env.TELNYX_PHONE_NUMBER || '',
        text,
        leadId,
        userId
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            messageId: result.messageId,
            to: formattedTo,
            text,
            sentAt: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Error in sendSMS controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(req: Request, res: Response) {
    try {
      const { messages } = req.body;
      const userId = (req as any).user?.id;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required and cannot be empty'
        });
      }

      // Validate and format all messages
      const formattedMessages = messages.map((msg: any) => {
        if (!msg.to || !msg.text) {
          throw new Error('Each message must have "to" and "text" fields');
        }

        const formattedTo = smsService.formatPhoneNumber(msg.to);
        if (!smsService.validatePhoneNumber(formattedTo)) {
          throw new Error(`Invalid phone number: ${msg.to}`);
        }

        return {
          to: formattedTo,
          from: process.env.TELNYX_PHONE_NUMBER || '',
          text: msg.text,
          leadId: msg.leadId,
          userId
        };
      });

      const results = await smsService.sendBulkSMS(formattedMessages);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.json({
        success: true,
        data: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          results
        }
      });
    } catch (error: any) {
      logger.error('Error in sendBulkSMS controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Handle incoming SMS webhook
   */
  async webhook(req: Request, res: Response) {
    try {
      logger.info('Received SMS webhook', { body: req.body });

      await smsService.handleIncomingWebhook(req.body);

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Error in SMS webhook controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  },

  /**
   * Get message status
   */
  async getMessageStatus(req: Request, res: Response) {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        return res.status(400).json({
          success: false,
          error: 'Message ID is required'
        });
      }

      const status = await smsService.getMessageStatus(messageId);

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      logger.error('Error in getMessageStatus controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get message status'
      });
    }
  },

  /**
   * Get available phone numbers
   */
  async getAvailableNumbers(req: Request, res: Response) {
    try {
      const numbers = await smsService.getAvailableNumbers();

      res.json({
        success: true,
        data: numbers
      });
    } catch (error: any) {
      logger.error('Error in getAvailableNumbers controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get available numbers'
      });
    }
  },

  /**
   * Get SMS history/conversations
   */
  async getSMSHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { limit = 50, offset = 0 } = req.query;

      // For now, return mock data until we implement proper SMS storage
      const mockSMSHistory = [
        {
          id: '1',
          phoneNumber: '+1234567890',
          contactName: 'John Doe',
          lastMessage: 'Thanks for the property information!',
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          unreadCount: 2,
          direction: 'INBOUND',
          messages: [
            {
              id: 'msg1',
              text: 'Hi, I\'m interested in the property at 123 Main St.',
              direction: 'INBOUND',
              timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
              status: 'delivered'
            },
            {
              id: 'msg2', 
              text: 'Hello! I\'d be happy to help. The property is a 3BR/2BA house with a great location.',
              direction: 'OUTBOUND',
              timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
              status: 'delivered'
            },
            {
              id: 'msg3',
              text: 'Thanks for the property information!',
              direction: 'INBOUND', 
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
              status: 'delivered'
            }
          ]
        },
        {
          id: '2',
          phoneNumber: '+1987654321',
          contactName: 'Jane Smith',
          lastMessage: 'Can we schedule a viewing?',
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          unreadCount: 1,
          direction: 'INBOUND',
          messages: [
            {
              id: 'msg4',
              text: 'I saw your listing online. Is it still available?',
              direction: 'INBOUND',
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
              status: 'delivered'
            },
            {
              id: 'msg5',
              text: 'Yes, it\'s still available! Would you like to schedule a viewing?',
              direction: 'OUTBOUND',
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(), // 2.5 hours ago
              status: 'delivered'
            },
            {
              id: 'msg6',
              text: 'Can we schedule a viewing?',
              direction: 'INBOUND',
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
              status: 'delivered'
            }
          ]
        }
      ];

      res.json({
        success: true,
        data: {
          conversations: mockSMSHistory,
          total: mockSMSHistory.length,
          hasMore: false
        }
      });
    } catch (error: any) {
      logger.error('Error in getSMSHistory controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get SMS history'
      });
    }
  }
};
