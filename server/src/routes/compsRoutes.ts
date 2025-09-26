import { Router } from 'express';
import { compsController } from '../controllers/compsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Lead-specific comparables
router.get('/leads/:leadId/comparables', compsController.listLeadComps);
router.post('/leads/:leadId/comparables/:comparableId', compsController.addCompToLead);
router.delete('/leads/:leadId/comparables/:comparableId', compsController.removeCompFromLead);

// Comparable analysis and suggestions
router.get('/leads/:leadId/analysis', compsController.analyzeComps);
router.get('/leads/:leadId/suggestions', compsController.suggestComps);
router.post('/leads/:leadId/auto-fetch', compsController.autoFetchComps);

// General comparable operations
router.get('/search', compsController.searchComparables);
router.post('/create', compsController.createComparable);
router.put('/:id', compsController.updateComparable);
router.delete('/:id', compsController.deleteComparable);

export { router as compsRoutes };
