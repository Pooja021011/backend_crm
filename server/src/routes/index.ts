import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import leadRoutes from './leadRoutes.js';
import searchRoutes from './searchRoutes.js';
import fileRoutes from './fileRoutes.js';
import agentRoutes from './agentRoutes.js';
import dealRoutes from './dealRoutes.js';
import inboxRoutes from './inboxRoutes.js';
import metricsRoutes from './metricsRoutes.js';
import smsRoutes from './smsRoutes.js';
import callRoutes from './callRoutes.js';
import pipelineRoutes from './pipelineRoutes.js';
import { underwritingRoutes } from './underwritingRoutes.js';
import { compsRoutes } from './compsRoutes.js';
import { buyerOfferRoutes } from './buyerOfferRoutes.js';
import { marketingRoutes } from './marketingRoutes.js';
import reminderRoutes from './reminderRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);
router.use('/leads', leadRoutes);
router.use('/search', searchRoutes);
router.use('/files', fileRoutes);
router.use('/agents', agentRoutes);
router.use('/deals', dealRoutes);
router.use('/inbox', inboxRoutes);
router.use('/metrics', metricsRoutes);
router.use('/sms', smsRoutes);
router.use('/calls', callRoutes);
router.use('/pipeline', pipelineRoutes);
router.use('/underwriting', underwritingRoutes);
router.use('/comps', compsRoutes);
router.use('/buyer-offers', buyerOfferRoutes);
router.use('/marketing', marketingRoutes);
router.use('/reminders', reminderRoutes);
router.use('/notifications', notificationRoutes);

export default router;

