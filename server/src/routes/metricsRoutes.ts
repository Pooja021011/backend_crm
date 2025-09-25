import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { metricsController } from '../controllers/metricsController.js';

const router = Router();
router.use(authenticate);

router.get('/lead-deal-flow', (req, res, next) => metricsController.leadDealFlowLast12Months(req, res).catch(next));
router.get('/lead-sources', (req, res, next) => metricsController.leadSourcesLast12Months(req, res).catch(next));
router.get('/company-kpis', (req, res, next) => metricsController.companyKpis(req, res).catch(next));

export default router;


