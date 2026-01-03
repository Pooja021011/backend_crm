import type { Request, Response } from 'express';
import { callService } from '../services/callService.js';
import { logger } from '../config/logger.js';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { communicationResponseService } from '../services/communicationResponseService.js';
import { prisma } from '../config/db.js';
import twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

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
      const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity: userEmail || userId,
        ttl: 3600 // 1 hour
      });

      console.log('🔑 GENERATING TWILIO TOKEN:', {
        userId,
        userEmail,
        identity: userEmail || userId
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
        identity: userEmail || userId
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

      // TwiML to dial the contact number
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || req.body.From}">
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

      const callbackUrl = `${process.env.APP_BASE_URL}/api/v1/calls/webhook`;

      // Check if this is a client-to-client call
      if (to && to.startsWith('client:')) {
        const clientIdentity = to.replace('client:', '');
        logger.info({ targetClient: clientIdentity }, 'Browser-to-browser call detected');

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" action="${callbackUrl}" method="POST">
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
      const identity = fromParam.startsWith('client:') ? fromParam.replace('client:', '') : '';

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
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId || process.env.TWILIO_PHONE_NUMBER}" action="${callbackUrl}" method="POST">
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
      const callbackUrl = `${process.env.APP_BASE_URL}/api/v1/calls/webhook`;

      // Find which user should receive this call based on the destination number
      const smsSettingsRepository = await import('../repositories/smsSettingsRepository.js');
      const toNormalized = typeof to === 'string' ? to.replace(/[\s\(\)\-]/g, '') : to;
      const userSettings = await smsSettingsRepository.smsSettingsRepository.findByPhoneNumber(toNormalized);

      if (userSettings && userSettings.user) {
        // Route call to the user's browser client
        const clientIdentity = userSettings.user.email || userSettings.userId;
        
        console.log('🔍 INCOMING CALL ROUTING:', {
          from,
          to,
          clientIdentity,
          userEmail: userSettings.user.email,
          userId: userSettings.userId
        });
        
        logger.info({ from, to, clientIdentity }, 'Routing incoming call to browser client');

        // TwiML to route call to browser
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" action="${callbackUrl}" method="POST">
    <Client>${clientIdentity}</Client>
  </Dial>
  <Say voice="alice">The user is not available. Please try again later.</Say>
</Response>`;

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
   */
  async logCallReject(req: Request, res: Response) {
    try {
      const { callSid, from, action } = req.body;
      const userId = (req as any).user?.id;

      logger.info({ callSid, from, userId }, 'Call rejected from browser');

      // The incoming call was already logged by webhook
      // We could update it to mark as "rejected" if needed
      
      res.json({ 
        success: true,
        message: 'Call rejection logged'
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error logging call rejection');
      res.status(500).json({
        success: false,
        error: 'Failed to log call rejection'
      });
    }
  }
};
