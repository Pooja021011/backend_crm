import { Router } from 'express';
import { underwritingController } from '../controllers/underwritingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all calculations for a lead
router.get('/leads/:leadId', (req, res, next) =>
  underwritingController.getCalculations(req, res).catch(next)
);

// Get latest calculation for a lead
router.get('/leads/:leadId/latest', (req, res, next) =>
  underwritingController.getLatest(req, res).catch(next)
);

// Calculate final offer (doesn't save)
router.post('/calculate', (req, res, next) =>
  underwritingController.calculate(req, res).catch(next)
);

// Save underwriting calculation
router.post('/leads/:leadId', (req, res, next) =>
  underwritingController.saveCalculation(req, res).catch(next)
);

// Delete a calculation
router.delete('/:calculationId', (req, res, next) =>
  underwritingController.deleteCalculation(req, res).catch(next)
);

export default router;
