import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { googleSheetsWebhookController } from '../controllers/googleSheetsWebhookController.js';
import { googleSheetsConfigController } from '../controllers/googleSheetsConfigController.js';

const router = Router();

// Public webhook endpoint (no auth required for external webhooks)
// In production, use webhook signature validation instead
router.post('/webhook', (req, res, next) =>
  googleSheetsWebhookController.handleWebhook(req, res).catch(next)
);

// Authenticated routes
router.use(authenticate);

// Test webhook (authenticated users only)
router.post('/test-webhook', (req, res, next) =>
  googleSheetsWebhookController.testWebhook(req, res).catch(next)
);

// Get webhook configuration (legacy)
router.get('/webhook-config', (req, res, next) =>
  googleSheetsWebhookController.getWebhookConfig(req, res).catch(next)
);

// Admin-only routes
router.use(requireRoles('ADMIN'));

// Configuration management
router.get('/config', (req, res, next) =>
  googleSheetsConfigController.getConfig(req, res).catch(next)
);

router.post('/config', (req, res, next) =>
  googleSheetsConfigController.updateConfig(req, res).catch(next)
);

// Test Google Sheets connection
router.post('/test-connection', (req, res, next) =>
  googleSheetsConfigController.testConnection(req, res).catch(next)
);

// Manual trigger sync
router.post('/sync', (req, res, next) =>
  googleSheetsConfigController.triggerSync(req, res).catch(next)
);

// Get sync statistics
router.get('/sync-stats', (req, res, next) =>
  googleSheetsConfigController.getSyncStats(req, res).catch(next)
);

// Get webhook statistics (legacy)
router.get('/stats', (req, res, next) =>
  googleSheetsWebhookController.getWebhookStats(req, res).catch(next)
);

// Get distribution statistics
router.get('/distribution-stats', (req, res, next) =>
  googleSheetsWebhookController.getDistributionStats(req, res).catch(next)
);

export default router;
