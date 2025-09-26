import { Router } from 'express';
import { marketingController } from '../controllers/marketingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Lead-specific marketing resources
router.get('/leads/:leadId/resources', marketingController.listLeadResources);
router.post('/leads/:leadId/resources', marketingController.createResource);
router.get('/leads/:leadId/resources/type/:type', marketingController.getResourcesByType);
router.get('/leads/:leadId/resources/stats', marketingController.getResourceStats);
router.get('/leads/:leadId/overview', marketingController.getMarketingOverview);
router.get('/leads/:leadId/public-links', marketingController.generatePublicLinks);

// Marketing campaigns
router.post('/leads/:leadId/campaigns', marketingController.createMarketingCampaign);
router.post('/leads/:leadId/duplicate-resources', marketingController.duplicateResources);

// Individual resource operations
router.get('/resources/:id', marketingController.getResource);
router.put('/resources/:id', marketingController.updateResource);
router.delete('/resources/:id', marketingController.deleteResource);
router.put('/resources/:id/toggle-status', marketingController.toggleResourceStatus);

export { router as marketingRoutes };
