import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { dealController } from '../controllers/dealController.js';

const router = Router();
router.use(authenticate);

router.get('/:leadId', (req, res, next) => dealController.getByLead(req, res).catch(next));
router.post('/:leadId', requireRoles('ADMIN'), (req, res, next) => dealController.upsertByLead(req, res).catch(next));

export default router;


