import { Router } from 'express';
import { buyerOfferController } from '../controllers/buyerOfferController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Lead-specific offers
router.get('/leads/:leadId/offers', buyerOfferController.listLeadOffers);
router.post('/leads/:leadId/offers', buyerOfferController.createOffer);
router.get('/leads/:leadId/offers/stats', buyerOfferController.getOfferStats);
router.get('/leads/:leadId/offers/summary', buyerOfferController.getOfferSummary);

// Buyer-specific offers
router.get('/buyers/:buyerId/offers', buyerOfferController.listBuyerOffers);

// Individual offer operations
router.get('/offers/:id', buyerOfferController.getOffer);
router.put('/offers/:id', buyerOfferController.updateOffer);
router.delete('/offers/:id', buyerOfferController.deleteOffer);

// Offer negotiation actions
router.put('/offers/:id/negotiate', buyerOfferController.negotiateOffer);
router.put('/offers/:id/accept', buyerOfferController.acceptOffer);
router.put('/offers/:id/reject', buyerOfferController.rejectOffer);

export { router as buyerOfferRoutes };
