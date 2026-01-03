import { Router } from 'express';
import { callController } from '../controllers/callController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All call routes require authentication except webhooks
router.use((req, res, next) => {
  // Skip auth for webhook endpoints and TwiML
  if (req.path === '/webhook' || req.path === '/twiml' || req.path === '/twiml-voice' || req.path === '/twiml-incoming') {
    return next();
  }
  return authenticate(req, res, next);
});

// Get access token for browser calling
router.get('/token', (req, res, next) => 
  callController.getAccessToken(req, res).catch(next)
);

// Set voice device presence (online/offline)
router.post('/presence', (req, res, next) =>
  callController.setVoicePresence(req, res).catch(next)
);

// Make outbound call
router.post('/make', (req, res, next) => 
  callController.makeCall(req, res).catch(next)
);

// Log outbound call (browser calling) without initiating Twilio Voice API call
router.post('/log-outbound', (req, res, next) =>
  callController.logOutbound(req, res).catch(next)
);

// Get call history
router.get('/history', (req, res, next) => 
  callController.getCallHistory(req, res).catch(next)
);

// Log call answer action
router.post('/log-answer', (req, res, next) => 
  callController.logCallAnswer(req, res).catch(next)
);

// Log call reject action
router.post('/log-reject', (req, res, next) => 
  callController.logCallReject(req, res).catch(next)
);

// Get call status
router.get('/status/:callControlId', (req, res, next) => 
  callController.getCallStatus(req, res).catch(next)
);

// Answer incoming call
router.post('/answer/:callControlId', (req, res, next) => 
  callController.answerCall(req, res).catch(next)
);

// Hang up call
router.post('/hangup/:callControlId', (req, res, next) => 
  callController.hangupCall(req, res).catch(next)
);

// Webhook endpoint for incoming calls (no auth required)
router.post('/webhook', (req, res, next) => 
  callController.webhook(req, res).catch(next)
);

// TwiML endpoint for Twilio call instructions (no auth required)
router.post('/twiml', (req, res, next) => 
  callController.twiml(req, res).catch(next)
);

// TwiML endpoint for browser-based voice calls (no auth required)
router.post('/twiml-voice', (req, res, next) => 
  callController.twimlVoice(req, res).catch(next)
);

// TwiML endpoint for incoming calls - routes to browser (no auth required)
router.post('/twiml-incoming', (req, res, next) => 
  callController.twimlIncoming(req, res).catch(next)
);

export default router;
