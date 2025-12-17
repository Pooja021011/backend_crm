import { Router } from 'express';
import { authenticate, authenticateWithQuery } from '../middleware/auth.js';
import { fileController, uploader } from '../controllers/fileController.js';

const router = Router();

// File preview and download - allow token in query params for img tags
router.get('/:fileId/download', authenticateWithQuery, (req, res, next) => fileController.download(req, res).catch(next));
router.get('/:fileId/preview', authenticateWithQuery, (req, res, next) => fileController.preview(req, res).catch(next));

// All other routes require header authentication
router.use(authenticate);

// File upload and management
router.post('/upload', uploader.single('file'), (req, res, next) => fileController.upload(req, res).catch(next));
router.post('/:fileId/version', uploader.single('file'), (req, res, next) => fileController.addVersion(req, res).catch(next));

// File operations
router.get('/lead/:id', (req, res, next) => fileController.listForLead(req, res).catch(next));
router.get('/:fileId', (req, res, next) => fileController.getFileInfo(req, res).catch(next));

// File metadata updates
router.put('/:fileId', (req, res, next) => fileController.updateFile(req, res).catch(next));
router.delete('/:fileId', (req, res, next) => fileController.deleteFile(req, res).catch(next));

export default router;

