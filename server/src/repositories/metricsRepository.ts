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
      include: { toStage: { include: { pipeline: true } }, fromStage: true },
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

  getPipelineByKey: (key: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION') =>
    prisma.pipelineDefinition.findUnique({ where: { key }, include: { stages: { orderBy: { orderIndex: 'asc' } } } }),

  countLeadsByStageBetween: async (stageIds: string[], from: Date, to: Date) => {
    // groupBy leads current stage
    const groups = await prisma.lead.groupBy({
      by: ['pipelineStageId'],
      where: {
        pipelineStageId: { in: stageIds },
        createdAt: { gte: from, lt: to },
      },
      _count: { pipelineStageId: true },
    });
    const map: Record<string, number> = {};
    for (const g of groups) {
      const key = (g as any).pipelineStageId as string | null;
      if (key) map[key] = (g as any)._count.pipelineStageId as number;
    }
    return map;
  },

  getStageHistoryForLeads: (leadIds: string[]) =>
    prisma.stageHistory.findMany({
      where: { leadId: { in: leadIds } },
      include: { toStage: { include: { pipeline: true } }, fromStage: true },
      orderBy: { changedAt: 'asc' },
    }),

  getLeadsByStagesBetween: (stageIds: string[], from: Date, to: Date) =>
    prisma.lead.findMany({
      where: { pipelineStageId: { in: stageIds }, createdAt: { gte: from, lt: to } },
      select: { id: true, pipelineStageId: true },
    }),

  getCommunicationsBetween: (from: Date, to: Date, createdById?: string) =>
    prisma.communication.findMany({
      where: {
        occurredAt: { gte: from, lt: to },
        ...(createdById ? { createdById } : {}),
      },
      select: { id: true, type: true, direction: true, occurredAt: true },
      orderBy: { occurredAt: 'asc' },
    }),

  getDispositionsClosedLeadIdsBetween: async (from: Date, to: Date) => {
    const rows = await prisma.stageHistory.findMany({
      where: {
        changedAt: { gte: from, lt: to },
        toStage: { pipeline: { key: 'DISPOSITIONS' as any }, name: { contains: 'Closed', mode: 'insensitive' } },
      },
      select: { leadId: true },
      distinct: ['leadId'] as any,
    });
    return rows.map(r => r.leadId);
  },

  getDealsBetween: (from: Date, to: Date) =>
    prisma.deal.findMany({
      where: {
        OR: [
          { contractedAt: { gte: from, lt: to } },
          { closedAt: { gte: from, lt: to } },
        ],
      },
      select: { contractPrice: true, soldPrice: true, netProfit: true, leadId: true, contractedAt: true, closedAt: true },
    }),

  getDealsContractedBetween: (from: Date, to: Date, filters?: { pipelineKey?: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION'; leadType?: any; assignedUserId?: string }) =>
    prisma.deal.findMany({
      where: {
        contractedAt: { gte: from, lt: to },
        ...(filters?.pipelineKey || filters?.leadType || filters?.assignedUserId
          ? {
              lead: {
                ...(filters?.pipelineKey ? { pipelineStage: { pipeline: { key: filters.pipelineKey as any } } } : {}),
                ...(filters?.leadType ? { leadType: filters.leadType } : {}),
                ...(filters?.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
              },
            }
          : {}),
      },
      select: { leadId: true, contractedAt: true },
    }),

  getDealsClosedBetween: (from: Date, to: Date, filters?: { pipelineKey?: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION'; leadType?: any; assignedUserId?: string }) =>
    prisma.deal.findMany({
      where: {
        closedAt: { gte: from, lt: to },
        ...(filters?.pipelineKey || filters?.leadType || filters?.assignedUserId
          ? {
              lead: {
                ...(filters?.pipelineKey ? { pipelineStage: { pipeline: { key: filters.pipelineKey as any } } } : {}),
                ...(filters?.leadType ? { leadType: filters.leadType } : {}),
                ...(filters?.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
              },
            }
          : {}),
      },
      select: { leadId: true, closedAt: true, netProfit: true },
    }),

  getLeadsCreatedBetweenScoped: (from: Date, to: Date, filters: { pipelineKey: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION'; leadType?: any; assignedUserId?: string; onlyPipelineStatus?: boolean }) =>
    prisma.lead.findMany({
      where: {
        createdAt: { gte: from, lt: to },
        pipelineStage: { pipeline: { key: filters.pipelineKey as any } },
        ...(filters.leadType ? { leadType: filters.leadType } : {}),
        ...(filters.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
        ...(filters.onlyPipelineStatus
          ? { leadStatus: { name: { equals: 'Pipeline', mode: 'insensitive' } } }
          : {}),
      },
      select: { id: true, createdAt: true, updatedAt: true },
    }),

  getActiveLeadsWithActivityByPipeline: (filters: { pipelineKey: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION'; leadType?: any; assignedUserId?: string; onlyPipelineStatus?: boolean }) =>
    prisma.lead.findMany({
      where: {
        pipelineStage: { pipeline: { key: filters.pipelineKey as any } },
        ...(filters.leadType ? { leadType: filters.leadType } : {}),
        ...(filters.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
        ...(filters.onlyPipelineStatus
          ? { leadStatus: { name: { equals: 'Pipeline', mode: 'insensitive' } } }
          : {}),
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        lastContactAt: true,
        communications: {
          orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { occurredAt: true, createdAt: true },
        },
        tasks: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { updatedAt: true, createdAt: true },
        },
      },
    }),
};


