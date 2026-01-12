import twilio from 'twilio';
import { logger } from '../config/logger.js';
import { prisma } from '../config/db.js';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { smsSettingsRepository } from '../repositories/smsSettingsRepository.js';
import { communicationResponseService } from './communicationResponseService.js';

// Initialize Twilio client
// #region agent log
fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:8',message:'Initializing Twilio client',data:{hasSID:!!process.env.TWILIO_ACCOUNT_SID,hasToken:!!process.env.TWILIO_AUTH_TOKEN,sidPrefix:process.env.TWILIO_ACCOUNT_SID?.substring(0,4)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
// #endregion
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
// #region agent log
fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:11',message:'Twilio client created',data:{clientType:typeof twilioClient,hasMessagesAPI:typeof twilioClient?.messages},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
// #endregion

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
  fromNumber?: string;
}

export const smsService = {
  /**
   * Send SMS using Twilio with user-specific phone number
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:35',message:'sendSMS called',data:{to:message.to,hasFrom:!!message.from,userId:message.userId,leadId:message.leadId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
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

      logger.info('Sending SMS via Twilio', { to: message.to, from: fromNumber, userId: message.userId });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:57',message:'Calling Twilio API',data:{from:fromNumber,to:message.to,bodyLength:message.text?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      const response = await twilioClient.messages.create({
        from: fromNumber,
        to: message.to,
        body: message.text,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:64',message:'Twilio API response',data:{sid:response.sid,status:response.status,errorCode:response.errorCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      logger.info('SMS sent successfully', { messageId: response.sid });

      // Store SMS in communication history
      let storedLeadId = message.leadId;
      
      // If no leadId provided, try to find a lead with this phone number
      if (!storedLeadId && message.userId) {
        try {
          const lead = await prisma.lead.findFirst({
            where: {
              OR: [
                { seller: { phone: message.to } },
                { buyer: { phone: message.to } },
                { vendor: { phone: message.to } }
              ]
            }
          });
          
          if (lead) {
            storedLeadId = lead.id;
            logger.info('Found lead for phone number', { leadId: lead.id, phone: message.to });
          } else {
            logger.warn('No lead found for phone number', { phone: message.to });
          }
        } catch (error: any) {
          logger.error('Error finding lead for phone number', { error: error.message, phone: message.to });
        }
      }
      
      // Store the communication if we have a leadId
      if (storedLeadId) {
        try {
          await communicationRepository.create(storedLeadId, {
            type: 'SMS',
            direction: 'OUTBOUND',
            subject: `SMS to ${message.to}`,
            body: message.text,
            occurredAt: new Date(),
            createdById: message.userId,
            metadata: {
              from: fromNumber,
              to: message.to,
              messageSid: response.sid,
              status: response.status,
            },
          });
          
          // NEW: Auto-update lead status based on communication
          await communicationResponseService.handleCommunicationEvent(
            storedLeadId,
            'OUTBOUND',
            'SMS'
          ).catch(err => logger.error('Failed to handle communication event', { err }));
        } catch (error) {
          logger.error('Failed to store SMS communication', { error });
        }
      }

      return {
        success: true,
        messageId: response.sid,
        data: response,
        fromNumber,
      };
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:98',message:'SMS send error',data:{errorMsg:error.message,errorCode:error.code,errorStatus:error.status,errorDetails:error.moreInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'sms-send',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      logger.error('Failed to send SMS via Twilio', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Handle incoming SMS webhook from Twilio
   */
  async handleIncomingWebhook(webhookData: any): Promise<void> {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:98',message:'Webhook received',data:{keys:Object.keys(webhookData),hasFrom:!!webhookData.From,hasTo:!!webhookData.To},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      logger.info('Processing incoming SMS webhook', { webhookData });

      // Twilio webhook format
      const { From: from, To: to, Body: text, MessageSid: messageId, SmsStatus: smsStatus } = webhookData;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:105',message:'Webhook parsed',data:{from,to,hasText:!!text,messageId,smsStatus},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion

      // Handle incoming message
      if (text && from && to) {
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
              metadata: {
                from,
                to,
                messageSid: messageId,
                status: smsStatus,
              },
            });
            
            logger.info('Incoming SMS stored in communication history', { 
              leadId: lead.id, 
              from, 
              userId: userSmsSettings.userId 
            });
            
            // NEW: Auto-update lead status based on communication
            await communicationResponseService.handleCommunicationEvent(
              lead.id,
              'INBOUND',
              'SMS'
            ).catch(err => logger.error('Failed to handle communication event', { err }));
          } else {
            logger.info('No lead found for incoming SMS phone number', { from });
          }
        } else {
          logger.info('No user found for SMS destination number', { to });
        }
      }
      
      // Handle delivery status updates
      if (smsStatus && messageId) {
        logger.info('SMS delivery status update', { 
          messageId,
          status: smsStatus 
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:155',message:'Finding lead by phone',data:{phoneNumber,phoneLength:phoneNumber?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      // Search in lead detail tables (seller, buyer, vendor, owners) for phone numbers
      const lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { seller: { phone: phoneNumber } },
            { seller: { phone: phoneNumber.replace(/\D/g, '') } },
            { seller: { phone: phoneNumber.replace(/^\+1/, '') } },
            { buyer: { phone: phoneNumber } },
            { buyer: { phone: phoneNumber.replace(/\D/g, '') } },
            { buyer: { phone: phoneNumber.replace(/^\+1/, '') } },
            { vendor: { phone: phoneNumber } },
            { vendor: { phone: phoneNumber.replace(/\D/g, '') } },
            { vendor: { phone: phoneNumber.replace(/^\+1/, '') } },
            { owners: { some: { phone: phoneNumber } } },
            { owners: { some: { phone: phoneNumber.replace(/\D/g, '') } } },
            { owners: { some: { phone: phoneNumber.replace(/^\+1/, '') } } },
          ]
        },
        include: {
          seller: true,
          buyer: true,
          vendor: true,
          owners: true,
        }
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsService.ts:178',message:'Lead search result',data:{found:!!lead,leadId:lead?.id,leadType:lead?.leadType},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
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
      const message = await twilioClient.messages(messageId).fetch();
      return message;
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
      const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
      return phoneNumbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        sid: number.sid,
        capabilities: number.capabilities,
      }));
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
