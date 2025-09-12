import { Router } from 'express';
import { agentController } from '../controllers/agentController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

// All agent routes require authentication
router.use(authenticate);

// List agents - accessible to all authenticated users
router.get('/', (req, res, next) => agentController.listAgents(req, res).catch(next));

// Admin-only routes for agent management
router.use(requireRoles('ADMIN'));

router.post('/', (req, res, next) => agentController.createAgent(req, res).catch(next));
router.get('/:id', (req, res, next) => agentController.getAgent(req, res).catch(next));
router.patch('/:id', (req, res, next) => agentController.updateAgent(req, res).catch(next));
router.delete('/:id', (req, res, next) => agentController.deleteAgent(req, res).catch(next));

export default router;
