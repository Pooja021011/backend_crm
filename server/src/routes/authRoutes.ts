import { Router } from 'express';
import { authController } from '../controllers/authController.js';

const router = Router();

router.post('/login', (req, res, next) => authController.login(req, res).catch(next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res).catch(next));
router.post('/logout', (req, res, next) => authController.logout(req, res).catch(next));

export default router;

