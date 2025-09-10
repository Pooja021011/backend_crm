import { prisma } from '../config/db.js';
import type { LeadType, TaskStatus } from '@prisma/client';

export type LeadCreateInput =
  | { type: 'SELLER'; marketId?: string; address: { address1: string; city: string; state: string; zip: string; countyId?: string }; seller: { firstName: string; lastName: string; phone: string; email: string; motivation?: string; notes?: string }; assignedUserId?: string; pipelineStageId?: string }
  | { type: 'BUYER'; marketId?: string; buyer: { firstName: string; lastName: string; phone: string; email: string; vip?: boolean }; criteria?: { marketIds?: string[]; assetClassIds?: string[]; priceRangeIds?: string[] }; assignedUserId?: string; pipelineStageId?: string }
  | { type: 'VENDOR'; marketId?: string; vendor: { firstName: string; lastName: string; phone: string; email: string; company: string; industry: string; marketIds?: string[] }; assignedUserId?: string; pipelineStageId?: string };

export const leadRepository = {
  async create(input: LeadCreateInput, createdById?: string) {
    if (input.type === 'SELLER') {
      const { address, seller, marketId, assignedUserId, pipelineStageId } = input;
      return prisma.lead.create({
        data: {
          leadType: 'SELLER',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId || null,
          createdById: createdById || null,
          address: { create: address },
          seller: { create: seller },
        },
        include: includeLead,
      });
    }
    if (input.type === 'BUYER') {
      const { buyer, criteria, marketId, assignedUserId, pipelineStageId } = input;
      return prisma.lead.create({
        data: {
          leadType: 'BUYER',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId || null,
          createdById: createdById || null,
          buyer: { create: buyer },
          ...(criteria ? { buyerCriteria: { create: criteria } } : {}),
        },
        include: includeLead,
      });
    }
    const { vendor, marketId, assignedUserId, pipelineStageId } = input;
    return prisma.lead.create({
      data: {
        leadType: 'VENDOR',
        marketId: marketId || null,
        assignedUserId: assignedUserId || null,
        pipelineStageId: pipelineStageId || null,
        createdById: createdById || null,
        vendor: { create: vendor },
      },
      include: includeLead,
    });
  },

  async update(id: string, data: any) {
    return prisma.lead.update({ where: { id }, data, include: includeLead });
  },

  async findById(id: string) {
    return prisma.lead.findUnique({ where: { id }, include: includeLead });
  },

  async list(params: {
    type?: LeadType;
    marketId?: string;
    pipelineStageId?: string;
    status?: string;
    q?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    skip?: number;
    take?: number;
  }) {
    const { type, marketId, pipelineStageId, status, q, sort = 'updatedAt', order = 'desc', skip = 0, take = 20 } = params;

    const where: any = {};
    if (type) where.leadType = type;
    if (marketId) where.marketId = marketId;
    if (pipelineStageId) where.pipelineStageId = pipelineStageId;
    if (status) where.status = status;
    if (q) {
      // Simple ilike search across common fields
      where.OR = [
        { address: { address1: { contains: q, mode: 'insensitive' } } },
        { seller: { firstName: { contains: q, mode: 'insensitive' } } },
        { seller: { lastName: { contains: q, mode: 'insensitive' } } },
        { buyer: { firstName: { contains: q, mode: 'insensitive' } } },
        { buyer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return prisma.lead.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take: Math.min(take, 100),
      include: includeLead,
    });
  },

  async changeStage(leadId: string, toStageId: string, changedById?: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return null;
    const updated = await prisma.lead.update({ where: { id: leadId }, data: { pipelineStageId: toStageId }, include: includeLead });
    await prisma.stageHistory.create({ data: { leadId, fromStageId: lead.pipelineStageId, toStageId, changedById: changedById || null } });
    return updated;
  },

  async suggestions(q: string, take = 10) {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { address: { address1: { contains: q, mode: 'insensitive' } } },
          { seller: { firstName: { contains: q, mode: 'insensitive' } } },
          { seller: { lastName: { contains: q, mode: 'insensitive' } } },
          { buyer: { firstName: { contains: q, mode: 'insensitive' } } },
          { buyer: { lastName: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { address: true, seller: true, buyer: true },
      take,
    });
    return leads.map((l) => ({
      id: l.id,
      type: l.leadType,
      label: l.address?.address1 || [l.seller?.firstName, l.seller?.lastName, l.buyer?.firstName, l.buyer?.lastName].filter(Boolean).join(' '),
    }));
  },
};

const includeLead = {
  address: true,
  seller: true,
  buyer: true,
  buyerCriteria: true,
  vendor: true,
  pipelineStage: true,
};

