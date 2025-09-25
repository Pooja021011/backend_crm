import { prisma } from '../config/db.js';

export const metricsRepository = {
  getLeadsCreatedBetween: (from: Date, to: Date) =>
    prisma.lead.findMany({
      where: {
        createdAt: { gte: from, lt: to },
      },
      select: { id: true, createdAt: true },
    }),

  getStageHistoryBetween: (from: Date, to: Date) =>
    prisma.stageHistory.findMany({
      where: {
        changedAt: { gte: from, lt: to },
      },
      include: { toStage: { include: { pipeline: true } } },
    }),

  // Lead source distribution per month using Lead.createdAt and source stored on lead.customFields or related tables (if any)
  // We infer from Lead.customFields.leadSource when available
  getLeadsWithSourceBetween: (from: Date, to: Date) =>
    prisma.lead.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { id: true, createdAt: true, customFields: true },
    }),

  getLeadBuyersUpdatedBetween: (from: Date, to: Date) =>
    prisma.leadBuyer.findMany({
      where: {
        updatedAt: { gte: from, lt: to },
        offerAmount: { not: null },
      },
      select: { leadId: true, offerAmount: true },
    }),

  getLeadBuyersByLeadIds: (leadIds: string[]) =>
    prisma.leadBuyer.findMany({
      where: {
        leadId: { in: leadIds },
        offerAmount: { not: null },
      },
      select: { leadId: true, offerAmount: true },
    }),
};


