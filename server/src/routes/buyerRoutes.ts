import { Router } from 'express';
import { buyerController } from '../controllers/buyerController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all buyers
router.get('/', buyerController.listAll);

// Create a new buyer
router.post('/', buyerController.create);

export default router;

