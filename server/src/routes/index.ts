import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import leadRoutes from './leadRoutes.js';
import searchRoutes from './searchRoutes.js';
import fileRoutes from './fileRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);
router.use('/leads', leadRoutes);
router.use('/search', searchRoutes);
router.use('/files', fileRoutes);

export default router;

