import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

// All user endpoints require ADMIN
router.use(authenticate, requireRoles('ADMIN'));

router.get('/', (req, res, next) => userController.list(req, res).catch(next));
router.post('/', (req, res, next) => userController.create(req, res).catch(next));
router.get('/:id', (req, res, next) => userController.get(req, res).catch(next));
router.patch('/:id', (req, res, next) => userController.update(req, res).catch(next));

export default router;

