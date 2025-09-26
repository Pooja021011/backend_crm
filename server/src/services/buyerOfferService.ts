import { buyerOfferRepository, CreateBuyerOfferData, UpdateBuyerOfferData } from '../repositories/buyerOfferRepository';
import { BuyerOffer, Buyer } from '@prisma/client';

export interface OfferNegotiationData {
  offerId: string;
  counterOfferAmount?: number;
  newTerms?: any;
  notes?: string;
  status: 'countered' | 'accepted' | 'rejected';
}

export const buyerOfferService = {
  async getOffersByLeadId(leadId: string): Promise<(BuyerOffer & { buyer: Buyer })[]> {
    return buyerOfferRepository.getOffersByLeadId(leadId);
  },

  async getOffersByBuyerId(buyerId: string): Promise<(BuyerOffer & { lead: any })[]> {
    return buyerOfferRepository.getOffersByBuyerId(buyerId);
  },

  async getOfferById(id: string): Promise<(BuyerOffer & { buyer: Buyer; lead: any }) | null> {
    return buyerOfferRepository.getOfferById(id);
  },

  async createOffer(data: CreateBuyerOfferData): Promise<BuyerOffer> {
    this.validateOfferData(data);
    return buyerOfferRepository.createOffer(data);
  },

  async updateOffer(id: string, data: UpdateBuyerOfferData): Promise<BuyerOffer> {
    if (data.offerAmount !== undefined) {
      this.validateOfferAmount(data.offerAmount);
    }
    return buyerOfferRepository.updateOffer(id, data);
  },

  async deleteOffer(id: string): Promise<void> {
    return buyerOfferRepository.deleteOffer(id);
  },

  async negotiateOffer(data: OfferNegotiationData): Promise<BuyerOffer> {
    const offer = await buyerOfferRepository.getOfferById(data.offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status === 'accepted' || offer.status === 'rejected') {
      throw new Error('Cannot negotiate an offer that is already accepted or rejected');
    }

    const updateData: UpdateBuyerOfferData = {
      status: data.status,
      notes: data.notes ? `${offer.notes || ''}\n\n--- Negotiation Update ---\n${data.notes}` : offer.notes || undefined
    };

    if (data.status === 'countered') {
      if (data.counterOfferAmount) {
        updateData.offerAmount = data.counterOfferAmount;
      }
      if (data.newTerms) {
        updateData.terms = { ...((offer.terms as any) || {}), ...data.newTerms };
      }
    }

    return buyerOfferRepository.updateOffer(data.offerId, updateData);
  },

  async acceptOffer(offerId: string, notes?: string): Promise<BuyerOffer> {
    const offer = await buyerOfferRepository.getOfferById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status === 'accepted') {
      throw new Error('Offer is already accepted');
    }

    // Mark all other offers for this lead as rejected
    const allOffers = await buyerOfferRepository.getOffersByLeadId(offer.leadId);
    for (const otherOffer of allOffers) {
      if (otherOffer.id !== offerId && otherOffer.status === 'pending') {
        await buyerOfferRepository.updateOffer(otherOffer.id, { 
          status: 'rejected',
          notes: `${otherOffer.notes || ''}\n\nRejected: Another offer was accepted.`
        });
      }
    }

    // Accept the selected offer
    return buyerOfferRepository.updateOffer(offerId, {
      status: 'accepted',
      notes: notes ? `${offer.notes || ''}\n\n--- Offer Accepted ---\n${notes}` : offer.notes || undefined
    });
  },

  async rejectOffer(offerId: string, reason?: string): Promise<BuyerOffer> {
    const offer = await buyerOfferRepository.getOfferById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status === 'accepted') {
      throw new Error('Cannot reject an accepted offer');
    }

    return buyerOfferRepository.updateOffer(offerId, {
      status: 'rejected',
      notes: reason ? `${offer.notes || ''}\n\n--- Offer Rejected ---\n${reason}` : offer.notes || undefined
    });
  },

  async getOfferStats(leadId: string) {
    return buyerOfferRepository.getOfferStats(leadId);
  },

  async getOfferSummary(leadId: string): Promise<{
    stats: any;
    topOffers: (BuyerOffer & { buyer: Buyer })[];
    recentActivity: (BuyerOffer & { buyer: Buyer })[];
  }> {
    const [stats, allOffers] = await Promise.all([
      buyerOfferRepository.getOfferStats(leadId),
      buyerOfferRepository.getOffersByLeadId(leadId)
    ]);

    // Get top 3 offers by amount
    const topOffers = [...allOffers]
      .sort((a, b) => b.offerAmount - a.offerAmount)
      .slice(0, 3);

    // Get recent activity (last 5 offers/updates)
    const recentActivity = [...allOffers]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return {
      stats,
      topOffers,
      recentActivity
    };
  },

  validateOfferData(data: CreateBuyerOfferData): void {
    this.validateOfferAmount(data.offerAmount);

    if (data.terms?.earnestMoney !== undefined && data.terms.earnestMoney < 0) {
      throw new Error('Earnest money must be non-negative');
    }

    if (data.terms?.inspectionPeriod !== undefined && data.terms.inspectionPeriod < 0) {
      throw new Error('Inspection period must be non-negative');
    }

    if (data.terms?.closingDate) {
      const closingDate = new Date(data.terms.closingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (closingDate < today) {
        throw new Error('Closing date cannot be in the past');
      }
    }
  },

  validateOfferAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Offer amount must be positive');
    }

    if (amount > 100000000) { // $100M max
      throw new Error('Offer amount is unreasonably high');
    }
  }
};
