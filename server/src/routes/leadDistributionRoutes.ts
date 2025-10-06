import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { leadDistributionController } from '../controllers/leadDistributionController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get current user's distribution settings
router.get('/my-settings', (req, res, next) =>
  leadDistributionController.getUserSettings(req, res).catch(next)
);

// Admin-only routes
router.use(requireRoles('ADMIN'));

// Get all ACQ agents with distribution settings
router.get('/agents', (req, res, next) =>
  leadDistributionController.getAcquisitionsAgents(req, res).catch(next)
);

// Update distribution settings
router.post('/update', (req, res, next) =>
  leadDistributionController.updateDistributionSettings(req, res).catch(next)
);

export default router;
