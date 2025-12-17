import { Router } from 'express';
import { docusignWebhookController } from '../controllers/docusignWebhookController.js';

const router = Router();

// Webhook endpoint (no authentication - DocuSign calls this)
router.post('/webhook', (req, res, next) => 
  docusignWebhookController.handleWebhook(req, res).catch(next)
);

export default router;

