import { prisma } from '../config/db.js';

export const dealRepository = {
  findByLeadId: (leadId: string) => prisma.deal.findUnique({ where: { leadId } }),
  upsertByLeadId: (leadId: string, data: { contractPrice?: number | null; soldPrice?: number | null; netProfit?: number | null; contractedAt?: Date | null; closedAt?: Date | null }) =>
    prisma.deal.upsert({
      where: { leadId },
      update: data,
      create: { leadId, ...data },
    }),
};


