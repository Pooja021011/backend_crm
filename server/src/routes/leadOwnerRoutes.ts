import { Router } from 'express';
import { leadOwnerController } from '../controllers/leadOwnerController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all owners for a lead
router.get('/leads/:leadId/owners', (req, res, next) =>
  leadOwnerController.getOwners(req, res).catch(next)
);

// Add a new owner
router.post('/leads/:leadId/owners', (req, res, next) =>
  leadOwnerController.addOwner(req, res).catch(next)
);

// Update an owner
router.put('/owners/:ownerId', (req, res, next) =>
  leadOwnerController.updateOwner(req, res).catch(next)
);

// Delete an owner
router.delete('/owners/:ownerId', (req, res, next) =>
  leadOwnerController.deleteOwner(req, res).catch(next)
);

// Set an owner as primary
router.put('/owners/:ownerId/primary', (req, res, next) =>
  leadOwnerController.setPrimaryOwner(req, res).catch(next)
);

export default router;

