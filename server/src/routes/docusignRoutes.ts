import { Router } from 'express';
import { docusignWebhookController } from '../controllers/docusignWebhookController.js';
import { docusignTestController } from '../controllers/docusignTestController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Webhook endpoint (no authentication - DocuSign calls this)
router.post('/webhook', (req, res, next) => 
  docusignWebhookController.handleWebhook(req, res).catch(next)
);

// Test endpoints (requires authentication)
router.get('/test/config', authenticate, (req, res, next) =>
  docusignTestController.testConfiguration(req, res).catch(next)
);

router.post('/test/send/:leadId', authenticate, (req, res, next) =>
  docusignTestController.testSendEnvelope(req, res).catch(next)
);

export default router;

