import { Request, Response } from 'express';
import { buyerOfferService } from '../services/buyerOfferService';
import { logger } from '../config/logger';

export const buyerOfferController = {
  async listLeadOffers(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const offers = await buyerOfferService.getOffersByLeadId(leadId);
      res.json(offers);
    } catch (error) {
      logger.error('Error listing lead offers: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to list offers' });
    }
  },

  async listBuyerOffers(req: Request, res: Response): Promise<void> {
    try {
      const { buyerId } = req.params;
      const offers = await buyerOfferService.getOffersByBuyerId(buyerId);
      res.json(offers);
    } catch (error) {
      logger.error('Error listing buyer offers: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to list buyer offers' });
    }
  },

  async getOffer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const offer = await buyerOfferService.getOfferById(id);
      
      if (!offer) {
        res.status(404).json({ error: 'Offer not found' });
        return;
      }

      res.json(offer);
    } catch (error) {
      logger.error('Error getting offer: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get offer' });
    }
  },

  async createOffer(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const offerData = {
        ...req.body,
        leadId
      };

      const offer = await buyerOfferService.createOffer(offerData);
      res.status(201).json(offer);
    } catch (error) {
      logger.error('Error creating offer: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('must be') || 
        error.message.includes('cannot be') ||
        error.message.includes('Invalid')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create offer' });
      }
    }
  },

  async updateOffer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const offer = await buyerOfferService.updateOffer(id, req.body);
      res.json(offer);
    } catch (error) {
      logger.error('Error updating offer: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('must be') || 
        error.message.includes('cannot be') ||
        error.message.includes('Invalid')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update offer' });
      }
    }
  },

  async deleteOffer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await buyerOfferService.deleteOffer(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting offer: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to delete offer' });
    }
  },

  async negotiateOffer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const negotiationData = {
        offerId: id,
        ...req.body
      };

      const offer = await buyerOfferService.negotiateOffer(negotiationData);
      res.json(offer);
    } catch (error) {
      logger.error('Error negotiating offer: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('not found') ||
        error.message.includes('Cannot negotiate')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to negotiate offer' });
      }
    }
  },

  async acceptOffer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      const offer = await buyerOfferService.acceptOffer(id, notes);
      res.json(offer);
    } catch (error) {
      logger.error('Error accepting offer: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('not found') ||
        error.message.includes('already accepted') ||
        error.message.includes('Cannot')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to accept offer' });
      }
    }
  },

  async rejectOffer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const offer = await buyerOfferService.rejectOffer(id, reason);
      res.json(offer);
    } catch (error) {
      logger.error('Error rejecting offer: ' + (error as Error).message);
      
      if (error instanceof Error && (
        error.message.includes('not found') ||
        error.message.includes('Cannot reject')
      )) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to reject offer' });
      }
    }
  },

  async getOfferStats(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const stats = await buyerOfferService.getOfferStats(leadId);
      res.json(stats);
    } catch (error) {
      logger.error('Error getting offer stats: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get offer stats' });
    }
  },

  async getOfferSummary(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const summary = await buyerOfferService.getOfferSummary(leadId);
      res.json(summary);
    } catch (error) {
      logger.error('Error getting offer summary: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to get offer summary' });
    }
  }
};
