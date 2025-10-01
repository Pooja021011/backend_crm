import { prisma } from '../config/db.js';
import type { LeadType, TaskStatus } from '@prisma/client';

export type LeadCreateInput =
  | { type: 'SELLER'; marketId?: string; address: { address1: string; city: string; state: string; zip: string; countyId?: string }; seller: { firstName: string; lastName: string; phone: string; email: string; motivation?: string; notes?: string }; assignedUserId?: string; pipelineStageId?: string }
  | { type: 'BUYER'; marketId?: string; buyer: { firstName: string; lastName: string; phone: string; email: string; vip?: boolean }; criteria?: { marketIds?: string[]; assetClassIds?: string[]; priceRangeIds?: string[] }; assignedUserId?: string; pipelineStageId?: string }
  | { type: 'VENDOR'; marketId?: string; vendor: { firstName: string; lastName: string; phone: string; email: string; company: string; industry: string; marketIds?: string[] }; assignedUserId?: string; pipelineStageId?: string };

export const leadRepository = {
  async create(input: LeadCreateInput, createdById?: string) {
    // Validate that pipelineStageId exists
    const validatePipelineStage = async (stageId: string) => {
      const stage = await prisma.pipelineStage.findUnique({
        where: { id: stageId },
        include: { pipeline: true }
      });
      if (!stage) {
        throw new Error(`Pipeline stage with ID ${stageId} not found`);
      }
      return stage;
    };

    // Get default pipeline stage for lead type
    const getDefaultPipelineStage = async (leadType: string) => {
      let pipelineKey = 'ACQUISITIONS'; // Default
      
      if (leadType === 'SELLER') {
        pipelineKey = 'ACQUISITIONS';
      } else if (leadType === 'BUYER') {
        pipelineKey = 'DISPOSITIONS';  
      } else if (leadType === 'VENDOR') {
        pipelineKey = 'ACQUISITIONS'; // Fallback
      }
      
      // Get the first stage (orderIndex = 0) of the appropriate pipeline
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          pipeline: { key: pipelineKey },
          orderIndex: 0 // First stage (New Lead)
        },
        include: { pipeline: true }
      });
      
      if (!stage) {
        throw new Error(`No default stage found for pipeline ${pipelineKey}`);
      }
      
      console.log(`Found default stage: ${stage.name} for ${leadType} lead`);
      return stage;
    };

    if (input.type === 'SELLER') {
      const { address, seller, marketId, assignedUserId } = input;
      let { pipelineStageId } = input;
      
      // If no pipelineStageId provided, get default stage
      if (!pipelineStageId) {
        const defaultStage = await getDefaultPipelineStage('SELLER');
        pipelineStageId = defaultStage.id;
        console.log(`Auto-assigned default stage: ${defaultStage.name} for SELLER lead`);
      } else {
        // Validate provided pipeline stage exists
        await validatePipelineStage(pipelineStageId);
      }
      
      return prisma.lead.create({
        data: {
          leadType: 'SELLER',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId,
          stageEnteredAt: new Date(),
          createdById: createdById || null,
          address: { create: address },
          seller: { create: seller },
        },
        include: includeLead,
      });
    }
    if (input.type === 'BUYER') {
      const { buyer, criteria, marketId, assignedUserId } = input;
      let { pipelineStageId } = input;
      
      // If no pipelineStageId provided, get default stage
      if (!pipelineStageId) {
        const defaultStage = await getDefaultPipelineStage('BUYER');
        pipelineStageId = defaultStage.id;
        console.log(`Auto-assigned default stage: ${defaultStage.name} for BUYER lead`);
      } else {
        // Validate provided pipeline stage exists
        await validatePipelineStage(pipelineStageId);
      }
      
      return prisma.lead.create({
        data: {
          leadType: 'BUYER',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId,
          stageEnteredAt: new Date(),
          createdById: createdById || null,
          buyer: { create: buyer },
          ...(criteria ? { buyerCriteria: { create: criteria } } : {}),
        },
        include: includeLead,
      });
    }
    if (input.type === 'VENDOR') {
      const { vendor, marketId, assignedUserId } = input;
      let { pipelineStageId } = input;
      
      // If no pipelineStageId provided, get default stage
      if (!pipelineStageId) {
        const defaultStage = await getDefaultPipelineStage('VENDOR');
        pipelineStageId = defaultStage.id;
        console.log(`Auto-assigned default stage: ${defaultStage.name} for VENDOR lead`);
      } else {
        // Validate provided pipeline stage exists
        await validatePipelineStage(pipelineStageId);
      }
      
      return prisma.lead.create({
        data: {
          leadType: 'VENDOR',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId,
          stageEnteredAt: new Date(),
          createdById: createdById || null,
          vendor: { create: vendor },
        },
        include: includeLead,
      });
    }
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
    countyId?: string;
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
    tasksDueBefore?: string;
    priceRangeIds?: string[];
    assetClassIds?: string[];
    vipBuyer?: boolean;
    blacklistedBuyer?: boolean;
    vendorCompany?: string;
    vendorIndustry?: string;
    q?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    skip?: number;
    take?: number;
    userRoles?: string[];
    userId?: string;
  }) {
    const { type, marketId, pipelineStageId, status, countyId, createdFrom, createdTo, updatedFrom, updatedTo, tasksDueBefore, priceRangeIds, assetClassIds, vipBuyer, blacklistedBuyer, vendorCompany, vendorIndustry, q, sort = 'updatedAt', order = 'desc', skip = 0, take = 20, userRoles = [], userId } = params;

    const where: any = {};
    
    // Role-based access control
    if (userRoles.length > 0) {
      const isACQ = userRoles.includes('ACQ');
      const isDisp = userRoles.includes('DISP');
      const isAdmin = userRoles.includes('ADMIN');
      const isExecutive = userRoles.includes('EXECUTIVE');
      const isManager = userRoles.includes('MANAGER');
      const isTC = userRoles.includes('TC');

      // Role-based lead type restrictions
      if (isACQ && !isAdmin && !isExecutive && !isManager && !isTC) {
        // Acquisitions Agent can only see their assigned seller leads
        where.leadType = 'SELLER';
        where.assignedUserId = userId;
      } else if (isDisp && !isAdmin && !isExecutive && !isManager && !isTC) {
        // Dispositions Agent can only see their assigned buyer leads
        where.leadType = 'BUYER';
        where.assignedUserId = userId;
      }
      // Admin, Executive, Manager, TC can see all lead types
    }
    
    if (type) where.leadType = type;
    if (marketId) where.marketId = marketId;
    if (pipelineStageId) where.pipelineStageId = pipelineStageId;
    if (status) where.status = status;
    if (createdFrom || createdTo) where.createdAt = { gte: createdFrom ? new Date(createdFrom) : undefined, lte: createdTo ? new Date(createdTo) : undefined };
    if (updatedFrom || updatedTo) where.updatedAt = { gte: updatedFrom ? new Date(updatedFrom) : undefined, lte: updatedTo ? new Date(updatedTo) : undefined };
    if (countyId) where.address = { countyId };
    if (tasksDueBefore) where.tasks = { some: { status: 'OPEN', dueAt: { lte: new Date(tasksDueBefore) } } };
    if (type === 'BUYER') {
      if (vipBuyer != null) where.buyer = { ...(where.buyer || {}), vip: vipBuyer };
      if (blacklistedBuyer != null) where.buyer = { ...(where.buyer || {}), blacklisted: blacklistedBuyer };
      if (priceRangeIds?.length) where.buyerCriteria = { ...(where.buyerCriteria || {}), priceRangeIds: { hasSome: priceRangeIds } };
      if (assetClassIds?.length) where.buyerCriteria = { ...(where.buyerCriteria || {}), assetClassIds: { hasSome: assetClassIds } };
    }
    if (type === 'VENDOR') {
      if (vendorCompany) where.vendor = { ...(where.vendor || {}), company: { contains: vendorCompany, mode: 'insensitive' } };
      if (vendorIndustry) where.vendor = { ...(where.vendor || {}), industry: { contains: vendorIndustry, mode: 'insensitive' } };
    }
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

