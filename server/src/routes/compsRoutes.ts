import { Router } from 'express';
import { compsController } from '../controllers/compsController';
import { authMiddleware } from '../middleware/auth';
import { uploader } from '../controllers/fileController.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Lead-specific comparables
router.get('/leads/:leadId/comparables', compsController.listLeadComps);
router.post('/leads/:leadId/comparables', compsController.createComparable);
router.put('/leads/:leadId/comparables/:id', compsController.updateComparable);
router.delete('/leads/:leadId/comparables/:id', compsController.deleteComparable);

// Lead-specific comps PDFs
router.get('/leads/:leadId/pdfs', compsController.listLeadCompPdfs);
router.post('/leads/:leadId/pdfs', uploader.single('file'), compsController.uploadLeadCompPdf);
router.delete('/leads/:leadId/pdfs/:id', compsController.deleteLeadCompPdf);

// Comparable analysis and suggestions
router.get('/leads/:leadId/analysis', compsController.analyzeComps);
router.get('/leads/:leadId/suggestions', compsController.suggestComps);
router.post('/leads/:leadId/auto-fetch', compsController.autoFetchComps);

// Search comparables across all leads (for reference/suggestions)
router.get('/search', compsController.searchComparables);

export { router as compsRoutes };
