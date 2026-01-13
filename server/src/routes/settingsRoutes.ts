import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import marketingPlatformRoutes from './marketingPlatformRoutes.js';
import { uploader as fileUploader } from '../controllers/fileController.js';

const router = Router();

// Read endpoints (all authenticated roles)
router.use(authenticate);
router.get('/markets', (req, res, next) => settingsController.listMarkets(req, res).catch(next));
router.get('/counties', (req, res, next) => settingsController.listCounties(req, res).catch(next));
router.get('/lead-sources', (req, res, next) => settingsController.listLeadSources(req, res).catch(next));
router.get('/asset-classes', (req, res, next) => settingsController.listAssetClasses(req, res).catch(next));
router.get('/price-ranges', (req, res, next) => settingsController.listPriceRanges(req, res).catch(next));
router.get('/doc-categories', (req, res, next) => settingsController.listDocCategories(req, res).catch(next));
router.get('/app-settings', (req, res, next) => settingsController.getAppSettings(req, res).catch(next));
router.get('/pipelines', (req, res, next) => settingsController.listPipelines(req, res).catch(next));

// Per-user Email Settings (any authenticated user)
router.get('/email', (req, res, next) => settingsController.getUserEmailSettings(req, res).catch(next));
router.post('/email', (req, res, next) => settingsController.upsertUserEmailSettings(req, res).catch(next));
router.post('/email/test-imap', (req, res, next) => settingsController.testImapConnection(req, res).catch(next));
router.post('/email/test-smtp', (req, res, next) => settingsController.testSmtpConnection(req, res).catch(next));
router.get('/email/fetch-gmail', (req, res, next) => settingsController.fetchGmailEmails(req, res).catch(next));
router.get('/email/fetch-lead-emails', (req, res, next) => settingsController.fetchLeadEmails(req, res).catch(next));
router.post('/email/send', (req, res, next) => settingsController.sendEmail(req, res).catch(next));
router.post('/email/fetch-thread', (req, res, next) => settingsController.fetchEmailThread(req, res).catch(next));
router.post('/email/mark-read', (req, res, next) => settingsController.markEmailAsRead(req, res).catch(next));

// Per-user SMS Settings (any authenticated user)
router.get('/sms', (req, res, next) => settingsController.getUserSmsSettings(req, res).catch(next));
router.post('/sms', (req, res, next) => settingsController.upsertUserSmsSettings(req, res).catch(next));
router.post('/sms/voicemail-greeting', fileUploader.single('file'), (req, res, next) =>
  settingsController.uploadVoicemailGreeting(req, res).catch(next)
);
router.delete('/sms/voicemail-greeting', (req, res, next) =>
  settingsController.deleteVoicemailGreeting(req, res).catch(next)
);

// Mutations (ADMIN only)
router.use(requireRoles('ADMIN'));
router.post('/markets', (req, res, next) => settingsController.createMarket(req, res).catch(next));
router.patch('/markets/:id', (req, res, next) => settingsController.updateMarket(req, res).catch(next));
router.delete('/markets/:id', (req, res, next) => settingsController.deleteMarket(req, res).catch(next));

router.post('/counties', (req, res, next) => settingsController.createCounty(req, res).catch(next));
router.patch('/counties/:id', (req, res, next) => settingsController.updateCounty(req, res).catch(next));
router.delete('/counties/:id', (req, res, next) => settingsController.deleteCounty(req, res).catch(next));

router.post('/lead-sources', (req, res, next) => settingsController.createLeadSource(req, res).catch(next));
router.patch('/lead-sources/:id', (req, res, next) => settingsController.updateLeadSource(req, res).catch(next));
router.delete('/lead-sources/:id', (req, res, next) => settingsController.deleteLeadSource(req, res).catch(next));

router.post('/asset-classes', (req, res, next) => settingsController.createAssetClass(req, res).catch(next));
router.patch('/asset-classes/:id', (req, res, next) => settingsController.updateAssetClass(req, res).catch(next));
router.delete('/asset-classes/:id', (req, res, next) => settingsController.deleteAssetClass(req, res).catch(next));

router.post('/price-ranges', (req, res, next) => settingsController.createPriceRange(req, res).catch(next));
router.patch('/price-ranges/:id', (req, res, next) => settingsController.updatePriceRange(req, res).catch(next));
router.delete('/price-ranges/:id', (req, res, next) => settingsController.deletePriceRange(req, res).catch(next));

router.post('/doc-categories', (req, res, next) => settingsController.createDocCategory(req, res).catch(next));
router.patch('/doc-categories/:id', (req, res, next) => settingsController.updateDocCategory(req, res).catch(next));
router.delete('/doc-categories/:id', (req, res, next) => settingsController.deleteDocCategory(req, res).catch(next));

router.post('/app-settings', (req, res, next) => settingsController.setAppSettings(req, res).catch(next));

router.post('/pipelines/:pipelineId/stages', (req, res, next) => settingsController.createStage(req, res).catch(next));
router.patch('/pipelines/:pipelineId/stages/reorder', (req, res, next) => settingsController.reorderStages(req, res).catch(next));
router.patch('/pipelines/:pipelineId/stages/:stageId', (req, res, next) => settingsController.updateStage(req, res).catch(next));
router.delete('/pipelines/:pipelineId/stages/:stageId', (req, res, next) => settingsController.deleteStage(req, res).catch(next));

// Marketing platform settings (admin only)
router.use('/', marketingPlatformRoutes);

export default router;

