import { prisma } from '../config/db.js';

export const buyerRepository = {
  listForLead: (leadId: string) => prisma.leadBuyer.findMany({ where: { leadId }, include: { buyer: true } }),
  linkBuyer: async (leadId: string, data: { buyerId?: string; buyerNew?: { firstName: string; lastName: string; phone: string; email: string; segmentation?: string } }) => {
    let buyerId = data.buyerId;
    if (!buyerId && data.buyerNew) {
      const b = await prisma.buyer.create({ data: { ...data.buyerNew } });
      buyerId = b.id;
    }
    if (!buyerId) throw new Error('buyerId or buyerNew required');
    return prisma.leadBuyer.create({ data: { leadId, buyerId, status: 'interested' } });
  },
  updateLeadBuyer: (id: string, data: { status?: string; offerAmount?: number; terms?: any }) => prisma.leadBuyer.update({ where: { id }, data: { ...data, updatedAt: new Date() } }),
};

