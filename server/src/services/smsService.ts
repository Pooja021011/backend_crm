import Telnyx from 'telnyx';
import { logger } from '../config/logger.js';
import { prisma } from '../config/db.js';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { smsSettingsRepository } from '../repositories/smsSettingsRepository.js';

// Initialize Telnyx client
const telnyx = Telnyx(process.env.TELNYX_API_KEY);

export interface SMSMessage {
  to: string;
  from: string;
  text: string;
  leadId?: string;
  userId?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: any;
}

export const smsService = {
  /**
   * Send SMS using Telnyx with user-specific phone number
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    try {
      // Get user's SMS settings to determine the from number
      let fromNumber = message.from;
      if (message.userId && !fromNumber) {
        const userSmsSettings = await smsSettingsRepository.getUserSmsSettings(message.userId);
        if (userSmsSettings?.phoneNumber) {
          fromNumber = userSmsSettings.phoneNumber;
        } else {
          return {
            success: false,
            error: 'No phone number configured for this user. Please configure your SMS settings.',
          };
        }
      }

      if (!fromNumber) {
        return {
          success: false,
          error: 'From phone number is required',
        };
      }

      logger.info('Sending SMS via Telnyx', { to: message.to, from: fromNumber, userId: message.userId });

      const response = await telnyx.messages.create({
        from: fromNumber,
        to: message.to,
        text: message.text,
      });

      logger.info('SMS sent successfully', { messageId: response.data.id });

      // Store SMS in communication history if leadId is provided
      if (message.leadId) {
        await communicationRepository.create(message.leadId, {
          type: 'SMS',
          direction: 'OUTBOUND',
          subject: `SMS to ${message.to}`,
          body: message.text,
          occurredAt: new Date(),
          createdById: message.userId,
        });
      }

      return {
        success: true,
        messageId: response.data.id,
        data: response.data,
        fromNumber,
      };
    } catch (error: any) {
      logger.error('Failed to send SMS via Telnyx', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Handle incoming SMS webhook from Telnyx
   */
  async handleIncomingWebhook(webhookData: any): Promise<void> {
    try {
      logger.info('Processing incoming SMS webhook', { webhookData });

      const { data } = webhookData;
      const { payload } = data;

      if (payload.event_type === 'message.received') {
        const { from, to, text, id: messageId } = payload;

        logger.info('Received SMS', { from, to, text, messageId });

        // Find user by phone number to associate the SMS
        const userSmsSettings = await smsSettingsRepository.findByPhoneNumber(to);
        
        if (userSmsSettings) {
          // Try to find lead by phone number
          const lead = await this.findLeadByPhoneNumber(from);
          
          if (lead) {
            // Store incoming SMS in communication history
            await communicationRepository.create(lead.id, {
              type: 'SMS',
              direction: 'INBOUND',
              subject: `SMS from ${from}`,
              body: text,
              occurredAt: new Date(),
              createdById: userSmsSettings.userId,
            });
            
            logger.info('Incoming SMS stored in communication history', { 
              leadId: lead.id, 
              from, 
              userId: userSmsSettings.userId 
            });
          } else {
            logger.info('No lead found for incoming SMS phone number', { from });
          }
        } else {
          logger.info('No user found for SMS destination number', { to });
        }
      }
      
      // Handle delivery status updates
      if (payload.event_type === 'message.sent' || payload.event_type === 'message.delivered' || payload.event_type === 'message.delivery_failed') {
        logger.info('SMS delivery status update', { 
          eventType: payload.event_type,
          messageId: payload.id,
          status: payload.delivery_status 
        });
        // TODO: Update communication record with delivery status for risk management metrics
      }
    } catch (error: any) {
      logger.error('Failed to process incoming SMS webhook', { error: error.message });
      throw error;
    }
  },

  /**
   * Find lead by phone number
   */
  async findLeadByPhoneNumber(phoneNumber: string): Promise<any> {
    try {
      // Search in lead phone fields
      const lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { phone: phoneNumber },
            { phone: phoneNumber.replace(/\D/g, '') }, // Try without formatting
            { phone: phoneNumber.replace(/^\+1/, '') }, // Try without +1
          ]
        }
      });
      
      return lead;
    } catch (error: any) {
      logger.error('Error finding lead by phone number', { error: error.message, phoneNumber });
      return null;
    }
  },

  /**
   * Get SMS delivery status
   */
  async getMessageStatus(messageId: string): Promise<any> {
    try {
      const response = await telnyx.messages.retrieve(messageId);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get message status', { error: error.message });
      throw error;
    }
  },

  /**
   * List available phone numbers
   */
  async getAvailableNumbers(): Promise<any[]> {
    try {
      const response = await telnyx.phoneNumbers.list({
        filter: {
          status: 'purchased',
        },
      });
      return response.data || [];
    } catch (error: any) {
      logger.error('Failed to get available numbers', { error: error.message });
      return [];
    }
  },

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];

    for (const message of messages) {
      const result = await this.sendSMS(message);
      results.push(result);
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  },

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  },

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming US +1)
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    return `+${digits}`;
  }
};
