import { Router } from 'express';
import { rehabBudgetController } from '../controllers/rehabBudgetController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get rehab budget for a lead
router.get('/leads/:leadId/rehab-budget', (req, res, next) =>
  rehabBudgetController.getBudget(req, res).catch(next)
);

// Calculate rehab budget (doesn't save)
router.post('/rehab-budget/calculate', (req, res, next) =>
  rehabBudgetController.calculate(req, res).catch(next)
);

// Save rehab budget for a lead
router.post('/leads/:leadId/rehab-budget', (req, res, next) =>
  rehabBudgetController.saveBudget(req, res).catch(next)
);

// Update rehab budget for a lead
router.put('/leads/:leadId/rehab-budget', (req, res, next) =>
  rehabBudgetController.saveBudget(req, res).catch(next)
);

// Delete rehab budget
router.delete('/leads/:leadId/rehab-budget', (req, res, next) =>
  rehabBudgetController.deleteBudget(req, res).catch(next)
);

export default router;

