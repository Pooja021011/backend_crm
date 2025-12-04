import { Router } from 'express';
import { priceHistoryController } from '../controllers/priceHistoryController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get price history for a lead
router.get('/leads/:leadId/price-history', priceHistoryController.getPriceHistory);

// Get price history summary (latest values)
router.get('/leads/:leadId/price-history/summary', priceHistoryController.getPriceHistorySummary);

// Get lead timeline with price data
router.get('/leads/:leadId/timeline', priceHistoryController.getLeadTimeline);

// Create price history entry
router.post('/leads/:leadId/price-history', priceHistoryController.createPriceHistory);

// Track price change (only creates if value changed)
router.post('/leads/:leadId/price-history/track', priceHistoryController.trackPriceChange);

// Batch track multiple price changes
router.post('/leads/:leadId/price-history/track-batch', priceHistoryController.trackBatchPriceChanges);

// Delete price history entry
router.delete('/leads/:leadId/price-history/:historyId', priceHistoryController.deletePriceHistory);

export default router;

