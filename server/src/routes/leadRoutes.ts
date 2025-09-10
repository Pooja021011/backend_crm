import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { leadController } from '../controllers/leadController.js';
import { fileController, uploader } from '../controllers/fileController.js';
import { underwritingController } from '../controllers/underwritingController.js';
import { leadBuyerController } from '../controllers/leadBuyerController.js';
import { communicationController } from '../controllers/communicationController.js';
import { marketingController } from '../controllers/marketingController.js';
import { compsRepository } from '../repositories/compsRepository.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => leadController.list(req, res).catch(next));
router.post('/', (req, res, next) => leadController.create(req, res).catch(next));
router.get('/:id', (req, res, next) => leadController.get(req, res).catch(next));
router.patch('/:id', (req, res, next) => leadController.update(req, res).catch(next));
router.post('/:id/stage', (req, res, next) => leadController.changeStage(req, res).catch(next));

// Tasks nested
router.get('/:id/tasks', (req, res, next) => leadController.listTasks(req, res).catch(next));
router.post('/:id/tasks', (req, res, next) => leadController.createTask(req, res).catch(next));
router.patch('/:id/tasks/:taskId', (req, res, next) => leadController.updateTask(req, res).catch(next));
router.delete('/:id/tasks/:taskId', (req, res, next) => leadController.deleteTask(req, res).catch(next));

// Documents
router.get('/:id/files', (req, res, next) => fileController.listForLead(req, res).catch(next));
router.post('/:id/files', uploader.single('file'), (req, res, next) => fileController.uploadForLead(req, res).catch(next));
router.post('/:id/files/:fileId/version', uploader.single('file'), (req, res, next) => fileController.addVersion(req, res).catch(next));

// Underwriting
router.get('/:id/underwriting', (req, res, next) => underwritingController.list(req, res).catch(next));
router.post('/:id/underwriting', (req, res, next) => underwritingController.create(req, res).catch(next));
router.patch('/:id/underwriting/:scenarioId', (req, res, next) => underwritingController.update(req, res).catch(next));
router.delete('/:id/underwriting/:scenarioId', (req, res, next) => underwritingController.delete(req, res).catch(next));
router.post('/:id/underwriting/:scenarioId/export', (req, res, next) => underwritingController.exportPdf(req, res).catch(next));

// Lead Buyers
router.get('/:id/buyers', (req, res, next) => leadBuyerController.list(req, res).catch(next));
router.post('/:id/buyers', (req, res, next) => leadBuyerController.add(req, res).catch(next));
router.patch('/:id/buyers/:leadBuyerId', (req, res, next) => leadBuyerController.update(req, res).catch(next));

// Communications
router.get('/:id/communications', (req, res, next) => communicationController.list(req, res).catch(next));
router.post('/:id/communications', (req, res, next) => communicationController.create(req, res).catch(next));

// Marketing links
router.get('/:id/marketing-links', (req, res, next) => marketingController.list(req, res).catch(next));
router.post('/:id/marketing-links', (req, res, next) => marketingController.create(req, res).catch(next));
router.patch('/:id/marketing-links/:linkId', (req, res, next) => marketingController.update(req, res).catch(next));
router.delete('/:id/marketing-links/:linkId', (req, res, next) => marketingController.delete(req, res).catch(next));

// Comps
router.get('/:id/comps', async (req, res, next) => {
  try {
    const { city, zip, beds, baths, sqftMin, sqftMax, from, to } = req.query as any;
    const data = await compsRepository.search({
      city: city as string | undefined,
      zip: zip as string | undefined,
      beds: beds ? Number(beds) : undefined,
      baths: baths ? Number(baths) : undefined,
      sqftMin: sqftMin ? Number(sqftMin) : undefined,
      sqftMax: sqftMax ? Number(sqftMax) : undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    });
    res.json({ data });
  } catch (e) { next(e); }
});

export default router;

