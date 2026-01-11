import { prisma } from '../config/db.js';
import type { LeadType, TaskStatus } from '@prisma/client';

export type LeadCreateInput =
  | { type: 'SELLER'; marketId?: string; leadSourceId?: string; address: { address1: string; city: string; state: string; zip: string; countyId?: string }; seller: { firstName: string; lastName: string; phone: string; email: string; motivation?: string; notes?: string }; assignedUserId?: string; pipelineStageId?: string }
  | { type: 'BUYER'; marketId?: string; leadSourceId?: string; buyer: { firstName: string; lastName: string; phone: string; email: string; vip?: boolean }; criteria?: { marketIds?: string[]; assetClassIds?: string[]; priceRangeIds?: string[] }; assignedUserId?: string; pipelineStageId?: string }
  | { type: 'VENDOR'; marketId?: string; leadSourceId?: string; vendor: { firstName: string; lastName: string; phone: string; email: string; company: string; industry: string; marketIds?: string[] }; assignedUserId?: string; pipelineStageId?: string };

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

    // Get default lead status (Pipeline)
    const getDefaultLeadStatus = async () => {
      // Prefer the explicitly configured default in Settings > Lead Statuses
      const defaultStatus = await prisma.leadStatus.findFirst({
        where: { isDefault: true },
      });
      
      if (defaultStatus) {
        console.log(`Found default lead status: ${defaultStatus.name}`);
        return defaultStatus;
      }

      // Fallback: by name (expected: "Pipeline")
      const pipelineStatus = await prisma.leadStatus.findFirst({
        where: { name: { equals: 'Pipeline', mode: 'insensitive' as any } },
      });

      if (pipelineStatus) {
        console.log(`Found default lead status by name: ${pipelineStatus.name}`);
        return pipelineStatus;
      }

      console.warn('No default LeadStatus found (isDefault or name=Pipeline). Lead will be created without LeadStatus.');
      return null;
    };

    if (input.type === 'SELLER') {
      const { address, seller, marketId, assignedUserId, leadSourceId } = input;
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
      
      // Get default lead status
      const defaultStatus = await getDefaultLeadStatus();
      
      return prisma.lead.create({
        data: {
          leadType: 'SELLER',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId,
          leadStatusId: defaultStatus?.id || null,
          leadSourceId: leadSourceId || null,
          stageEnteredAt: new Date(),
          createdById: createdById || null,
          address: { create: address },
          seller: { create: seller },
          // Auto-create primary owner from seller details
          owners: {
            create: {
              firstName: seller.firstName,
              lastName: seller.lastName,
              phone: seller.phone,
              email: seller.email,
              isPrimary: true,
              order: 0,
            }
          },
        },
        include: includeLead,
      });
    }
    if (input.type === 'BUYER') {
      const { buyer, criteria, marketId, assignedUserId, leadSourceId } = input;
      let { pipelineStageId } = input;
      
      console.log('📥 Creating BUYER lead with criteria:', JSON.stringify(criteria, null, 2));
      
      // If no pipelineStageId provided, get default stage
      if (!pipelineStageId) {
        const defaultStage = await getDefaultPipelineStage('BUYER');
        pipelineStageId = defaultStage.id;
        console.log(`Auto-assigned default stage: ${defaultStage.name} for BUYER lead`);
      } else {
        // Validate provided pipeline stage exists
        await validatePipelineStage(pipelineStageId);
      }
      
      // Get default lead status
      const defaultStatus = await getDefaultLeadStatus();
      
      const lead = await prisma.lead.create({
        data: {
          leadType: 'BUYER',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId,
          leadStatusId: defaultStatus?.id || null,
          leadSourceId: leadSourceId || null,
          stageEnteredAt: new Date(),
          createdById: createdById || null,
          buyer: { create: buyer },
          ...(criteria ? { buyerCriteria: { create: criteria } } : {}),
          // Auto-create primary owner from buyer details
          owners: {
            create: {
              firstName: buyer.firstName,
              lastName: buyer.lastName,
              phone: buyer.phone,
              email: buyer.email,
              isPrimary: true,
              order: 0,
            }
          },
        },
        include: includeLead,
      });
      
      console.log('✅ Created BUYER lead with buyerCriteria:', lead.buyerCriteria);
      return lead;
    }
    if (input.type === 'VENDOR') {
      const { vendor, marketId, assignedUserId, leadSourceId } = input;
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
      
      // Get default lead status
      const defaultStatus = await getDefaultLeadStatus();
      
      return prisma.lead.create({
        data: {
          leadType: 'VENDOR',
          marketId: marketId || null,
          assignedUserId: assignedUserId || null,
          pipelineStageId: pipelineStageId,
          leadStatusId: defaultStatus?.id || null,
          leadSourceId: leadSourceId || null,
          stageEnteredAt: new Date(),
          createdById: createdById || null,
          vendor: { create: vendor },
          // Auto-create primary owner from vendor details
          owners: {
            create: {
              firstName: vendor.firstName,
              lastName: vendor.lastName,
              phone: vendor.phone,
              email: vendor.email,
              isPrimary: true,
              order: 0,
            }
          },
        },
        include: includeLead,
      });
    }
  },

  async update(id: string, data: any) {
    // Transform nested relations for proper Prisma update syntax
    const updateData: any = { ...data };
    
    // Handle seller relation - use upsert to create if doesn't exist
    if (data.seller) {
      updateData.seller = { 
        upsert: {
          create: data.seller,
          update: data.seller
        }
      };
    }
    
    // Handle buyer relation - use upsert to create if doesn't exist
    if (data.buyer) {
      updateData.buyer = { 
        upsert: {
          create: data.buyer,
          update: data.buyer
        }
      };
    }
    
    // Handle vendor relation - use upsert to create if doesn't exist
    if (data.vendor) {
      // Normalize vendor payload (some older clients use companyName/serviceType)
      const v = data.vendor || {};
      const normalizedVendor = {
        firstName: v.firstName || '',
        lastName: v.lastName || '',
        phone: v.phone || '',
        email: v.email || '',
        company: v.company || v.companyName || 'Unknown',
        industry: v.industry || v.serviceType || 'Unknown',
        marketIds: Array.isArray(v.marketIds) ? v.marketIds : [],
      };
      updateData.vendor = { 
        upsert: {
          create: normalizedVendor,
          update: normalizedVendor
        }
      };
    }
    
    // Handle address relation - use upsert to create if doesn't exist
    if (data.address) {
      // Map zipCode to zip for database compatibility
      const addressData: any = {
        address1: data.address.address1 || '',
        city: data.address.city || '',
        state: data.address.state || '',
        zip: data.address.zipCode || data.address.zip || ''
      };
      
      // Include county if provided
      if (data.address.countyId) {
        addressData.countyId = data.address.countyId;
      }
      
      updateData.address = { 
        upsert: {
          create: addressData,
          update: addressData
        }
      };
    }
    
    // Handle buyer criteria relation - use upsert to create if doesn't exist
    if (data.buyerCriteria) {
      updateData.buyerCriteria = { 
        upsert: {
          create: data.buyerCriteria,
          update: data.buyerCriteria
        }
      };
    }
    
    return prisma.lead.update({ where: { id }, data: updateData, include: includeLead });
  },

  async findById(id: string) {
    return prisma.lead.findUnique({ where: { id }, include: includeLead });
  },

  async list(params: {
    type?: LeadType;
    marketId?: string;
    pipelineStageId?: string;
    status?: string;
    leadStatusId?: string;
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
    const { type, marketId, pipelineStageId, status, leadStatusId, countyId, createdFrom, createdTo, updatedFrom, updatedTo, tasksDueBefore, priceRangeIds, assetClassIds, vipBuyer, blacklistedBuyer, vendorCompany, vendorIndustry, q, sort = 'updatedAt', order = 'desc', skip = 0, take = 20, userRoles = [], userId } = params;

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
    if (leadStatusId) where.leadStatusId = leadStatusId;
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
      // Simple ilike search across common fields including email and phone
      where.OR = [
        { address: { address1: { contains: q, mode: 'insensitive' } } },
        { seller: { firstName: { contains: q, mode: 'insensitive' } } },
        { seller: { lastName: { contains: q, mode: 'insensitive' } } },
        { seller: { email: { contains: q, mode: 'insensitive' } } },
        { seller: { phone: { contains: q, mode: 'insensitive' } } },
        { buyer: { firstName: { contains: q, mode: 'insensitive' } } },
        { buyer: { lastName: { contains: q, mode: 'insensitive' } } },
        { buyer: { email: { contains: q, mode: 'insensitive' } } },
        { buyer: { phone: { contains: q, mode: 'insensitive' } } },
        { vendor: { firstName: { contains: q, mode: 'insensitive' } } },
        { vendor: { lastName: { contains: q, mode: 'insensitive' } } },
        { vendor: { email: { contains: q, mode: 'insensitive' } } },
        { vendor: { phone: { contains: q, mode: 'insensitive' } } },
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
    // Strip non-digits from query for phone number matching
    const digitsOnly = q.replace(/\D/g, '');
    // Consider it a phone query if it has 3+ digits (even if mixed with other chars)
    const isPhoneQuery = digitsOnly.length >= 3;
    
    console.log('🔍 Search suggestions:', { q, digitsOnly, isPhoneQuery, queryLength: q.length });
    
    // For phone queries, fetch MORE results to filter in-memory
    // This handles cases where phone formatting breaks database CONTAINS matching
    const fetchLimit = isPhoneQuery ? 100 : take;
    
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { address: { address1: { contains: q, mode: 'insensitive' } } },
          { seller: { firstName: { contains: q, mode: 'insensitive' } } },
          { seller: { lastName: { contains: q, mode: 'insensitive' } } },
          { seller: { email: { contains: q, mode: 'insensitive' } } },
          { seller: { phone: { contains: q, mode: 'insensitive' } } },
          // Add digit-only phone search for better matching
          ...(digitsOnly.length >= 3 ? [
            { seller: { phone: { contains: digitsOnly, mode: 'insensitive' } } },
          ] : []),
          { buyer: { firstName: { contains: q, mode: 'insensitive' } } },
          { buyer: { lastName: { contains: q, mode: 'insensitive' } } },
          { buyer: { email: { contains: q, mode: 'insensitive' } } },
          { buyer: { phone: { contains: q, mode: 'insensitive' } } },
          // Add digit-only phone search for better matching
          ...(digitsOnly.length >= 3 ? [
            { buyer: { phone: { contains: digitsOnly, mode: 'insensitive' } } },
          ] : []),
          { vendor: { firstName: { contains: q, mode: 'insensitive' } } },
          { vendor: { lastName: { contains: q, mode: 'insensitive' } } },
          { vendor: { email: { contains: q, mode: 'insensitive' } } },
          { vendor: { phone: { contains: q, mode: 'insensitive' } } },
          // Add digit-only phone search for better matching
          ...(digitsOnly.length >= 3 ? [
            { vendor: { phone: { contains: digitsOnly, mode: 'insensitive' } } },
          ] : []),
          // Search in lead owners
          { owners: { some: { firstName: { contains: q, mode: 'insensitive' } } } },
          { owners: { some: { lastName: { contains: q, mode: 'insensitive' } } } },
          { owners: { some: { email: { contains: q, mode: 'insensitive' } } } },
          { owners: { some: { phone: { contains: q, mode: 'insensitive' } } } },
          // Add digit-only phone search for lead owners
          ...(digitsOnly.length >= 3 ? [
            { owners: { some: { phone: { contains: digitsOnly, mode: 'insensitive' } } } },
          ] : []),
        ],
      },
      include: { address: true, seller: true, buyer: true, vendor: true, owners: true },
      take: fetchLimit,
    });
    
    console.log('📦 Database results:', leads.length, 'leads found');
    
    // If no results from database but it's a phone query, try fetching ALL leads to filter
    if (leads.length === 0 && isPhoneQuery && digitsOnly.length >= 3) {
      console.log('⚠️ No database results, fetching all leads for in-memory filtering...');
      const allLeads = await prisma.lead.findMany({
        include: { address: true, seller: true, buyer: true, vendor: true, owners: true },
        take: 100,
      });
      console.log('📦 Fetched', allLeads.length, 'leads for filtering');
      leads.push(...allLeads);
    }
    
    if (leads.length > 0 && leads[0].owners) {
      console.log('📱 First lead owners:', leads[0].owners.map(o => ({ name: `${o.firstName} ${o.lastName}`, phone: o.phone })));
    }
    
    // For phone queries, ALWAYS do in-memory filtering to handle formatted phone numbers
    // This ensures we match even when formatting breaks database CONTAINS
    let filteredLeads = leads;
    if (isPhoneQuery && digitsOnly.length >= 3) {
      console.log('🔢 Filtering by digits only:', digitsOnly);
      
      filteredLeads = leads.filter((l) => {
        const phoneNumbers = [
          l.seller?.phone,
          l.buyer?.phone,
          l.vendor?.phone,
          ...(l.owners || []).map(o => o.phone),
        ].filter(Boolean);
        
        // Check if any phone number contains the digits (ignoring formatting)
        const hasMatch = phoneNumbers.some((phone) => {
          const phoneDigits = phone?.replace(/\D/g, '') || '';
          const matches = phoneDigits.includes(digitsOnly);
          if (matches) {
            console.log('✅ Match found:', { phone, phoneDigits, searchDigits: digitsOnly });
          }
          return matches;
        });
        
        return hasMatch;
      });
      
      console.log('🎯 After digit filtering:', filteredLeads.length, 'leads matched');
    }
    
    // Limit results to requested take amount
    const finalLeads = filteredLeads.slice(0, take);
    
    console.log('✅ Final results:', finalLeads.length, 'leads after filtering');
    
    return finalLeads.map((l) => {
      let name = '';
      let subtitle = '';
      let phone = '';
      
      if (l.leadType === 'SELLER' && l.seller) {
        name = `${l.seller.firstName} ${l.seller.lastName}`;
        subtitle = l.address ? `${l.address.address1}, ${l.address.city}, ${l.address.state}` : 'No address';
        phone = l.seller.phone;
      } else if (l.leadType === 'BUYER' && l.buyer) {
        name = `${l.buyer.firstName} ${l.buyer.lastName}`;
        subtitle = 'Buyer Lead';
        phone = l.buyer.phone;
      } else if (l.leadType === 'VENDOR' && l.vendor) {
        name = `${l.vendor.firstName} ${l.vendor.lastName}`;
        subtitle = l.vendor.company || 'Vendor Lead';
        phone = l.vendor.phone;
      }
      
      return {
        id: l.id,
        type: l.leadType,
        name,
        subtitle,
        phone,
      };
    });
  },

  async delete(id: string) {
    // Delete the lead (cascading deletes will handle related records)
    await prisma.lead.delete({
      where: { id },
    });
  },
};

const includeLead = {
  address: true,
  seller: true,
  buyer: true,
  buyerCriteria: true,
  vendor: true,
  pipelineStage: true,
  leadStatus: true,
  leadSource: true,
  owners: true,
  assignedUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  },
};

