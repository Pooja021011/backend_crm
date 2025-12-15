import twilio from 'twilio';
import { logger } from '../config/logger.js';
import { prisma } from '../config/db.js';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { smsSettingsRepository } from '../repositories/smsSettingsRepository.js';

// Initialize Twilio client
// #region agent log
fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callService.ts:8',message:'Initializing Twilio for calls',data:{hasSID:!!process.env.TWILIO_ACCOUNT_SID,hasToken:!!process.env.TWILIO_AUTH_TOKEN,baseURL:process.env.APP_BASE_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
// #endregion
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
// #region agent log
fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callService.ts:11',message:'Twilio call client ready',data:{hasCallsAPI:typeof twilioClient?.calls},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
// #endregion

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
   * Initiate outbound call using Twilio Voice API
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

      logger.info('Initiating call via Twilio', { 
        to: callRequest.to, 
        from: fromNumber, 
        userId: callRequest.userId 
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callService.ts:62',message:'Initiating call',data:{to:callRequest.to,from:fromNumber,twimlUrl:`${process.env.APP_BASE_URL}/api/v1/calls/twiml`,statusCallback:`${process.env.APP_BASE_URL}/api/v1/calls/webhook`},timestamp:Date.now(),sessionId:'debug-session',runId:'call-make',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Create the call using Twilio Voice API
      // This will call YOUR phone first, then connect to the contact
      const call = await twilioClient.calls.create({
        to: fromNumber, // Call YOUR phone first
        from: fromNumber, // From your Twilio number
        url: `${process.env.APP_BASE_URL}/api/v1/calls/twiml?contactNumber=${encodeURIComponent(callRequest.to)}`, // Pass contact number to TwiML
        statusCallback: `${process.env.APP_BASE_URL}/api/v1/calls/webhook`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callService.ts:76',message:'Call created',data:{sid:call.sid,status:call.status,direction:call.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'call-make',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      logger.info('Call initiated successfully', { callId: call.sid });

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
        callId: call.sid,
        data: call,
        fromNumber,
      };
    } catch (error: any) {
      logger.error('Failed to initiate call via Twilio', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Handle incoming call webhook from Twilio
   */
  async handleIncomingCallWebhook(webhookData: any): Promise<void> {
    try {
      logger.info('Processing incoming call webhook', { webhookData });

      // Twilio webhook format
      const { 
        From: from, 
        To: to, 
        CallSid: callSid, 
        CallStatus: callStatus,
        CallDuration: callDuration,
        Direction: direction 
      } = webhookData;

      // Handle incoming call initiated
      if (callStatus === 'ringing' && direction === 'inbound') {
        logger.info('Incoming call received', { from, to, callSid });

        // Find user by phone number to associate the call
        const userSmsSettings = await smsSettingsRepository.findByPhoneNumber(to);
        
        if (userSmsSettings) {
          // Try to find lead by phone number
          const lead = await this.findLeadByPhoneNumber(from);
          
          if (lead) {
            // Store incoming call in communication history
            await communicationRepository.create(lead.id, {
              type: 'CALL',
              direction: 'INBOUND',
              subject: `Incoming call from ${from}`,
              body: `Inbound call received from ${from}`,
              occurredAt: new Date(),
              createdById: userSmsSettings.userId,
            });
            
            logger.info('Incoming call stored in communication history', { 
              leadId: lead.id, 
              from, 
              userId: userSmsSettings.userId,
              callSid 
            });
          } else {
            logger.info('No lead found for incoming call phone number', { from });
          }
        } else {
          logger.info('No user found for call destination number', { to });
        }
      }
      
      // Handle call status updates (answered, completed, etc.)
      if (callStatus === 'in-progress' || callStatus === 'completed' || callStatus === 'failed') {
        logger.info('Call status update', { 
          callStatus,
          callSid,
          duration: callDuration 
        });
        // TODO: Update communication record with call duration for metrics
      }
    } catch (error: any) {
      logger.error('Failed to process incoming call webhook', { error: error.message });
      throw error;
    }
  },

  /**
   * Find lead by phone number
   */
  async findLeadByPhoneNumber(phoneNumber: string): Promise<any> {
    try {
      // Search in lead detail tables (seller, buyer, vendor) for phone numbers
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
          ]
        },
        include: {
          seller: true,
          buyer: true,
          vendor: true,
        }
      });
      
      return lead;
    } catch (error: any) {
      logger.error('Error finding lead by phone number', { error: error.message, phoneNumber });
      return null;
    }
  },

  /**
   * Answer an incoming call (Twilio handles this via TwiML)
   * Note: Twilio calls are answered via TwiML responses, not by updating status
   */
  async answerCall(callSid: string): Promise<CallResponse> {
    try {
      logger.info('Fetching call status', { callSid });

      // Fetch call information (Twilio handles answering via TwiML)
      const call = await twilioClient.calls(callSid).fetch();

      logger.info('Call info retrieved', { callSid, status: call.status });

      return {
        success: true,
        callId: callSid,
        data: call,
      };
    } catch (error: any) {
      logger.error('Failed to fetch call info', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Hang up a call
   */
  async hangupCall(callSid: string): Promise<CallResponse> {
    try {
      logger.info('Hanging up call', { callSid });

      const call = await twilioClient.calls(callSid).update({
        status: 'completed'
      });

      logger.info('Call hung up successfully', { callSid });

      return {
        success: true,
        callId: callSid,
        data: call,
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
  async getCallStatus(callSid: string): Promise<any> {
    try {
      const call = await twilioClient.calls(callSid).fetch();
      return call;
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
   * Get call history for a user from database
   */
  async getCallHistory(userId: string): Promise<any[]> {
    try {
      logger.info('Fetching call history from database', { userId });

      // Fetch real call communications from database
      const communications = await prisma.communication.findMany({
        where: {
          type: 'CALL',
          OR: [
            { createdById: userId },
            { lead: { assignedUserId: userId } },
            { lead: { createdById: userId } },
          ]
        },
        include: {
          lead: {
            include: {
              seller: true,
              buyer: true,
              vendor: true,
              address: true
            }
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          occurredAt: 'desc'
        },
        take: 100 // Limit to recent 100 calls
      });

      // Transform communications to call history format
      const callHistory = communications.map(comm => {
        let phoneNumber = '';
        let contactName = 'Unknown';

        // Determine phone number and contact name based on lead type
        if (comm.lead) {
          if (comm.lead.seller?.phone) {
            phoneNumber = comm.lead.seller.phone;
            contactName = `${comm.lead.seller.firstName} ${comm.lead.seller.lastName}`;
          } else if (comm.lead.buyer?.phone) {
            phoneNumber = comm.lead.buyer.phone;
            contactName = `${comm.lead.buyer.firstName} ${comm.lead.buyer.lastName}`;
          } else if (comm.lead.vendor?.phone) {
            phoneNumber = comm.lead.vendor.phone;
            contactName = `${comm.lead.vendor.firstName} ${comm.lead.vendor.lastName}`;
          }
        }

        // Fallback: try to extract phone from subject/body
        if (!phoneNumber) {
          const phoneMatch = comm.subject?.match(/\+?\d{10,15}/) || comm.body?.match(/\+?\d{10,15}/);
          if (phoneMatch) {
            phoneNumber = phoneMatch[0];
          }
        }

        return {
          id: comm.id,
          phoneNumber: phoneNumber || 'Unknown',
          contactName: contactName,
          direction: comm.direction,
          status: 'completed', // Default status, can be enhanced later
          duration: 0, // Duration not tracked yet, can be added later
          timestamp: comm.occurredAt.toISOString(),
          callId: comm.id,
          leadId: comm.leadId,
          notes: comm.body
        };
      });

      logger.info('Call history fetched successfully', { 
        userId, 
        totalCalls: callHistory.length 
      });

      return callHistory;
    } catch (error: any) {
      logger.error('Failed to get call history', { error: error.message, userId });
      return [];
    }
  }
};
