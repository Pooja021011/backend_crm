import { Router } from 'express';
import { marketingPlatformController } from '../controllers/marketingPlatformController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Platform CRUD operations
router.get('/marketing-platforms', marketingPlatformController.listPlatforms);
router.post('/marketing-platforms', marketingPlatformController.createPlatform);
router.get('/marketing-platforms/defaults', marketingPlatformController.getDefaultPlatforms);
router.get('/marketing-platforms/type/:type', marketingPlatformController.getPlatformsByType);
router.get('/marketing-platforms/:id', marketingPlatformController.getPlatform);
router.put('/marketing-platforms/:id', marketingPlatformController.updatePlatform);
router.delete('/marketing-platforms/:id', marketingPlatformController.deletePlatform);
router.patch('/marketing-platforms/:id/toggle', marketingPlatformController.togglePlatformStatus);

export default router;
