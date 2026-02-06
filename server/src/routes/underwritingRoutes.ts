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

// ========== SCENARIO ROUTES ==========

// Get all scenarios for a lead
router.get('/leads/:leadId/scenarios', (req, res, next) =>
  underwritingController.getScenarios(req, res).catch(next)
);

// Get a scenario by ID
router.get('/scenarios/:scenarioId', (req, res, next) =>
  underwritingController.getScenario(req, res).catch(next)
);

// Create a new scenario
router.post('/leads/:leadId/scenarios', (req, res, next) =>
  underwritingController.createScenario(req, res).catch(next)
);

// Update a scenario
router.put('/scenarios/:scenarioId', (req, res, next) =>
  underwritingController.updateScenario(req, res).catch(next)
);

// Delete a scenario
router.delete('/scenarios/:scenarioId', (req, res, next) =>
  underwritingController.deleteScenario(req, res).catch(next)
);

// Set a scenario as primary
router.patch('/scenarios/:scenarioId/primary', (req, res, next) =>
  underwritingController.setPrimaryScenario(req, res).catch(next)
);

// Duplicate a scenario
router.post('/scenarios/:scenarioId/duplicate', (req, res, next) =>
  underwritingController.duplicateScenario(req, res).catch(next)
);

// Calculate scenario outputs (doesn't save)
router.post('/scenarios/calculate', (req, res, next) =>
  underwritingController.calculateScenario(req, res).catch(next)
);

export default router;
