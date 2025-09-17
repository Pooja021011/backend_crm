import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

// Profile endpoints - any authenticated user can access their own profile
router.get('/profile', authenticate, (req, res, next) => userController.getProfile(req, res).catch(next));
router.put('/profile', authenticate, (req, res, next) => userController.updateProfile(req, res).catch(next));
router.put('/change-password', authenticate, (req, res, next) => userController.changePassword(req, res).catch(next));

// Admin-only user management endpoints
router.use(authenticate, requireRoles('ADMIN'));

router.get('/', (req, res, next) => userController.list(req, res).catch(next));
router.post('/', (req, res, next) => userController.create(req, res).catch(next));
router.get('/:id', (req, res, next) => userController.get(req, res).catch(next));
router.patch('/:id', (req, res, next) => userController.update(req, res).catch(next));

export default router;

