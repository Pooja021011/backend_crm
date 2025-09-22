import Telnyx from 'telnyx';
import { logger } from '../config/logger.js';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { smsSettingsRepository } from '../repositories/smsSettingsRepository.js';

// Initialize Telnyx client
const telnyx = Telnyx(process.env.TELNYX_API_KEY);

export interface CallRequest {
  to: string;
  from?: string;
  userId?: string;
  leadId?: string;
}

export interface CallResponse {
  success: boolean;
  callId?: string;
  error?: string;
  data?: any;
  fromNumber?: string;
}

export const callService = {
  /**
   * Initiate outbound call using Telnyx Voice API
   */
  async makeCall(callRequest: CallRequest): Promise<CallResponse> {
    try {
      // Get user's phone number from SMS settings (same number for calls)
      let fromNumber = callRequest.from;
      if (callRequest.userId && !fromNumber) {
        const userSmsSettings = await smsSettingsRepository.getUserSmsSettings(callRequest.userId);
        if (userSmsSettings?.phoneNumber) {
          fromNumber = userSmsSettings.phoneNumber;
        } else {
          return {
            success: false,
            error: 'No phone number configured for this user. Please configure your SMS and Call settings.',
          };
        }
      }

      if (!fromNumber) {
        return {
          success: false,
          error: 'From phone number is required',
        };
      }

      logger.info('Initiating call via Telnyx', { 
        to: callRequest.to, 
        from: fromNumber, 
        userId: callRequest.userId 
      });

      // Create the call using Telnyx Voice API
      const response = await telnyx.calls.create({
        to: callRequest.to,
        from: fromNumber,
        connection_id: process.env.TELNYX_CONNECTION_ID, // Voice connection ID
        webhook_url: `${process.env.APP_BASE_URL}/api/v1/calls/webhook`,
        webhook_url_method: 'POST',
      });

      logger.info('Call initiated successfully', { callId: response.data.call_control_id });

      // Store call record in communication history
      if (callRequest.leadId) {
        await communicationRepository.create(callRequest.leadId, {
          type: 'CALL',
          direction: 'OUTBOUND',
          subject: `Call to ${callRequest.to}`,
          body: `Outbound call initiated to ${callRequest.to}`,
          occurredAt: new Date(),
          createdById: callRequest.userId,
        });
      }

      return {
        success: true,
        callId: response.data.call_control_id,
        data: response.data,
        fromNumber,
      };
    } catch (error: any) {
      logger.error('Failed to initiate call via Telnyx', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Handle incoming call webhook from Telnyx
   */
  async handleIncomingCallWebhook(webhookData: any): Promise<void> {
    try {
      logger.info('Processing incoming call webhook', { webhookData });

      const { data } = webhookData;
      const { payload } = data;

      if (payload.event_type === 'call.initiated') {
        const { from, to, call_control_id } = payload;

        logger.info('Incoming call received', { from, to, callId: call_control_id });

        // Find user by phone number to log the call
        const userSmsSettings = await smsSettingsRepository.findByPhoneNumber(to);
        
        if (userSmsSettings) {
          // You can implement auto-answer, forwarding, or other call handling logic here
          logger.info('Call matched to user', { 
            userId: userSmsSettings.userId, 
            userPhone: to 
          });
        }

        // For now, just log the incoming call
        logger.info('Incoming call processed', { from, to, callId: call_control_id });
      }
    } catch (error: any) {
      logger.error('Failed to process incoming call webhook', { error: error.message });
      throw error;
    }
  },

  /**
   * Answer an incoming call
   */
  async answerCall(callControlId: string): Promise<CallResponse> {
    try {
      logger.info('Answering call', { callControlId });

      const response = await telnyx.calls.answer({
        call_control_id: callControlId,
      });

      logger.info('Call answered successfully', { callControlId });

      return {
        success: true,
        callId: callControlId,
        data: response.data,
      };
    } catch (error: any) {
      logger.error('Failed to answer call', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Hang up a call
   */
  async hangupCall(callControlId: string): Promise<CallResponse> {
    try {
      logger.info('Hanging up call', { callControlId });

      const response = await telnyx.calls.hangup({
        call_control_id: callControlId,
      });

      logger.info('Call hung up successfully', { callControlId });

      return {
        success: true,
        callId: callControlId,
        data: response.data,
      };
    } catch (error: any) {
      logger.error('Failed to hang up call', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get call status
   */
  async getCallStatus(callControlId: string): Promise<any> {
    try {
      const response = await telnyx.calls.retrieve(callControlId);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get call status', { error: error.message });
      throw error;
    }
  },

  /**
   * Validate phone number format (same as SMS)
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  },

  /**
   * Format phone number to E.164 format (same as SMS)
   */
  formatPhoneNumber(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    return `+${digits}`;
  },

  /**
   * Get call history for a user (mock data for now)
   */
  async getCallHistory(userId: string): Promise<any[]> {
    try {
      // For now, return mock call history data
      const mockCallHistory = [
        {
          id: '1',
          phoneNumber: '+1234567890',
          contactName: 'John Doe',
          direction: 'OUTBOUND',
          status: 'completed',
          duration: 180, // seconds
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          callId: 'call_123'
        },
        {
          id: '2',
          phoneNumber: '+1987654321',
          contactName: 'Jane Smith',
          direction: 'INBOUND',
          status: 'missed',
          duration: 0,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          callId: 'call_456'
        },
        {
          id: '3',
          phoneNumber: '+1555666777',
          contactName: 'Mike Johnson',
          direction: 'OUTBOUND',
          status: 'completed',
          duration: 420, // seconds
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
          callId: 'call_789'
        }
      ];

      return mockCallHistory;
    } catch (error: any) {
      logger.error('Failed to get call history', { error: error.message });
      return [];
    }
  }
};
