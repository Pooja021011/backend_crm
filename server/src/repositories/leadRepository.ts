import { prisma } from '../config/db.js';
import type { LeadType, TaskStatus } from '@prisma/client';
import { notificationService } from '../services/notificationService.js';

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
      
      const lead = await prisma.lead.create({
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
      
      // Create notifications after lead creation (non-blocking)
      try {
        const leadAddress = lead.address?.address1 || 'Unknown address';
        
        // Notify MANAGER for ANY new lead
        const managerNotification = await notificationService.createNotification({
          type: 'NEW_LEAD',
          title: 'New Lead',
          message: leadAddress,
          priority: 'MEDIUM',
          targetRoles: ['MANAGER'],
          leadId: lead.id,
          triggeredBy: createdById || undefined,
          data: {
            address: leadAddress,
            leadType: 'SELLER'
          }
        });
        console.log(`[New Lead Notification] Created MANAGER notification: ${managerNotification.id}, targetRoles: ${JSON.stringify(['MANAGER'])}, leadId: ${lead.id}, address: ${leadAddress}`);
        
        // Notify ACQ agent if lead is assigned and user doesn't have ADMIN/MANAGER role
        if (assignedUserId) {
          const assignedUser = await prisma.user.findUnique({
            where: { id: assignedUserId },
            include: {
              roles: {
                include: {
                  role: {
                    select: { name: true }
                  }
                }
              }
            }
          });
          
          if (assignedUser) {
            const userRoles = assignedUser.roles.map((ur: any) => ur.role?.name || ur.name).filter(Boolean);
            const hasAdmin = userRoles.includes('ADMIN');
            const hasManager = userRoles.includes('MANAGER');
            
            // Only notify ACQ if user doesn't have ADMIN or MANAGER role
            if (!hasAdmin && !hasManager && userRoles.includes('ACQ')) {
              await notificationService.createNotification({
                type: 'NEW_LEAD',
                title: 'New Lead in Your Pipeline',
                message: leadAddress,
                priority: 'MEDIUM',
                targetUserId: assignedUserId,
                leadId: lead.id,
                triggeredBy: createdById || undefined,
                data: {
                  address: leadAddress,
                  leadType: 'SELLER'
                }
              });
            }
          }
        }
      } catch (error) {
        // Non-blocking: log error but don't break lead creation
        console.error('Error creating notifications for new lead:', error);
      }
      
      return lead;
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
      
      // Create notifications after lead creation (non-blocking)
      try {
        const leadAddress = lead.address?.address1 || 'New buyer lead';
        const buyerName = lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : 'Unknown buyer';
        
        // Notify MANAGER for ANY new lead
        await notificationService.createNotification({
          type: 'NEW_LEAD',
          title: 'New Lead',
          message: `${buyerName} - ${leadAddress}`,
          priority: 'MEDIUM',
          targetRoles: ['MANAGER'],
          leadId: lead.id,
          triggeredBy: createdById || undefined,
          data: {
            address: leadAddress,
            leadType: 'BUYER',
            buyerName: buyerName
          }
        });
      } catch (error) {
        // Non-blocking: log error but don't break lead creation
        console.error('Error creating notifications for new lead:', error);
      }
      
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
      
      const lead = await prisma.lead.create({
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
      
      // Create notifications after lead creation (non-blocking)
      try {
        const vendorName = lead.vendor ? `${lead.vendor.firstName} ${lead.vendor.lastName}` : 'Unknown vendor';
        const vendorCompany = (lead.vendor as any)?.company || '';
        const leadAddress = lead.address?.address1 || vendorCompany || 'Unknown address';
        
        // Notify MANAGER for ANY new lead
        await notificationService.createNotification({
          type: 'NEW_LEAD',
          title: 'New Lead',
          message: `${vendorName}${vendorCompany ? ` - ${vendorCompany}` : ''} - ${leadAddress}`,
          priority: 'MEDIUM',
          targetRoles: ['MANAGER'],
          leadId: lead.id,
          triggeredBy: createdById || undefined,
          data: {
            address: leadAddress,
            leadType: 'VENDOR',
            vendorName: vendorName
          }
        });
        
        // Notify ACQ agent if lead is assigned and user doesn't have ADMIN/MANAGER role
        if (assignedUserId) {
          const assignedUser = await prisma.user.findUnique({
            where: { id: assignedUserId },
            include: {
              roles: {
                include: {
                  role: {
                    select: { name: true }
                  }
                }
              }
            }
          });
          
          if (assignedUser) {
            const userRoles = assignedUser.roles.map((ur: any) => ur.role?.name || ur.name).filter(Boolean);
            const hasAdmin = userRoles.includes('ADMIN');
            const hasManager = userRoles.includes('MANAGER');
            
            // Only notify ACQ if user doesn't have ADMIN or MANAGER role
            if (!hasAdmin && !hasManager && userRoles.includes('ACQ')) {
              await notificationService.createNotification({
                type: 'NEW_LEAD',
                title: 'New Lead in Your Pipeline',
                message: leadAddress,
                priority: 'MEDIUM',
                targetUserId: assignedUserId,
                leadId: lead.id,
                triggeredBy: createdById || undefined,
                data: {
                  address: leadAddress,
                  leadType: 'VENDOR'
                }
              });
            }
          }
        }
      } catch (error) {
        // Non-blocking: log error but don't break lead creation
        console.error('Error creating notifications for new lead:', error);
      }
      
      return lead;
    }
  },

  async update(id: string, data: any) {
    // Transform nested relations for proper Prisma update syntax
    const updateData: any = { ...data };

    // Defensive sanitization:
    // - Some clients/autosave flows may send empty strings for IDs or nested objects during hydration.
    // - Treat empty-string IDs as "not provided" (do not update) to prevent wiping relations unintentionally.
    // - Treat completely blank contact payloads as "not provided" to prevent clobbering seller/buyer/vendor.
    const isBlank = (v: any) => v === '' || v === undefined;
    const isAllBlank = (obj: any, keys: string[]) =>
      !obj || keys.every((k) => isBlank(obj[k]));

    // Normalize common ID fields: '' -> undefined (ignore update)
    for (const key of [
      'assignedUserId',
      // Back-compat: some clients still send dispositionAgentId (old name)
      'dispositionAgentId',
      // Canonical field in schema
      'dispAgentId',
      'marketId',
      'pipelineStageId',
      'leadStatusId',
      'leadSourceId',
      'createdById',
    ]) {
      if (updateData[key] === '') {
        delete updateData[key];
      }
    }

    // Back-compat mapping: dispositionAgentId -> dispAgentId
    if (updateData.dispositionAgentId !== undefined && updateData.dispAgentId === undefined) {
      updateData.dispAgentId = updateData.dispositionAgentId;
      delete updateData.dispositionAgentId;
    }
    // Nested relation IDs
    if (updateData.address?.countyId === '') delete updateData.address.countyId;
    
    // Get the current lead to determine its type
    const currentLead = await prisma.lead.findUnique({
      where: { id },
      include: {
        owners: {
          where: { isPrimary: true },
          take: 1
        }
      }
    });
    
    if (!currentLead) {
      throw new Error('Lead not found');
    }

    // CRITICAL: Merge customFields instead of replacing them
    // This prevents data loss when frontend sends partial updates
    if (updateData.customFields) {
      const existingCustomFields = (currentLead.customFields as any) || {};
      updateData.customFields = {
        ...existingCustomFields,
        ...updateData.customFields
      };
    }

    // BUSINESS RULE:
    // If Lead Status is changed to "Dead", remove pipeline status entirely.
    // This ensures Dead leads do not appear in Pipeline columns.
    if (data.leadStatusId) {
      const status = await prisma.leadStatus.findUnique({
        where: { id: data.leadStatusId },
        select: { name: true },
      });

      // BUSINESS RULE:
      // Lead Status "Follow Up" requires at least one real Task (notes do NOT count).
      // Requirement: any task (OPEN or DONE) is acceptable, but exclude auto-generated mention tasks.
      if (status?.name?.toLowerCase() === 'follow up') {
        const taskCount = await prisma.task.count({
          where: {
            leadId: id,
            NOT: { title: { startsWith: 'Review note on ' } },
          },
        });

        if (taskCount <= 0) {
          const err: any = new Error('Please add a task to follow up before setting Lead Status to Follow Up.');
          err.status = 400;
          err.code = 'VALIDATION_REQUIRED';
          err.requiredFields = ['followUpTask'];
          throw err;
        }
      }

      if (status?.name?.toLowerCase() === 'dead') {
        updateData.pipelineStageId = null;
        updateData.stageEnteredAt = null;
      }
    }
    
    // Handle seller relation - use upsert to create if doesn't exist
    if (data.seller && !isAllBlank(data.seller, ['firstName', 'lastName', 'phone', 'email', 'motivation', 'notes'])) {
      updateData.seller = { 
        upsert: {
          create: data.seller,
          update: data.seller
        }
      };
      
      // Sync seller contact info to primary lead owner
      if (currentLead.leadType === 'SELLER' && (data.seller.phone || data.seller.email || data.seller.firstName || data.seller.lastName)) {
        const primaryOwner = currentLead.owners[0];
        if (primaryOwner) {
          // Update existing primary owner
          await prisma.leadOwner.update({
            where: { id: primaryOwner.id },
            data: {
              firstName: data.seller.firstName || primaryOwner.firstName,
              lastName: data.seller.lastName || primaryOwner.lastName,
              phone: data.seller.phone || primaryOwner.phone,
              email: data.seller.email || primaryOwner.email,
            }
          });
        }
      }
    }
    
    // Handle buyer relation - use upsert to create if doesn't exist
    if (data.buyer && !isAllBlank(data.buyer, ['firstName', 'lastName', 'phone', 'email', 'vip', 'blacklisted', 'propertiesPurchased', 'creditScore', 'preApproved', 'motivation', 'timeline'])) {
      updateData.buyer = { 
        upsert: {
          create: data.buyer,
          update: data.buyer
        }
      };
      
      // Sync buyer contact info to primary lead owner
      if (currentLead.leadType === 'BUYER' && (data.buyer.phone || data.buyer.email || data.buyer.firstName || data.buyer.lastName)) {
        const primaryOwner = currentLead.owners[0];
        if (primaryOwner) {
          // Update existing primary owner
          await prisma.leadOwner.update({
            where: { id: primaryOwner.id },
            data: {
              firstName: data.buyer.firstName || primaryOwner.firstName,
              lastName: data.buyer.lastName || primaryOwner.lastName,
              phone: data.buyer.phone || primaryOwner.phone,
              email: data.buyer.email || primaryOwner.email,
            }
          });
        }
      }
    }
    
    // Handle vendor relation - use upsert to create if doesn't exist
    if (data.vendor && !isAllBlank(data.vendor, ['firstName', 'lastName', 'phone', 'email', 'company', 'companyName', 'industry', 'serviceType'])) {
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
      
      // Sync vendor contact info to primary lead owner
      if (currentLead.leadType === 'VENDOR' && (v.phone || v.email || v.firstName || v.lastName)) {
        const primaryOwner = currentLead.owners[0];
        if (primaryOwner) {
          // Update existing primary owner
          await prisma.leadOwner.update({
            where: { id: primaryOwner.id },
            data: {
              firstName: v.firstName || primaryOwner.firstName,
              lastName: v.lastName || primaryOwner.lastName,
              phone: v.phone || primaryOwner.phone,
              email: v.email || primaryOwner.email,
            }
          });
        }
      }
    }
    
    // Handle address relation - use upsert to create if doesn't exist
    if (data.address && !isAllBlank(data.address, ['address1', 'city', 'state', 'zipCode', 'zip', 'countyId'])) {
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
    if (data.buyerCriteria && !isAllBlank(data.buyerCriteria, ['marketIds', 'assetClassIds', 'priceRangeIds'])) {
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
    marketIds?: string[];
    pipelineStageId?: string;
    pipelineStageIds?: string[];
    status?: string;
    leadStatusId?: string;
    leadStatusIds?: string[];
    assignedUserId?: string;
    assignedUserIds?: string[];
    leadSourceId?: string;
    leadSourceIds?: string[];
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
    const { type, marketId, marketIds, pipelineStageId, pipelineStageIds, status, leadStatusId, leadStatusIds, assignedUserId, assignedUserIds, leadSourceId, leadSourceIds, countyId, createdFrom, createdTo, updatedFrom, updatedTo, tasksDueBefore, priceRangeIds, assetClassIds, vipBuyer, blacklistedBuyer, vendorCompany, vendorIndustry, q, sort = 'createdAt', order = 'desc', skip = 0, take = 10000, userRoles = [], userId } = params;

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
    
    // Market filter: support both single and array
    if (marketIds && marketIds.length > 0) {
      where.marketId = { in: marketIds };
    } else if (marketId) {
      where.marketId = marketId;
    }
    
    // Pipeline stage filter: support both single and array
    if (pipelineStageIds && pipelineStageIds.length > 0) {
      where.pipelineStageId = { in: pipelineStageIds };
    } else if (pipelineStageId) {
      where.pipelineStageId = pipelineStageId;
    }
    
    if (status) where.status = status;
    
    // Lead status filter: support both single and array
    if (leadStatusIds && leadStatusIds.length > 0) {
      where.leadStatusId = { in: leadStatusIds };
    } else if (leadStatusId) {
      where.leadStatusId = leadStatusId;
    }
    
    // Assigned user filter: support both single and array
    if (assignedUserIds && assignedUserIds.length > 0) {
      where.assignedUserId = { in: assignedUserIds };
    } else if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }
    
    // Lead source filter: support both single and array
    if (leadSourceIds && leadSourceIds.length > 0) {
      where.leadSourceId = { in: leadSourceIds };
    } else if (leadSourceId) {
      where.leadSourceId = leadSourceId;
    }
    
    /**
     * Normalize date string to YYYY-MM-DD format for consistent parsing
     */
    const normalizeDateString = (dateStr: string | null | undefined): string | null => {
      if (!dateStr || !dateStr.trim()) return null;
      
      const trimmed = dateStr.trim();
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-').map(Number);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
          return trimmed;
        }
      }
      
      const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
          const normalizedMonth = monthNum.toString().padStart(2, '0');
          const normalizedDay = dayNum.toString().padStart(2, '0');
          return `${yearNum}-${normalizedMonth}-${normalizedDay}`;
        }
      }
      
      const yyyymmddMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
      if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch;
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
          const normalizedMonth = monthNum.toString().padStart(2, '0');
          const normalizedDay = dayNum.toString().padStart(2, '0');
          return `${yearNum}-${normalizedMonth}-${normalizedDay}`;
        }
      }
      
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
        const day = parsedDate.getDate().toString().padStart(2, '0');
        
        if (year >= 1900 && year <= 2100) {
          return `${year}-${month}-${day}`;
        }
      }
      
      return null;
    };
    
    if (createdFrom || createdTo) {
      const normalizedFrom = createdFrom ? normalizeDateString(createdFrom) : null;
      const normalizedTo = createdTo ? normalizeDateString(createdTo) : null;
      where.createdAt = { 
        ...(normalizedFrom ? { gte: new Date(`${normalizedFrom}T00:00:00.000Z`) } : {}), 
        ...(normalizedTo ? { lte: new Date(`${normalizedTo}T23:59:59.999Z`) } : {}) 
      };
    }
    if (updatedFrom || updatedTo) {
      const normalizedFrom = updatedFrom ? normalizeDateString(updatedFrom) : null;
      const normalizedTo = updatedTo ? normalizeDateString(updatedTo) : null;
      where.updatedAt = { 
        ...(normalizedFrom ? { gte: new Date(`${normalizedFrom}T00:00:00.000Z`) } : {}), 
        ...(normalizedTo ? { lte: new Date(`${normalizedTo}T23:59:59.999Z`) } : {}) 
      };
    }
    if (countyId) where.address = { countyId };
    if (tasksDueBefore) {
      const normalized = normalizeDateString(tasksDueBefore);
      if (normalized) {
        where.tasks = { some: { status: 'OPEN', dueAt: { lte: new Date(`${normalized}T23:59:59.999Z`) } } };
      }
    }
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

    // Debug: Log the final where clause, especially leadStatusId filter
    if (leadStatusIds || leadStatusId) {
      console.log('🔍 Repository - Final where clause leadStatusId:', JSON.stringify(where.leadStatusId, null, 2));
      console.log('🔍 Repository - Full where clause:', JSON.stringify(where, null, 2));
    }

    return prisma.lead.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take: Math.min(take, 10000), // Increased to 10000 to support larger lead lists and accurate counts
      include: includeLead,
    });
  },

  async changeStage(leadId: string, toStageId: string, changedById?: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return null;
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStageId: toStageId,
        // Keep stageEnteredAt consistent across ALL stage moves (manual + automated)
        stageEnteredAt: new Date(),
        updatedAt: new Date(),
      },
      include: includeLead,
    });
    await prisma.stageHistory.create({
      data: {
        leadId,
        fromStageId: lead.pipelineStageId,
        toStageId,
        changedById: changedById || null,
        changedAt: new Date(),
      },
    });
    return updated;
  },

  async suggestions(q: string, take = 10) {
    // Strip non-digits from query for phone number matching
    const digitsOnly = q.replace(/\D/g, '');
    // Consider it a phone query if it has 3+ digits (even if mixed with other chars)
    const isPhoneQuery = digitsOnly.length >= 3;
    
    console.log('🔍 Search suggestions:', { q, digitsOnly, isPhoneQuery, queryLength: q.length });
    
    // For phone queries we can't reliably use DB `contains` because formatting breaks substring matching
    // (ex: "(333) 332-3232" won't match "3333"). So we gather candidates and filter in-memory.
    const leads: any[] = [];

    if (isPhoneQuery) {
      // 1) Address matches (keep normal DB contains for address numbers)
      const addressMatches = await prisma.lead.findMany({
        where: {
          address: { address1: { contains: q, mode: 'insensitive' } },
        },
        include: { address: true, seller: true, buyer: true, vendor: true, owners: true },
        take: 50,
      });

      // 2) Phone candidates (broad) - then digit-filter in-memory
      const phoneCandidates = await prisma.lead.findMany({
        where: {
          OR: [
            // Phone fields are non-nullable strings in our schema; the right filter is relation existence.
            // We'll digit-filter in-memory, so we just need a reasonable candidate set.
            { seller: { isNot: null } },
            { buyer: { isNot: null } },
            { vendor: { isNot: null } },
            { owners: { some: {} } },
          ],
        },
        include: { address: true, seller: true, buyer: true, vendor: true, owners: true },
        take: 200,
      });

      // Merge unique by id
      const byId = new Map<string, any>();
      for (const l of addressMatches) byId.set(l.id, l);
      for (const l of phoneCandidates) byId.set(l.id, l);
      leads.push(...byId.values());
    } else {
      // Non-phone queries: use DB contains across searchable fields
      const fetchLimit = take;
      const dbLeads = await prisma.lead.findMany({
        where: {
          OR: [
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
            // Search in lead owners
            { owners: { some: { firstName: { contains: q, mode: 'insensitive' } } } },
            { owners: { some: { lastName: { contains: q, mode: 'insensitive' } } } },
            { owners: { some: { email: { contains: q, mode: 'insensitive' } } } },
            { owners: { some: { phone: { contains: q, mode: 'insensitive' } } } },
          ],
        },
        include: { address: true, seller: true, buyer: true, vendor: true, owners: true },
        take: fetchLimit,
      });
      leads.push(...dbLeads);
    }
    
    console.log('📦 Database results:', leads.length, 'leads found');
    
    // NOTE: phone queries are already handled via broad candidates above (no need for "fetch all" fallback).
    
    if (leads.length > 0 && leads[0].owners) {
      console.log('📱 First lead owners:', leads[0].owners.map(o => ({ name: `${o.firstName} ${o.lastName}`, phone: o.phone })));
    }
    
    // For phone queries, ALWAYS do in-memory filtering to handle formatted phone numbers
    // This ensures we match even when formatting breaks database CONTAINS
    let filteredLeads = leads;
    if (isPhoneQuery && digitsOnly.length >= 3) {
      console.log('🔢 Filtering by digits only:', digitsOnly);
      
      const phoneMatched = leads.filter((l) => {
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

      // IMPORTANT: When the query contains digits (ex: "123 Main St112") we still want address matches,
      // even if the digits don't match a phone number. Otherwise address searches that include numbers break.
      const qLower = q.toLowerCase();
      const addressMatched = leads.filter((l) => {
        const a1 = l.address?.address1;
        return typeof a1 === 'string' && a1.toLowerCase().includes(qLower);
      });

      const byId = new Map<string, any>();
      for (const l of addressMatched) byId.set(l.id, l);
      for (const l of phoneMatched) byId.set(l.id, l);
      filteredLeads = [...byId.values()];
      
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

