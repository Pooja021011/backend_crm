import type { Request, Response } from 'express';
import { callService } from '../services/callService.js';
import { logger } from '../config/logger.js';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { communicationResponseService } from '../services/communicationResponseService.js';
import { prisma } from '../config/db.js';
import twilio from 'twilio';
import { voicePresenceService } from '../services/voicePresenceService.js';
import { leadRepository } from '../repositories/leadRepository.js';
import { Readable } from 'node:stream';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

function normalizeBaseUrl(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

function getPublicBaseUrl(req: Request): string {
  // Prefer explicit public URL for external callbacks (Twilio, DocuSign, etc.)
  const fromEnv = normalizeBaseUrl(process.env.PUBLIC_BASE_URL) || normalizeBaseUrl(process.env.APP_BASE_URL);
  if (fromEnv) return fromEnv;

  // Fallback: infer from request headers (works behind proxies when trust proxy is enabled)
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const proto = forwardedProto || req.protocol || 'http';
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const host = forwardedHost || req.get('host') || 'localhost:4000';
  return normalizeBaseUrl(`${proto}://${host}`) || 'http://localhost:4000';
}

function normalizeTwilioIdentity(identity?: string | null): string {
  const raw = String(identity || '').trim();
  if (!raw) return raw;
  // Twilio Client identities are case-sensitive. Normalize emails to lowercase so routing is consistent.
  return raw.includes('@') ? raw.toLowerCase() : raw;
}
/**
function buildVoicemailTwiml(baseUrl: string) {
  const voicemailActionUrl = `${baseUrl}/api/v1/calls/voicemail-action`;
  const recordingStatusUrl = `${baseUrl}/api/v1/calls/recording-status`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we missed your call. Please leave a message after the beep.</Say>
  <Record
    playBeep="true"
    maxLength="180"
    action="${voicemailActionUrl}"
    method="POST"
    recordingStatusCallback="${recordingStatusUrl}"
    recordingStatusCallbackMethod="POST"
  />
  <Say voice="alice">We did not receive a recording. Goodbye.</Say>
  <Hangup/>
</Response>`;
}
*/


function buildVoicemailTwiml(baseUrl: string) {
  const voicemailActionUrl = `${baseUrl}/api/v1/calls/voicemail-action`;
  const recordingStatusUrl = `${baseUrl}/api/v1/calls/recording-status`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <!-- Phone ringing sound (~10 seconds) -->
    <Play loop="2">${baseUrl}/phone-ring.mp3</Play>

    <!-- US-style forwarded voicemail message -->
    <Say voice="alice">
        Your call has been forwarded to voicemail. Please leave a message after the tone.
    </Say>

    <!-- Beep + record voicemail -->
    <Record
        playBeep="true"
        maxLength="180"
        action="${voicemailActionUrl}"
        method="POST"
        recordingStatusCallback="${recordingStatusUrl}"
        recordingStatusCallbackMethod="POST"
    />

    <Hangup/>
</Response>`;
}





export const callController = {
  /**
   * Generate Twilio access token for browser-based calling
   */
  async getAccessToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const apiKey = process.env.TWILIO_API_KEY;
      const apiSecret = process.env.TWILIO_API_SECRET;
      const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

      if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
        logger.error('Missing Twilio credentials for browser calling');
        return res.status(500).json({
          success: false,
          error: 'Voice calling not configured'
        });
      }

      // Create access token
      const identity = normalizeTwilioIdentity(userEmail || userId);
      const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity,
        ttl: 3600 // 1 hour
      });

      console.log('🔑 GENERATING TWILIO TOKEN:', {
        userId,
        userEmail,
        identity
      });

      // Create voice grant
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true
      });

      token.addGrant(voiceGrant);

      res.json({
        success: true,
        token: token.toJwt(),
        identity
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error generating access token');
      res.status(500).json({
        success: false,
        error: 'Failed to generate access token'
      });
    }
  },

  /**
   * Mark voice (Twilio Device) presence online/offline for the logged-in user.
   * Used to prevent incoming calls from ringing when user is logged out.
   */
  async setVoicePresence(req: Request, res: Response) {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const online = Boolean((req.body as any)?.online);
    voicePresenceService.setOnline(userId, online);
    return res.json({ success: true, data: { userId, online } });
  },

  /**
   * Dial action handler: called after <Dial> ends.
   * If the dial was not completed/answered, route caller to voicemail.
   * No auth (Twilio calls this).
   */
  async dialAction(req: Request, res: Response) {
    try {
      const dialCallStatus = String((req.body as any)?.DialCallStatus || '').toLowerCase();
      const from = req.body?.From || 'Unknown';
      const to = req.body?.To || 'Unknown';
      
      console.log('📞 DIAL ACTION CALLBACK:', {
        dialCallStatus,
        from,
        to,
        fullBody: req.body
      });
      
      logger.info(
        { dialCallStatus, from, to },
        'Dial action handler called'
      );
      
      // Reuse existing webhook logic to update missed/answered status in DB
      await callService.handleIncomingCallWebhook(req.body).catch(() => {});

      const wasAnswered = dialCallStatus === 'completed';
      const baseUrl = getPublicBaseUrl(req);

      // If not answered (busy, no-answer, canceled, failed, or any other non-completed status),
      // route the caller to voicemail so they can leave a message
      const twiml = wasAnswered
        ? `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`
        : buildVoicemailTwiml(baseUrl);
      
      console.log('📞 DIAL ACTION RESPONSE:', {
        wasAnswered,
        action: wasAnswered ? 'hangup' : 'voicemail'
      });

      res.type('text/xml');
      return res.send(twiml);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in dialAction');
      console.error('❌ DIAL ACTION ERROR:', error);
      res.type('text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }
  },

  /**
   * Voicemail action: called after <Record> completes.
   * No auth (Twilio calls this).
   */
  async voicemailAction(_req: Request, res: Response) {
    res.type('text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`);
  },

  /**
   * Recording status callback for both call recordings and voicemail recordings.
   * No auth (Twilio calls this).
   */
  async recordingStatus(req: Request, res: Response) {
    try {
      const body = req.body as any;
      const callSid = String(body?.CallSid || '');
      const recordingSid = String(body?.RecordingSid || '');
      const recordingUrl = String(body?.RecordingUrl || '');
      const recordingDuration = Number(body?.RecordingDuration || 0);
      const recordingSource = String(body?.RecordingSource || '');
      const from = String(body?.From || '');
      const to = String(body?.To || '');

      console.log('🎤 RECORDING STATUS CALLBACK:', {
        callSid,
        recordingSid,
        recordingUrl,
        recordingDuration,
        recordingSource,
        from,
        to,
        isVoicemail: recordingSource && recordingSource !== 'DialVerb'
      });

      if (!callSid || !recordingSid) {
        return res.json({ success: true, ignored: true });
      }

      const isVoicemail = recordingSource && recordingSource !== 'DialVerb';

      // Try to update existing call Communication by callSid
      const existing = await prisma.communication.findFirst({
        where: {
          type: 'CALL',
          metadata: { path: ['callSid'], equals: callSid },
        },
      });

      if (existing) {
        const prev = (existing.metadata as any) || {};
        await prisma.communication.update({
          where: { id: existing.id },
          data: {
            metadata: {
              ...prev,
              callSid,
              recordingSid,
              recordingUrl,
              recordingDuration,
              recordingSource,
              isVoicemail,
            },
          },
        });

        console.log('✅ Recording attached to existing Communication:', existing.id);
        return res.json({ success: true, updated: true });
      }

      // For OUTBOUND calls from browser, the Communication might exist without a callSid
      // Try to find recent OUTBOUND Communication by phone number
      const toNormalized = typeof to === 'string' ? to.replace(/[\s\(\)\-]/g, '') : to;
      const fromNormalized = typeof from === 'string' ? from.replace(/[\s\(\)\-]/g, '') : from;
      
      console.log('🔍 Searching for OUTBOUND Communication without callSid:', {
        toNormalized,
        fromNormalized
      });

      // Search for recent OUTBOUND calls (within last 5 minutes) matching the phone number
      const recentOutbound = await prisma.communication.findFirst({
        where: {
          type: 'CALL',
          direction: 'OUTBOUND',
          occurredAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          },
          OR: [
            { metadata: { path: ['to'], string_contains: toNormalized.slice(-10) } },
            { subject: { contains: toNormalized.slice(-10) } }
          ]
        },
        orderBy: { occurredAt: 'desc' }
      });

      if (recentOutbound) {
        const prev = (recentOutbound.metadata as any) || {};
        await prisma.communication.update({
          where: { id: recentOutbound.id },
          data: {
            metadata: {
              ...prev,
              callSid,
              recordingSid,
              recordingUrl,
              recordingDuration,
              recordingSource,
              isVoicemail,
            },
          },
        });

        console.log('✅ Recording attached to recent OUTBOUND Communication:', recentOutbound.id);
        return res.json({ success: true, updated: true });
      }

      // If no existing Communication (common for offline voicemail flows), create one.
      // Determine the owning user by destination phone number.
      const smsSettingsRepository = await import('../repositories/smsSettingsRepository.js');
      // Reuse toNormalized variable from above (line 298)
      const userSettings = await smsSettingsRepository.smsSettingsRepository.findByPhoneNumber(toNormalized);
      const userId = userSettings?.userId;

      if (!userId) {
        return res.json({ success: true, ignored: true });
      }

      // Find matching lead for this agent; otherwise auto-create Unknown Caller lead
      const lead = from ? await callService.findLeadByPhoneNumber(from, userId) : null;
      const ensuredLead =
        lead ||
        (await leadRepository.create(
          {
            type: 'SELLER',
            assignedUserId: userId,
            address: { address1: 'Unknown', city: 'Unknown', state: 'NA', zip: '00000' },
            seller: {
              firstName: 'Unknown',
              lastName: 'Caller',
              phone: from || 'Unknown',
              email: String(from || '').replace(/\D/g, '')
                ? `${String(from || '').replace(/\D/g, '')}@unknown.local`
                : 'unknown@unknown.local',
            },
          },
          userId
        ));

      await communicationRepository.create(ensuredLead.id, {
        type: 'CALL',
        direction: 'INBOUND',
        subject: isVoicemail ? `📩 Voicemail from ${from || 'Unknown'}` : `Call recording from ${from || 'Unknown'}`,
        body: isVoicemail ? `Voicemail received from ${from || 'Unknown'}` : `Call recording captured`,
        occurredAt: new Date(),
        createdById: userId,
        metadata: {
          callSid,
          status: 'missed',
          from,
          to,
          recordingSid,
          recordingUrl,
          recordingDuration,
          recordingSource,
          isVoicemail,
        },
      });

      return res.json({ success: true, created: true });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in recordingStatus callback');
      return res.json({ success: true });
    }
  },

  /**
   * Stream a Twilio recording to the browser (authenticated).
   */
  async streamRecording(req: Request, res: Response) {
    const userId = (req as any).user?.id as string | undefined;
    const roles = ((req as any).user?.roles as string[] | undefined) || [];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const recordingSid = String(req.params.recordingSid || '');
    if (!recordingSid) return res.status(400).json({ error: 'recordingSid required' });

    const isPrivileged = roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('TC') || roles.includes('EXECUTIVE');

    // Ensure the user is allowed to access this recording based on the Communication/Lead ownership
    const comm = await prisma.communication.findFirst({
      where: { metadata: { path: ['recordingSid'], equals: recordingSid } },
      include: { lead: { select: { assignedUserId: true, createdById: true } } },
    });

    if (!comm) return res.status(404).json({ error: 'Recording not found' });

    if (
      !isPrivileged &&
      comm.createdById !== userId &&
      comm.lead?.assignedUserId !== userId &&
      comm.lead?.createdById !== userId
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) return res.status(500).json({ error: 'Twilio not configured' });

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
    const basic = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const resp = await fetch(url, { headers: { Authorization: `Basic ${basic}` } });
    if (!resp.ok || !resp.body) {
      return res.status(502).json({ error: 'Failed to fetch recording' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const nodeStream = Readable.fromWeb(resp.body as any);
    nodeStream.pipe(res);
  },

  /**
   * Mark a call communication as read for the logged-in user (Inbox dismiss).
   */
  async markCallRead(req: Request, res: Response) {
    const userId = (req as any).user?.id as string | undefined;
    const roles = ((req as any).user?.roles as string[] | undefined) || [];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const communicationId = String(req.params.communicationId || '');
    if (!communicationId) return res.status(400).json({ error: 'communicationId required' });

    const isPrivileged = roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('TC') || roles.includes('EXECUTIVE');

    const comm = await prisma.communication.findUnique({
      where: { id: communicationId },
      include: { lead: { select: { assignedUserId: true, createdById: true } } },
    });

    if (!comm || comm.type !== 'CALL') return res.status(404).json({ error: 'Call communication not found' });

    if (
      !isPrivileged &&
      comm.createdById !== userId &&
      comm.lead?.assignedUserId !== userId &&
      comm.lead?.createdById !== userId
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Some environments have Prisma Client type generation out of sync in editors.
    // Use a safe cast here to avoid blocking builds while keeping runtime correct.
    await (prisma as any).communicationRead.upsert({
      where: { communicationId_userId: { communicationId, userId } },
      update: { readAt: new Date() },
      create: { communicationId, userId, readAt: new Date() },
    });

    return res.json({ success: true });
  },

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
      logger.error({ error: error.message }, 'Error in makeCall controller');
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  /**
   * Log outbound call (for browser-calling UI) WITHOUT initiating a Twilio Voice API call.
   * This prevents duplicate calls and avoids triggering incoming popup during outgoing calls.
   */
  async logOutbound(req: Request, res: Response) {
    try {
      const { to, leadId } = req.body as { to?: string; leadId?: string };
      const userId = (req as any).user?.id as string | undefined;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!to || !leadId) {
        return res.status(400).json({ success: false, error: 'to and leadId are required' });
      }

      // Validate and normalize phone number
      const formattedTo = callService.formatPhoneNumber(to);
      if (!callService.validatePhoneNumber(formattedTo)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
      }

      await communicationRepository.create(leadId, {
        type: 'CALL',
        direction: 'OUTBOUND',
        subject: `Call to ${formattedTo}`,
        body: `Outbound call initiated to ${formattedTo}`,
        occurredAt: new Date(),
        createdById: userId,
        metadata: {
          status: 'initiated',
          to: formattedTo,
          source: 'browser',
        },
      });

      // Keep lead automation consistent with other call logging
      await communicationResponseService
        .handleCommunicationEvent(leadId, 'OUTBOUND', 'CALL')
        .catch((err) => logger.error(`Failed to handle communication event: ${String(err?.message || err)}`));

      return res.json({ success: true });
    } catch (error: any) {
      logger.error(`Error logging outbound call: ${String(error?.message || error)}`);
      return res.status(500).json({ success: false, error: 'Failed to log outbound call' });
    }
  },

  /**
   * Handle incoming call webhook
   */
  async webhook(req: Request, res: Response) {
    try {
      logger.info({ body: req.body }, 'Received call webhook');

      await callService.handleIncomingCallWebhook(req.body);

      res.json({ received: true });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in call webhook controller');
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
      logger.error({ error: error.message }, 'Error in answerCall controller');
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
      logger.error({ error: error.message }, 'Error in hangupCall controller');
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
      logger.error({ error: error.message }, 'Error in getCallStatus controller');
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
      const roles = ((req as any).user?.roles as string[] | undefined) || [];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const callHistory = await callService.getCallHistory({ userId, roles });

      res.json({
        success: true,
        data: {
          calls: callHistory,
          total: callHistory.length
        }
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in getCallHistory controller');
      res.status(500).json({
        success: false,
        error: 'Failed to get call history'
      });
    }
  },

  /**
   * TwiML endpoint for Twilio call instructions
   */
  async twiml(req: Request, res: Response) {
    try {
      logger.info({ body: req.body, query: req.query }, 'TwiML endpoint called');

      // Get the contact number from query parameter (for browser calls) or body (for phone calls)
      const contactNumber = req.query.contactNumber as string || req.body.To;

      if (!contactNumber) {
        logger.error('No contact number provided in TwiML request');
        return res.status(400).send('Contact number required');
      }

      const baseUrl = getPublicBaseUrl(req);
      const recordingStatusUrl = `${baseUrl}/api/v1/calls/recording-status`;

      // TwiML to dial the contact number (record all calls)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || req.body.From}" record="record-from-answer" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST">
    <Number>${contactNumber}</Number>
  </Dial>
  <Say voice="alice">The call has ended. Goodbye!</Say>
</Response>`;

      res.type('text/xml');
      res.send(twiml);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in TwiML controller');
      res.status(500).send('Error processing call');
    }
  },

  /**
   * TwiML for browser-based voice calls
   */
  async twimlVoice(req: Request, res: Response) {
    try {
      logger.info(
        { body: req.body, query: req.query },
        'TwiML Voice endpoint called'
      );

      // Get the 'To' parameter from body or query
      let to = req.body.To || req.query.To;

      // Clean up the phone number (remove spaces, parentheses, dashes)
      if (to) {
        to = to.replace(/[\s\(\)\-]/g, '');
        logger.info('Cleaned To number:', to);
      }

      const baseUrl = getPublicBaseUrl(req);
      const callbackUrl = `${baseUrl}/api/v1/calls/webhook`;
      const recordingStatusUrl = `${baseUrl}/api/v1/calls/recording-status`;

      // Check if this is a client-to-client call
      if (to && to.startsWith('client:')) {
        const clientIdentity = normalizeTwilioIdentity(to.replace('client:', ''));
        logger.info({ targetClient: clientIdentity }, 'Browser-to-browser call detected');

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" action="${callbackUrl}" method="POST" record="record-from-answer" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST">
    <Client>${clientIdentity}</Client>
  </Dial>
  <Say voice="alice">The user is not available. Please try again later.</Say>
</Response>`;

        res.type('text/xml');
        return res.send(twiml);
      }

      // If no 'To' parameter, return error TwiML (not HTTP 400!)
      if (!to) {
        logger.warn('No To parameter provided');
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Invalid call parameters. Please try again.</Say>
  <Hangup/>
</Response>`;

        res.type('text/xml');
        return res.send(twiml);
      }

      // Determine callerId per-agent (each agent can have their own Twilio number in settings)
      // Default fallback is env TWILIO_PHONE_NUMBER (instance-wide).
      let callerId = process.env.TWILIO_PHONE_NUMBER || '';

      // For browser calls, req.body.From is usually "client:<identity>"
      const fromParam = typeof req.body.From === 'string' ? req.body.From : '';
      const identity = fromParam.startsWith('client:')
        ? normalizeTwilioIdentity(fromParam.replace('client:', ''))
        : '';

      if (identity) {
        try {
          // Identity can be email OR userId (older tokens / deployments)
          const isEmail = identity.includes('@');
          const user = await prisma.user.findUnique({
            where: isEmail ? { email: identity } : { id: identity },
            select: { id: true, email: true },
          });

          // Pull agent's configured Twilio number from UserSmsSettings (per-agent)
          const sms = user?.id
            ? await prisma.userSmsSettings.findUnique({
                where: { userId: user.id },
                select: { phoneNumber: true, active: true },
              })
            : null;

          const agentNumber = sms?.active ? sms.phoneNumber : null;
          if (agentNumber) callerId = agentNumber;

          // IMPORTANT: pino signature is (obj, msg). Previous logs were dropping fields.
          logger.info(
            { identity, resolvedUserId: user?.id, resolvedEmail: user?.email, callerId },
            'Resolved callerId for browser call'
          );
          console.log('📞 twimlVoice callerId resolution', {
            fromParam,
            identity,
            resolvedUserId: user?.id,
            resolvedEmail: user?.email,
            callerId,
          });
        } catch (e: any) {
          logger.warn(
            { identity, error: e?.message || String(e) },
            'Failed to resolve callerId for browser call; using fallback'
          );
          console.log('❌ twimlVoice callerId resolution failed', {
            fromParam,
            identity,
            error: e?.message || String(e),
          });
        }
      }

      // Regular phone call - dial the number
      logger.info('Placing call to phone number:', to);
      
      // Use ringTone="at" to suppress local ringback (prevent double ring)
      // This makes the call behavior more like a normal cell phone
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId || process.env.TWILIO_PHONE_NUMBER}" action="${callbackUrl}" method="POST" record="record-from-answer" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" ringTone="at">
    <Number>${to}</Number>
  </Dial>
  <Say voice="alice">The call could not be completed. Please try again.</Say>
</Response>`;

      res.type('text/xml');
      res.send(twiml);
      
    } catch (error: any) {
      logger.error(
        { error: error.message, stack: error.stack },
        'Error in TwiML Voice controller'
      );
      
      // Return valid TwiML even on error (never return HTTP 500)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
      
      res.type('text/xml');
      res.send(twiml);
    }
  },

  /**
   * TwiML for incoming calls - route to browser client
   */
  async twimlIncoming(req: Request, res: Response) {
    try {
      logger.info({ body: req.body }, 'TwiML Incoming endpoint called');

      const from = req.body.From;
      const to = req.body.To;
      const baseUrl = getPublicBaseUrl(req);
      const dialActionUrl = `${baseUrl}/api/v1/calls/dial-action`;
      const recordingStatusUrl = `${baseUrl}/api/v1/calls/recording-status`;

      // Find which user should receive this call based on the destination number
      const smsSettingsRepository = await import('../repositories/smsSettingsRepository.js');
      const toNormalized = typeof to === 'string' ? to.replace(/[\s\(\)\-]/g, '') : to;
      const userSettings = await smsSettingsRepository.smsSettingsRepository.findByPhoneNumber(toNormalized);

      if (userSettings && userSettings.user) {
        // Route call to the user's browser client ONLY if they're online.
        // If offline, send caller directly to voicemail (no silent failure).
        const clientIdentity = normalizeTwilioIdentity(userSettings.user.email || userSettings.userId);
        const isOnline = voicePresenceService.isOnline(userSettings.userId);
        
        console.log('🔍 INCOMING CALL ROUTING:', {
          from,
          to,
          clientIdentity,
          isOnline,
          userEmail: userSettings.user.email,
          userId: userSettings.userId
        });
        
        logger.info({ from, to, clientIdentity, isOnline }, 'Routing incoming call to browser client');

        const twiml = isOnline
          ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" action="${dialActionUrl}" method="POST" record="record-from-answer" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST">
    <Client>${clientIdentity}</Client>
  </Dial>
</Response>`
          : buildVoicemailTwiml(baseUrl);

        res.type('text/xml');
        res.send(twiml);
      } else {
        // No user found for this number - play message
        logger.warn({ to, toNormalized }, 'No user found for incoming call destination');
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. This number is not currently assigned. Goodbye.</Say>
  <Hangup/>
</Response>`;

        res.type('text/xml');
        res.send(twiml);
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in TwiML Incoming controller');
      
      // Fallback TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
      
      res.type('text/xml');
      res.send(twiml);
    }
  },

  /**
   * Log when user answers incoming call from browser
   */
  async logCallAnswer(req: Request, res: Response) {
    try {
      const { callSid, from, action } = req.body;
      const userId = (req as any).user?.id;

      logger.info({ callSid, from, userId }, 'Call answered from browser');

      // Update the existing communication record if it exists
      // Or create a new one with answered status
      const communicationRepository = await import('../repositories/communicationRepository.js');
      
      // Note: The incoming call is already logged by the webhook
      // This just adds additional metadata that it was answered
      
      res.json({ 
        success: true,
        message: 'Call answer logged'
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error logging call answer');
      res.status(500).json({
        success: false,
        error: 'Failed to log call answer'
      });
    }
  },

  /**
   * Log when user rejects incoming call from browser
   * Also triggers voicemail routing via TwiML if callSid provided
   */
  async logCallReject(req: Request, res: Response) {
    try {
      const { callSid, childCallSid, from, action } = req.body;
      const userId = (req as any).user?.id;

      console.log('🚫 CALL REJECTION REQUEST:', {
        callSid,
        childCallSid,
        from,
        userId,
        body: req.body
      });

      logger.info({ callSid, childCallSid, from, userId }, 'Call rejected from browser');

      // If callSid provided, update the PARENT call to send to voicemail
      // The callSid here should be the parent call SID (the original incoming call)
      if (callSid) {
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          
          if (accountSid && authToken) {
            const baseUrl = getPublicBaseUrl(req);
            const voicemailTwiml = buildVoicemailTwiml(baseUrl);
            
            console.log('🔄 REDIRECTING PARENT CALL TO VOICEMAIL:', {
              parentCallSid: callSid,
              childCallSid
            });
            
            // Update the PARENT call to redirect to voicemail
            // This redirects the original caller to the voicemail system
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                  Twiml: voicemailTwiml
                })
              }
            );
            
            const responseData = await response.text();
            console.log('✅ TWILIO API RESPONSE:', {
              status: response.status,
              statusText: response.statusText,
              body: responseData
            });
            
            logger.info({ callSid, childCallSid }, 'Call redirected to voicemail after rejection');
          }
        } catch (redirectError: any) {
          console.error('❌ VOICEMAIL REDIRECT FAILED:', {
            error: redirectError.message,
            callSid,
            stack: redirectError.stack
          });
          logger.error({ error: redirectError.message, callSid }, 'Failed to redirect rejected call to voicemail');
          // Don't fail the request - rejection was still logged
        }
      }
      
      res.json({ 
        success: true,
        message: 'Call rejection logged'
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error logging call rejection');
      console.error('❌ CALL REJECTION ERROR:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log call rejection'
      });
    }
  },

  /**
   * Save call notes to communication record
   */
  async saveCallNotes(req: Request, res: Response) {
    try {
      const { leadId, phoneNumber, notes, callSid } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!leadId || !notes) {
        return res.status(400).json({
          success: false,
          error: 'leadId and notes are required'
        });
      }

      logger.info({ leadId, userId, callSid }, 'Saving call notes');

      // Find existing communication record by callSid if provided
      let communication = null;
      if (callSid) {
        communication = await prisma.communication.findFirst({
          where: {
            leadId,
            type: 'CALL',
            metadata: { path: ['callSid'], equals: callSid }
          }
        });
      }

      // If no existing communication found, find by phone number and recent time
      if (!communication && phoneNumber) {
        communication = await prisma.communication.findFirst({
          where: {
            leadId,
            type: 'CALL',
            occurredAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // Within last hour
            }
          },
          orderBy: { occurredAt: 'desc' }
        });
      }

      if (communication) {
        // Update existing communication with notes
        await prisma.communication.update({
          where: { id: communication.id },
          data: {
            body: notes,
            metadata: {
              ...(communication.metadata as any || {}),
              notes,
              notesUpdatedAt: new Date().toISOString()
            }
          }
        });

        logger.info({ communicationId: communication.id }, 'Call notes updated');
      } else {
        // Create new communication record with notes
        await communicationRepository.create(leadId, {
          type: 'CALL',
          direction: 'OUTBOUND',
          subject: `Call notes for ${phoneNumber || 'unknown'}`,
          body: notes,
          occurredAt: new Date(),
          createdById: userId,
          metadata: {
            notes,
            phoneNumber,
            callSid,
            notesOnly: true
          }
        });

        logger.info({ leadId }, 'New call notes record created');
      }

      res.json({
        success: true,
        message: 'Call notes saved successfully'
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error saving call notes');
      res.status(500).json({
        success: false,
        error: 'Failed to save call notes'
      });
    }
  }
};
