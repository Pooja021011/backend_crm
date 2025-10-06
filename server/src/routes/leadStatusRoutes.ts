import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { leadStatusController } from '../controllers/leadStatusController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/lead-statuses - Get all lead statuses
router.get('/', leadStatusController.getAll);

// GET /api/lead-statuses/:id - Get a single lead status
router.get('/:id', leadStatusController.getById);

// POST /api/lead-statuses - Create a new lead status (Admin only)
router.post('/', leadStatusController.create);

// PUT /api/lead-statuses/:id - Update a lead status (Admin only)
router.put('/:id', leadStatusController.update);

// DELETE /api/lead-statuses/:id - Delete a lead status (Admin only)
router.delete('/:id', leadStatusController.delete);

// POST /api/lead-statuses/reorder - Reorder lead statuses (Admin only)
router.post('/reorder', leadStatusController.reorder);

export default router;
