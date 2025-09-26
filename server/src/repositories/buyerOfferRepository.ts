import { PrismaClient, BuyerOffer, Buyer } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBuyerOfferData {
  leadId: string;
  buyerId: string;
  offerAmount: number;
  terms?: {
    financingType?: string; // cash, conventional, hard_money, etc.
    closingDate?: string;
    contingencies?: string[];
    earnestMoney?: number;
    inspectionPeriod?: number;
    otherTerms?: string;
  };
  status?: string; // pending, accepted, rejected, countered
  notes?: string;
}

export interface UpdateBuyerOfferData {
  offerAmount?: number;
  terms?: {
    financingType?: string;
    closingDate?: string;
    contingencies?: string[];
    earnestMoney?: number;
    inspectionPeriod?: number;
    otherTerms?: string;
  };
  status?: string;
  notes?: string;
}

export const buyerOfferRepository = {
  async getOffersByLeadId(leadId: string): Promise<(BuyerOffer & { buyer: Buyer })[]> {
    return prisma.buyerOffer.findMany({
      where: { leadId },
      include: {
        buyer: true
      },
      orderBy: [
        { status: 'asc' }, // pending first, then accepted, etc.
        { offerAmount: 'desc' }, // highest offers first
        { createdAt: 'desc' }
      ]
    });
  },

  async getOffersByBuyerId(buyerId: string): Promise<(BuyerOffer & { lead: any })[]> {
    return prisma.buyerOffer.findMany({
      where: { buyerId },
      include: {
        lead: {
          include: {
            address: true,
            seller: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  async getOfferById(id: string): Promise<(BuyerOffer & { buyer: Buyer; lead: any }) | null> {
    return prisma.buyerOffer.findUnique({
      where: { id },
      include: {
        buyer: true,
        lead: {
          include: {
            address: true,
            seller: true
          }
        }
      }
    });
  },

  async createOffer(data: CreateBuyerOfferData): Promise<BuyerOffer> {
    return prisma.buyerOffer.create({
      data: {
        leadId: data.leadId,
        buyerId: data.buyerId,
        offerAmount: data.offerAmount,
        terms: data.terms as any,
        status: data.status || 'pending',
        notes: data.notes
      }
    });
  },

  async updateOffer(id: string, data: UpdateBuyerOfferData): Promise<BuyerOffer> {
    const currentOffer = await prisma.buyerOffer.findUnique({ where: { id } });
    if (!currentOffer) {
      throw new Error('Offer not found');
    }

    // Merge terms if provided
    const updatedTerms = data.terms 
      ? { ...((currentOffer.terms as any) || {}), ...data.terms }
      : currentOffer.terms;

    return prisma.buyerOffer.update({
      where: { id },
      data: {
        offerAmount: data.offerAmount,
        terms: updatedTerms as any,
        status: data.status,
        notes: data.notes
      }
    });
  },

  async deleteOffer(id: string): Promise<void> {
    await prisma.buyerOffer.delete({
      where: { id }
    });
  },

  async getOfferStats(leadId: string): Promise<{
    totalOffers: number;
    highestOffer: number | null;
    averageOffer: number | null;
    pendingOffers: number;
    acceptedOffers: number;
  }> {
    const offers = await prisma.buyerOffer.findMany({
      where: { leadId },
      select: {
        offerAmount: true,
        status: true
      }
    });

    const totalOffers = offers.length;
    const offerAmounts = offers.map(o => o.offerAmount);
    const highestOffer = offerAmounts.length > 0 ? Math.max(...offerAmounts) : null;
    const averageOffer = offerAmounts.length > 0 
      ? Math.round(offerAmounts.reduce((sum, amount) => sum + amount, 0) / offerAmounts.length)
      : null;

    const pendingOffers = offers.filter(o => o.status === 'pending').length;
    const acceptedOffers = offers.filter(o => o.status === 'accepted').length;

    return {
      totalOffers,
      highestOffer,
      averageOffer,
      pendingOffers,
      acceptedOffers
    };
  }
};
