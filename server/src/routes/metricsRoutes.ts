import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { metricsController } from '../controllers/metricsController.js';

const router = Router();
router.use(authenticate);

router.get('/lead-deal-flow', (req, res, next) => metricsController.leadDealFlowLast12Months(req, res).catch(next));
router.get('/lead-sources', (req, res, next) => metricsController.leadSourcesLast12Months(req, res).catch(next));
router.get('/company-kpis', (req, res, next) => metricsController.companyKpis(req, res).catch(next));
router.get('/marketing-breakdown', (req, res, next) => metricsController.marketingBreakdown(req, res).catch(next));
router.get('/pipeline-overview', (req, res, next) => metricsController.pipelineOverview(req, res).catch(next));
router.get('/pipeline-analysis', (req, res, next) => metricsController.pipelineAnalysis(req, res).catch(next));
router.get('/pipeline-timeline-metrics', (req, res, next) => metricsController.pipelineTimelineMetrics(req, res).catch(next));
router.get('/communications-overview', (req, res, next) => metricsController.communicationsOverview(req, res).catch(next));
router.get('/acquisitions-overview', (req, res, next) => metricsController.acquisitionsOverview(req, res).catch(next));
router.get('/dispositions-overview', (req, res, next) => metricsController.dispositionsOverview(req, res).catch(next));
router.get('/transactions-overview', (req, res, next) => metricsController.transactionsOverview(req, res).catch(next));
router.get('/acquisitions-leaderboard', (req, res, next) => metricsController.acquisitionsLeaderboard(req, res).catch(next));
router.get('/dispositions-leaderboard', (req, res, next) => metricsController.dispositionsLeaderboard(req, res).catch(next));
router.get('/team-kpis', (req, res, next) => metricsController.teamKpis(req, res).catch(next));
router.get('/major-kpis', (req, res, next) => metricsController.majorKpis(req, res).catch(next));

export default router;


