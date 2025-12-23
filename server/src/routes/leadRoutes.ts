import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { leadController } from '../controllers/leadController.js';
import { fileController, uploader } from '../controllers/fileController.js';
import { leadBuyerController } from '../controllers/leadBuyerController.js';
import { communicationController } from '../controllers/communicationController.js';
import { pipelineController } from '../controllers/pipelineController.js';

const router = Router();

router.use(authenticate);

// Lead sources for filtering
router.get('/sources', (req, res, next) => pipelineController.getLeadSources(req, res).catch(next));

router.get('/', (req, res, next) => leadController.list(req, res).catch(next));
router.get('/search', (req, res, next) => leadController.searchByPhone(req, res).catch(next));
router.post('/', (req, res, next) => leadController.create(req, res).catch(next));
router.get('/:id', (req, res, next) => leadController.get(req, res).catch(next));
router.patch('/:id', (req, res, next) => leadController.update(req, res).catch(next));
router.delete('/:id', (req, res, next) => leadController.delete(req, res).catch(next));
router.post('/:id/stage', (req, res, next) => leadController.changeStage(req, res).catch(next));
router.get('/:id/stage-history', (req, res, next) => leadController.getStageHistory(req, res).catch(next));

// Tasks nested
router.get('/:id/tasks', (req, res, next) => leadController.listTasks(req, res).catch(next));
router.post('/:id/tasks', (req, res, next) => leadController.createTask(req, res).catch(next));
router.patch('/:id/tasks/:taskId', (req, res, next) => leadController.updateTask(req, res).catch(next));
router.delete('/:id/tasks/:taskId', (req, res, next) => leadController.deleteTask(req, res).catch(next));

// Documents
router.get('/:id/files', (req, res, next) => fileController.listForLead(req, res).catch(next));
router.post('/:id/files', uploader.single('file'), (req, res, next) => fileController.uploadFile(req, res).catch(next));
router.post('/:id/files/:fileId/version', uploader.single('file'), (req, res, next) => fileController.addVersion(req, res).catch(next));

// Lead Buyers
router.get('/:id/buyers', (req, res, next) => leadBuyerController.list(req, res).catch(next));
router.post('/:id/buyers', (req, res, next) => leadBuyerController.add(req, res).catch(next));
router.patch('/:id/buyers/:leadBuyerId', (req, res, next) => leadBuyerController.update(req, res).catch(next));

// Communications
router.get('/:id/communications', (req, res, next) => communicationController.list(req, res).catch(next));
router.post('/:id/communications', (req, res, next) => communicationController.create(req, res).catch(next));

// Note: Marketing, underwriting, and comps functionality moved to separate route files

export default router;

