import { Router } from 'express';
import { underwritingController } from '../controllers/underwritingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Lead-specific underwriting scenarios
router.get('/leads/:leadId/scenarios', underwritingController.listScenarios);
router.post('/leads/:leadId/scenarios', underwritingController.createScenario);

// Individual scenario operations
router.get('/scenarios/:id', underwritingController.getScenario);
router.put('/scenarios/:id', underwritingController.updateScenario);
router.delete('/scenarios/:id', underwritingController.deleteScenario);

// Scenario actions
router.put('/scenarios/:id/set-primary', underwritingController.setPrimary);
router.post('/scenarios/:id/duplicate', underwritingController.duplicateScenario);
router.get('/scenarios/:id/export-pdf', underwritingController.exportToPDF);

// Calculation utility (doesn't require scenario ID)
router.post('/calculate', underwritingController.calculateScenario);

export { router as underwritingRoutes };
