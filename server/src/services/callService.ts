import twilio from 'twilio';
import { logger } from '../config/logger.js';
import { prisma } from '../config/db.js';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { smsSettingsRepository } from '../repositories/smsSettingsRepository.js';
import { communicationResponseService } from './communicationResponseService.js';
import { leadRepository } from '../repositories/leadRepository.js';

function normalizeBaseUrl(input?: string | null): string {
  const trimmed = String(input || '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

function getTwilioCallbackBaseUrl(): string {
  // Prefer explicit public URL for external callbacks (HTTPS domain)
  const publicUrl = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  if (publicUrl) return publicUrl;

  // Backwards compatible fallback
  const appBase = normalizeBaseUrl(process.env.APP_BASE_URL);
  if (appBase) return appBase;

  return 'http://localhost:4000';
}

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
      const baseUrl = getTwilioCallbackBaseUrl();
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

      logger.info(
        { to: callRequest.to, from: fromNumber, userId: callRequest.userId },
        'Initiating call via Twilio'
      );

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callService.ts:62',message:'Initiating call',data:{to:callRequest.to,from:fromNumber,twimlUrl:`${process.env.APP_BASE_URL}/api/v1/calls/twiml`,statusCallback:`${process.env.APP_BASE_URL}/api/v1/calls/webhook`},timestamp:Date.now(),sessionId:'debug-session',runId:'call-make',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Create the call using Twilio Voice API
      // This will call YOUR phone first, then connect to the contact
      const call = await twilioClient.calls.create({
        to: fromNumber, // Call YOUR phone first
        from: fromNumber, // From your Twilio number
        url: `${baseUrl}/api/v1/calls/twiml?contactNumber=${encodeURIComponent(callRequest.to)}`, // Pass contact number to TwiML
        statusCallback: `${baseUrl}/api/v1/calls/webhook`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callService.ts:76',message:'Call created',data:{sid:call.sid,status:call.status,direction:call.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'call-make',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      logger.info({ callId: call.sid }, 'Call initiated successfully');

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
        
        // NEW: Auto-update lead status based on communication
        await communicationResponseService.handleCommunicationEvent(
          callRequest.leadId,
          'OUTBOUND',
          'CALL'
        ).catch(err => logger.error({ err }, 'Failed to handle communication event'));
      }

      return {
        success: true,
        callId: call.sid,
        data: call,
        fromNumber,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initiate call via Twilio');
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
      logger.info({ webhookData }, 'Processing incoming call webhook');

      // Twilio webhook format
      const { 
        From: from, 
        To: to,
        Called: called,
        CalledVia: calledVia,
        CallSid: callSid, 
        CallStatus: callStatus,
        CallDuration: callDuration,
        Direction: direction,
        DialCallStatus: dialCallStatus,  // Child call status (browser answered or not)
        DialCallDuration: dialCallDuration // Child call duration
      } = webhookData;

      const toCandidate =
        (typeof to === 'string' && to) ||
        (typeof called === 'string' && called) ||
        (typeof calledVia === 'string' && calledVia) ||
        '';

      const safeFrom = typeof from === 'string' ? from : '';
      const safeTo = typeof toCandidate === 'string' ? toCandidate : '';

      const buildUnknownEmail = (phone: string) => {
        const digits = String(phone || '').replace(/\D/g, '');
        return digits ? `${digits}@unknown.local` : `unknown@unknown.local`;
      };

      const ensureLead = async (userId: string) => {
        // Try to find a lead by phone number that belongs to THIS user (assigned/created).
        // This avoids linking inbound calls to another agent's lead just because the phone matches.
        const existing = safeFrom ? await this.findLeadByPhoneNumber(safeFrom, userId) : null;
        if (existing) return existing;

        // Auto-create a minimal SELLER lead for unknown inbound caller (so missed calls always show up)
        // Note: SELLER leads require an address, so we create a safe placeholder.
        const created = await leadRepository.create(
          {
            type: 'SELLER',
            assignedUserId: userId,
            address: {
              address1: 'Unknown',
              city: 'Unknown',
              state: 'NA',
              zip: '00000',
            },
            seller: {
              firstName: 'Unknown',
              lastName: 'Caller',
              phone: safeFrom || 'Unknown',
              email: buildUnknownEmail(safeFrom),
            },
          },
          userId
        );

        if (!created) {
          throw new Error('Failed to auto-create lead for unknown inbound caller');
        }

        logger.info(
          { leadId: created.id, from: safeFrom, assignedUserId: userId },
          'Auto-created lead for unknown inbound caller'
        );

        return created;
      };

      const upsertCallCommunication = async (leadId: string, userId: string, status: string, extra: any = {}) => {
        const existingComm = await prisma.communication.findFirst({
          where: {
            leadId,
            type: 'CALL',
            direction: 'INBOUND',
            metadata: { path: ['callSid'], equals: callSid },
          },
        });

        const baseMetadata = {
          callSid,
          status,
          from: safeFrom,
          to: safeTo,
          ...extra,
        };

        if (existingComm) {
          await prisma.communication.update({
            where: { id: existingComm.id },
            data: {
              metadata: baseMetadata,
              subject: status === 'missed' ? `⚠️ MISSED CALL from ${safeFrom}` : `Incoming call from ${safeFrom}`,
            },
          });
          return existingComm.id;
        }

        const created = await communicationRepository.create(leadId, {
          type: 'CALL',
          direction: 'INBOUND',
          subject: status === 'missed' ? `⚠️ MISSED CALL from ${safeFrom}` : `Incoming call from ${safeFrom}`,
          body: status === 'missed' ? `Missed inbound call from ${safeFrom}` : `Inbound call received from ${safeFrom}`,
          occurredAt: new Date(),
          createdById: userId,
          metadata: baseMetadata,
        });

        return created.id;
      };

      // Handle incoming call initiated
      if (callStatus === 'ringing' && direction === 'inbound') {
        logger.info({ from: safeFrom, to: safeTo, callSid }, 'Incoming call received');

        // Find user by phone number to associate the call
        const userSmsSettings = await smsSettingsRepository.findByPhoneNumber(safeTo);
        
        if (userSmsSettings) {
          const lead = await ensureLead(userSmsSettings.userId);
          
          if (lead) {
            await upsertCallCommunication(lead.id, userSmsSettings.userId, 'ringing');
            
            logger.info(
              { leadId: lead.id, from: safeFrom, userId: userSmsSettings.userId, callSid },
              'Incoming call stored in communication history'
            );
            
            // NEW: Auto-update lead status based on communication
            await communicationResponseService.handleCommunicationEvent(
              lead.id,
              'INBOUND',
              'CALL'
            ).catch(err => logger.error({ err }, 'Failed to handle communication event'));
          }
        } else {
          logger.info({ to: safeTo }, 'No user found for call destination number');
        }
      }
      
      // Handle call completion - CRITICAL for missed call tracking
      // IMPORTANT:
      // - For inbound calls routed via <Dial>, the ONLY reliable indicator of "missed vs answered"
      //   is DialCallStatus from the <Dial action="..."> callback.
      // - Twilio statusCallback "completed" events often do NOT include DialCallStatus and can
      //   arrive later, which would incorrectly overwrite a previously set "missed" status.
      const hasDialResult = typeof dialCallStatus === 'string' && dialCallStatus.length > 0;
      if (hasDialResult) {
        logger.info(
          { callStatus, callSid, dialCallStatus, duration: callDuration },
          'Dial completed - checking if answered'
        );

        // Find user by phone number
        const userSmsSettings = await smsSettingsRepository.findByPhoneNumber(safeTo);
        
        if (userSmsSettings) {
          const lead = await ensureLead(userSmsSettings.userId);
          
          if (lead) {
            // Check if call was answered or missed
            const wasMissed =
              dialCallStatus === 'no-answer' ||
              dialCallStatus === 'busy' ||
              dialCallStatus === 'failed' ||
              dialCallStatus === 'canceled';

            const finalStatus = wasMissed ? 'missed' : 'completed';
            const duration = dialCallDuration ? parseInt(dialCallDuration) : 0;

            await upsertCallCommunication(lead.id, userSmsSettings.userId, finalStatus, {
              dialCallStatus,
              duration,
              completedAt: new Date().toISOString(),
            });

            // If missed, keep body/subject explicit for UI and notifications
            if (wasMissed) {
              await prisma.communication.updateMany({
                where: {
                  leadId: lead.id,
                  type: 'CALL',
                  direction: 'INBOUND',
                  metadata: { path: ['callSid'], equals: callSid },
                },
                data: {
                  subject: `⚠️ MISSED CALL from ${safeFrom}`,
                  body: `Missed incoming call - Agent not available. Reason: ${dialCallStatus}`,
                },
              });
            }

            logger.info(
              { leadId: lead.id, callSid, finalStatus, dialCallStatus, duration },
              'Call status updated'
            );
          }
        }
      } else if (callStatus === 'completed' && direction === 'inbound') {
        // Ignore status-only completion callbacks without DialCallStatus to avoid overwriting
        // missed calls already marked by the <Dial action> callback.
        logger.info(
          { callStatus, callSid, direction, hasDialResult },
          'Ignoring inbound completed status callback without DialCallStatus'
        );
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to process incoming call webhook');
      throw error;
    }
  },

  /**
   * Find lead by phone number
   */
  async findLeadByPhoneNumber(phoneNumber: string, userId?: string): Promise<any> {
    try {
      // Search in lead detail tables (seller, buyer, vendor) for phone numbers
      const lead = await prisma.lead.findFirst({
        where: {
          AND: [
            {
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
              ],
            },
            ...(userId
              ? [
                  {
                    OR: [{ assignedUserId: userId }, { createdById: userId }],
                  },
                ]
              : []),
          ],
        },
        include: {
          seller: true,
          buyer: true,
          vendor: true,
        }
      });
      
      return lead;
    } catch (error: any) {
      logger.error({ error: error.message, phoneNumber, userId }, 'Error finding lead by phone number');
      return null;
    }
  },

  /**
   * Answer an incoming call (Twilio handles this via TwiML)
   * Note: Twilio calls are answered via TwiML responses, not by updating status
   */
  async answerCall(callSid: string): Promise<CallResponse> {
    try {
      logger.info({ callSid }, 'Fetching call status');

      // Fetch call information (Twilio handles answering via TwiML)
      const call = await twilioClient.calls(callSid).fetch();

      logger.info({ callSid, status: call.status }, 'Call info retrieved');

      return {
        success: true,
        callId: callSid,
        data: call,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch call info');
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
      logger.info({ callSid }, 'Hanging up call');

      const call = await twilioClient.calls(callSid).update({
        status: 'completed'
      });

      logger.info({ callSid }, 'Call hung up successfully');

      return {
        success: true,
        callId: callSid,
        data: call,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to hang up call');
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
      logger.error({ error: error.message }, 'Failed to get call status');
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
  async getCallHistory(params: { userId: string; roles?: string[] }): Promise<any[]> {
    try {
      const userId = params.userId;
      const roles = params.roles || [];
      const isPrivileged = roles.includes('ADMIN') || roles.includes('EXECUTIVE') || roles.includes('MANAGER') || roles.includes('TC');

      logger.info({ userId, roles }, 'Fetching call history from database');

      // Fetch real call communications from database
      const communications = await prisma.communication.findMany({
        where: {
          type: 'CALL',
          ...(isPrivileged
            ? {}
            : {
                OR: [
                  // Show OUTBOUND calls the user placed (even if lead assignment changes later)
                  { AND: [{ direction: 'OUTBOUND' as any }, { createdById: userId }] },
                  { lead: { assignedUserId: userId } },
                  { lead: { createdById: userId } },
                ],
              }),
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

      // Safety: If a lead was deleted (or DB lacks FK cascade), Prisma can return communications with lead = null.
      // For Inbox calls tab, we only want to show calls whose Lead still exists.
      const communicationsWithLead = communications.filter((c) => Boolean((c as any).lead));

      // Transform communications to call history format
      const callHistory = communicationsWithLead.map(comm => {
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
          status: (comm.metadata as any)?.status || 'completed', // Read from metadata
          duration: (comm.metadata as any)?.duration || 0, // Read from metadata
          timestamp: comm.occurredAt.toISOString(),
          callId: comm.id,
          leadId: comm.leadId,
          notes: comm.body
        };
      });

      logger.info({ userId, totalCalls: callHistory.length, isPrivileged }, 'Call history fetched successfully');

      return callHistory;
    } catch (error: any) {
      logger.error({ error: error.message, userId: params.userId }, 'Failed to get call history');
      return [];
    }
  }
};
