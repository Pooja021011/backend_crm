import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { stageTransitionService } from './stageTransitionService.js';

export interface PipelineLeadFilters {
  needsAttention?: boolean;
  assignedUserId?: string;
  leadSourceId?: string;
  userRole?: string;
  userId?: string;
}

export interface PipelineAccess {
  canViewFull: boolean;
  canViewAssignedOnly: boolean;
  canViewTeam?: boolean;
  allowedPipelines: string[];
  availableToggles: string[];
  readOnlyPipelines?: string[];
}

export const pipelineService = {
  // LeadStatus values that should not appear in Pipeline view
  hiddenPipelineLeadStatuses: ['Long Term Follow Up', 'Dead'] as const,

  async getVisibleLeadCountsByStage(stageIds: string[]) {
    if (!stageIds.length) return new Map<string, number>();
    const hidden = [...this.hiddenPipelineLeadStatuses];

    const grouped = await prisma.lead.groupBy({
      by: ['pipelineStageId'],
      where: {
        pipelineStageId: { in: stageIds },
        NOT: {
          leadStatus: { name: { in: hidden } },
        },
      },
      _count: { _all: true },
    });

    const map = new Map<string, number>();
    for (const row of grouped) {
      if (row.pipelineStageId) map.set(row.pipelineStageId, row._count._all);
    }
    return map;
  },

  /**
   * Determine pipeline access based on user role
   */
  getPipelineAccess(userRoles: string[]): PipelineAccess {
    const hasRole = (role: string) => userRoles.includes(role);
    
    // Admin: Full company pipeline access
    if (hasRole('ADMIN')) {
      return {
        canViewFull: true,
        canViewAssignedOnly: false,
        canViewTeam: false,
        allowedPipelines: ['ACQUISITIONS', 'DISPOSITIONS', 'TRANSACTION'],
        availableToggles: ['TRANSACTION_PIPELINE', 'NEEDS_ATTENTION']
      };
    }
    
    // Executive: Company-wide view
    if (hasRole('EXECUTIVE')) {
      return {
        canViewFull: true,
        canViewAssignedOnly: false,
        canViewTeam: false,
        allowedPipelines: ['ACQUISITIONS', 'DISPOSITIONS', 'TRANSACTION'],
        availableToggles: ['TRANSACTION_PIPELINE', 'NEEDS_ATTENTION']
      };
    }
    
    // Manager: Team/company view
    if (hasRole('MANAGER')) {
      return {
        canViewFull: true,
        canViewAssignedOnly: false,
        canViewTeam: true,
        allowedPipelines: ['ACQUISITIONS', 'DISPOSITIONS', 'TRANSACTION'],
        availableToggles: ['TRANSACTION_PIPELINE', 'NEEDS_ATTENTION']
      };
    }
    
    // Acquisitions Agent: Only their assigned seller leads, source dropdown
    if (hasRole('ACQ')) {
      return {
        canViewFull: false,
        canViewAssignedOnly: true,
        canViewTeam: false,
        allowedPipelines: ['ACQUISITIONS'],
        availableToggles: ['SOURCE_DROPDOWN', 'NEEDS_ATTENTION']
      };
    }
    
    // Dispositions Agent: Only their assigned leads, needs attention only
    if (hasRole('DISP')) {
      return {
        canViewFull: false,
        canViewAssignedOnly: true,
        canViewTeam: false,
        allowedPipelines: ['DISPOSITIONS'],
        availableToggles: ['NEEDS_ATTENTION'] // Only needs attention toggle
      };
    }
    
    // Transaction Coordinator: Full transaction pipeline + read-only dispositions
    if (hasRole('TC')) {
      return {
        canViewFull: true,
        canViewAssignedOnly: false,
        canViewTeam: false,
        allowedPipelines: ['TRANSACTION', 'DISPOSITIONS'],
        availableToggles: ['DISPOSITIONS_TOGGLE', 'NEEDS_ATTENTION'],
        readOnlyPipelines: ['DISPOSITIONS'] // Can view but not edit dispositions
      };
    }
    
    return {
      canViewFull: false,
      canViewAssignedOnly: true,
      canViewTeam: false,
      allowedPipelines: [],
      availableToggles: []
    };
  },

  /**
   * Check if lead needs attention based on role and criteria
   */
  async checkNeedsAttention(leadId: string, userRoles: string[]): Promise<{ needsAttention: boolean; reason?: string }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        pipelineStage: true,
        tasks: {
          where: { status: 'OPEN' },
          orderBy: { dueAt: 'asc' }
        },
        communications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        deal: true
      }
    });

    if (!lead) return { needsAttention: false };

    const now = new Date();
    const hoursInCurrentStage = lead.stageEnteredAt ? 
      (now.getTime() - lead.stageEnteredAt.getTime()) / (1000 * 60 * 60) : 0;
    const hoursSinceLastUpdate = (now.getTime() - lead.updatedAt.getTime()) / (1000 * 60 * 60);
    const hoursSinceLastContact = lead.lastContactAt ? 
      (now.getTime() - lead.lastContactAt.getTime()) / (1000 * 60 * 60) : Infinity;

    // Role-specific attention logic
    if (userRoles.includes('ACQ')) {
      // Acquisitions Agent logic
      if (lead.leadType === 'SELLER') {
        // New lead without contact
        if (!lead.lastContactAt && hoursInCurrentStage > 2) {
          return { needsAttention: true, reason: 'New lead - no contact made' };
        }
        
        // Not updated in 48h without task
        if (hoursSinceLastUpdate > 48 && lead.tasks.length === 0) {
          return { needsAttention: true, reason: 'No update in 48h without active task' };
        }
        
        // Past due tasks
        const pastDueTasks = lead.tasks.filter(task => new Date(task.dueAt) < now);
        if (pastDueTasks.length > 0) {
          return { needsAttention: true, reason: `${pastDueTasks.length} past due task(s)` };
        }
        
        // Unanswered communications (last comm was inbound and > 4h ago)
        const lastComm = lead.communications[0];
        if (lastComm && lastComm.direction === 'INBOUND' && 
            (now.getTime() - lastComm.createdAt.getTime()) / (1000 * 60 * 60) > 4) {
          return { needsAttention: true, reason: 'Unanswered inbound communication' };
        }
      }
    }

    if (userRoles.includes('DISP')) {
      // Dispositions Agent logic
      if (lead.leadType === 'BUYER' || lead.leadType === 'SELLER') {
        // New deal assignment
        if (lead.deal && !lead.deal.contractedAt && hoursInCurrentStage < 2) {
          return { needsAttention: true, reason: 'New deal assigned' };
        }
        
        // Due diligence deadline approaching
        if (lead.deal?.contractedAt) {
          const daysSinceContract = (now.getTime() - lead.deal.contractedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceContract > 2 && !lead.deal.closedAt) { // Assuming 5-day due diligence period
            return { needsAttention: true, reason: 'Due diligence period ending soon' };
          }
        }
        
        // Similar 48h and task logic as ACQ
        if (hoursSinceLastUpdate > 48 && lead.tasks.length === 0) {
          return { needsAttention: true, reason: 'No update in 48h without active task' };
        }
      }
    }

    if (userRoles.includes('TC')) {
      // Transaction Coordinator logic
      if (!lead.lastContactAt && lead.pipelineStage?.name === 'New Lead') {
        return { needsAttention: true, reason: 'Uncontacted new lead' };
      }
      
      // Closing in 2 days
      if (lead.deal?.contractedAt) {
        const daysToClosing = lead.deal.closedAt ? 
          (lead.deal.closedAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;
        if (daysToClosing !== null && daysToClosing <= 2 && daysToClosing > 0) {
          return { needsAttention: true, reason: 'Closing in 2 days' };
        }
      }
    }

    if (userRoles.includes('MANAGER')) {
      // Manager logic - team leads needing attention
      const teamThresholds = {
        'ACQ': 54, // 54h for acquisitions
        'DISP': 42, // 42h for dispositions
        'TC': 42 // 42h for TC
      };
      
      // Check if assigned user's role matches thresholds
      // This would require additional user role lookup
      if (hoursSinceLastUpdate > 48) {
        return { needsAttention: true, reason: 'Team lead needs attention' };
      }
    }

    return { needsAttention: false };
  },

  /**
   * Update needs attention status for leads
   */
  async updateNeedsAttentionStatus(userRoles: string[], userId?: string): Promise<void> {
    try {
      // Get leads that need checking based on user access
      const access = this.getPipelineAccess(userRoles);
      const whereClause: any = {};
      
      if (!access.canViewFull && userId) {
        whereClause.assignedUserId = userId;
      }

      const leads = await prisma.lead.findMany({
        where: whereClause,
        select: { id: true }
      });

      // Check each lead and update status
      for (const lead of leads) {
        const { needsAttention, reason } = await this.checkNeedsAttention(lead.id, userRoles);
        
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            needsAttention,
            attentionReason: reason
          }
        });
      }
    } catch (error: any) {
      logger.error('Error updating needs attention status', { error: error.message });
      throw error;
    }
  },

  /**
   * Get all stages for a specific pipeline
   */
  async getPipelineStages(pipelineKey: string) {
    try {
      const pipeline = await prisma.pipelineDefinition.findUnique({
        where: { key: pipelineKey as any },
        include: {
          stages: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              name: true,
              orderIndex: true,
              color: true,
            }
          }
        }
      });

      if (!pipeline) {
        throw new Error(`Pipeline with key ${pipelineKey} not found`);
      }

      const counts = await this.getVisibleLeadCountsByStage(pipeline.stages.map(s => s.id));

      return pipeline.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        orderIndex: stage.orderIndex,
        color: stage.color || 'gray',
        leadCount: counts.get(stage.id) || 0
      }));
    } catch (error: any) {
      logger.error('Error getting pipeline stages', { pipelineKey, error: error.message });
      throw error;
    }
  },

  /**
   * Get pipeline stages filtered by user role permissions
   */
  async getPipelineStagesForUser(pipelineKey: string, userRoles: string[]) {
    try {
      const pipeline = await prisma.pipelineDefinition.findUnique({
        where: { key: pipelineKey as any },
        include: {
          stages: {
            orderBy: { orderIndex: 'asc' },
            include: {
              rolePermissions: true,
            }
          }
        }
      });

      if (!pipeline) {
        throw new Error(`Pipeline with key ${pipelineKey} not found`);
      }

      const counts = await this.getVisibleLeadCountsByStage(pipeline.stages.map(s => s.id));

      // ADMIN and MANAGER can see all stages
      if (userRoles.includes('ADMIN') || userRoles.includes('MANAGER')) {
        return pipeline.stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          orderIndex: stage.orderIndex,
          color: stage.color || 'gray',
          leadCount: counts.get(stage.id) || 0
        }));
      }

      // Filter stages based on role permissions
      const allowedStages = pipeline.stages.filter(stage => {
        // If no permissions set, stage is visible to all
        if (stage.rolePermissions.length === 0) {
          return true;
        }
        
        // Check if user has any role that's allowed for this stage
        return stage.rolePermissions.some(permission => 
          userRoles.includes(permission.roleName)
        );
      });

      return allowedStages.map(stage => ({
        id: stage.id,
        name: stage.name,
        orderIndex: stage.orderIndex,
        color: stage.color || 'gray',
        leadCount: counts.get(stage.id) || 0
      }));
    } catch (error: any) {
      logger.error('Error getting pipeline stages for user', { pipelineKey, userRoles, error: error.message });
      throw error;
    }
  },

  /**
   * Get all leads in a pipeline with their details
   */
  async getPipelineLeads(pipelineKey: string, filters: PipelineLeadFilters = {}) {
    try {
      const pipeline = await prisma.pipelineDefinition.findUnique({
        where: { key: pipelineKey as any },
        select: { id: true }
      });

      if (!pipeline) {
        throw new Error(`Pipeline with key ${pipelineKey} not found`);
      }

      const whereClause: any = {
        pipelineStage: {
          pipelineId: pipeline.id
        },
        NOT: {
          leadStatus: { name: { in: [...this.hiddenPipelineLeadStatuses] } },
        },
      };

      // Apply role-based filtering
      if (filters.userRole && filters.userId) {
        const access = this.getPipelineAccess([filters.userRole]);
        
        if (access.canViewAssignedOnly) {
          whereClause.assignedUserId = filters.userId;
        }
        
        // Filter by lead type based on role
        if (filters.userRole === 'ACQ') {
          whereClause.leadType = 'SELLER';
        } else if (filters.userRole === 'DISP') {
          whereClause.leadType = { in: ['BUYER', 'SELLER'] }; // DISP can see properties (seller leads) and buyers
        }
      }

      if (filters.assignedUserId) {
        whereClause.assignedUserId = filters.assignedUserId;
      }

      if (filters.leadSourceId) {
        whereClause.leadSourceId = filters.leadSourceId;
      }

      if (filters.needsAttention) {
        whereClause.needsAttention = true;
      }

      const leads = await prisma.lead.findMany({
        where: whereClause,
        include: {
          address: true,
          seller: true,
          buyer: true,
          leadStatus: true,
          pipelineStage: true,
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          communications: {
            orderBy: { createdAt: 'desc' },
            take: 5, // Get recent communications for counting
            select: {
              id: true,
              type: true,
              direction: true,
              createdAt: true
            }
          },
          leadBuyers: {
            include: {
              buyer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          tasks: {
            where: { status: 'OPEN' },
            select: {
              id: true,
              dueAt: true,
              title: true
            }
          },
          deal: true
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Transform leads to match frontend format with pipeline card data
      const transformedLeads = leads.map(lead => {
        const lastContact = lead.communications[0]?.createdAt || lead.createdAt;
        const now = new Date();
        
        // Calculate time in current status
        const timeInCurrentStatus = lead.stageEnteredAt ? 
          Math.floor((now.getTime() - lead.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24)) : 
          Math.floor((now.getTime() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Count communications by type
        const totalCalls = lead.communications.filter(c => c.type === 'CALL').length;
        const totalBuyers = lead.leadBuyers.length;
        
        // Get buyer names for dispositions
        const buyerNames = lead.leadBuyers.map(lb => `${lb.buyer.firstName} ${lb.buyer.lastName}`);
        
        return {
          id: lead.id,
          address: lead.address ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}` : 'Address not provided',
          sellerName: lead.seller ? `${lead.seller.firstName} ${lead.seller.lastName}` : 'No seller info',
          buyerName: lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : '',
          buyerNames: buyerNames,
          dateCreated: lead.createdAt,
          statusChangedDate: lead.updatedAt,
          lastContactDate: lastContact,
          timeInCurrentStatus: timeInCurrentStatus,
          timeInCurrentStatusText: timeInCurrentStatus === 1 ? '1 day' : `${timeInCurrentStatus} days`,
          
          // Pipeline card checkboxes
          priceReduction: lead.priceReduction,
          clearToClose: lead.clearToClose,
          sold: lead.sold,
          
          // Counts for pipeline cards
          totalCalls: totalCalls,
          totalBuyers: totalBuyers,
          
          // Deal information
          contractPrice: lead.deal?.contractPrice,
          soldPrice: lead.deal?.soldPrice,
          netProfit: lead.deal?.netProfit,
          contractedAt: lead.deal?.contractedAt,
          closedAt: lead.deal?.closedAt,
          
          // Stage information
          stage: lead.pipelineStage?.id || '',
          stageName: lead.pipelineStage?.name || '',
          stageColor: lead.pipelineStage?.color || 'gray',
          
          // Assignment
          assignedAgent: lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : 'Unassigned',
          assignedUserId: lead.assignedUserId,
          
          // Basic info
          leadType: lead.leadType,
          status: lead.status,
          
          // Attention flags
          needsAttention: lead.needsAttention,
          attentionReason: lead.attentionReason,
          
          // Tasks
          openTasks: lead.tasks.length,
          overdueTasks: lead.tasks.filter(task => new Date(task.dueAt) < now).length
        };
      });

      // Filter for needs attention if requested
      if (filters && filters.needsAttention === true) {
        const now = new Date();
        const filteredLeads = transformedLeads.filter(lead => {
          // No contact in 72+ hours
          const hoursSinceLastContact = Math.floor((now.getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60));
          
          return (
            hoursSinceLastContact >= 72 ||
            lead.status === 'urgent' ||
            lead.clearToClose === false
          );
        });
        
        return filteredLeads;
      }

      return transformedLeads;
    } catch (error: any) {
      logger.error('Error getting pipeline leads', { pipelineKey, filters, error: error.message });
      throw error;
    }
  },

  /**
   * Move a lead to a different pipeline stage
   */
  async moveLeadToStage(leadId: string, stageId: string, userId?: string) {
    try {
      // Get current lead to track previous stage
      const currentLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { pipelineStageId: true }
      });

      if (!currentLead) {
        throw new Error('Lead not found');
      }
      
      // NEW: Validation check before stage change
      const validation = await stageTransitionService.validateStageTransition(
        leadId,
        currentLead.pipelineStageId,
        stageId
      );
      
      if (!validation.valid) {
        const error: any = new Error(validation.errors?.[0] || 'Validation failed');
        error.code = 'VALIDATION_REQUIRED';
        error.requiredFields = validation.requiredFields;
        error.stageName = validation.stageName;
        throw error;
      }

      // EXISTING: Verify the new stage exists
      const stage = await prisma.pipelineStage.findUnique({
        where: { id: stageId },
        select: { id: true, name: true }
      });

      if (!stage) {
        logger.error('Pipeline stage not found - cannot move lead', { 
          stageId, 
          leadId,
          stageIdType: typeof stageId,
          stageIdLength: stageId?.length 
        });
        
        // Try to find a similar stage by name or list available stages
        const allStages = await prisma.pipelineStage.findMany({
          select: { id: true, name: true, pipelineId: true }
        });
        
        logger.error('Available stages in database', { 
          count: allStages.length,
          stages: allStages.map(s => ({ id: s.id, name: s.name }))
        });
        
        throw new Error(`Pipeline stage ${stageId} does not exist in database. Available stages: ${allStages.length}`);
      }

      // EXISTING: Don't move if it's the same stage
      if (currentLead.pipelineStageId === stageId) {
        return {
          leadId,
          newStageId: stageId,
          newStageName: stage.name,
          updatedAt: new Date()
        };
      }

      // EXISTING: Update the lead's pipeline stage and stageEnteredAt
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          pipelineStageId: stageId,
          stageEnteredAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          pipelineStage: true
        }
      });

      // EXISTING: Create stage history record only if we have a fromStageId (skip if lead was never in a stage)
      if (currentLead.pipelineStageId) {
        await prisma.stageHistory.create({
          data: {
            leadId: leadId,
            fromStageId: currentLead.pipelineStageId,
            toStageId: stageId,
            changedById: userId,
            changedAt: new Date()
          }
        });
      }

      logger.info('Lead moved to new stage', { 
        leadId, 
        stageId, 
        stageName: stage.name, 
        userId 
      });
      
      // NEW: Execute post-transition actions (task creation)
      if (userId) {
        await stageTransitionService.executePostTransitionActions(leadId, stageId, userId);
      }

      return {
        leadId,
        newStageId: stageId,
        newStageName: stage.name,
        updatedAt: updatedLead.updatedAt
      };
    } catch (error: any) {
      logger.error('Error moving lead to stage', { 
        leadId, 
        stageId, 
        userId, 
        error: error.message,
        stack: error.stack,
        code: error.code
      });
      throw error;
    }
  },

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(pipelineKey: string) {
    try {
      const pipeline = await prisma.pipelineDefinition.findUnique({
        where: { key: pipelineKey as any },
        include: {
          stages: {
            include: {
              _count: {
                select: {
                  leads: true
                }
              }
            },
            orderBy: { orderIndex: 'asc' }
          }
        }
      });

      if (!pipeline) {
        throw new Error(`Pipeline with key ${pipelineKey} not found`);
      }

      const totalLeads = await prisma.lead.count({
        where: {
          pipelineStage: {
            pipelineId: pipeline.id
          }
        }
      });

      const stageStats = pipeline.stages.map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        leadCount: stage._count.leads,
        percentage: totalLeads > 0 ? Math.round((stage._count.leads / totalLeads) * 100) : 0
      }));

      return {
        totalLeads,
        stageStats,
        needsAttentionCount: 0 // TODO: Implement needs attention logic
      };
    } catch (error: any) {
      logger.error('Error getting pipeline stats', { pipelineKey, error: error.message });
      throw error;
    }
  },

  /**
   * Get leads that need attention
   */
  async getNeedsAttentionLeads(pipelineKey: string) {
    try {
      const leads = await this.getPipelineLeads(pipelineKey);
      return this.filterNeedsAttentionLeads(leads);
    } catch (error: any) {
      logger.error('Error getting needs attention leads', { pipelineKey, error: error.message });
      throw error;
    }
  },

  /**
   * Filter leads that need attention based on business rules
   * This function is kept for potential future use but the logic is now inlined
   */
  filterNeedsAttentionLeads(leads: any[]) {
    const now = new Date();
    
    return leads.filter(lead => {
      const hoursSinceLastContact = Math.floor((now.getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60));
      
      return (
        hoursSinceLastContact >= 72 ||
        lead.status === 'urgent' ||
        lead.clearToClose === false
      );
    });
  },

  /**
   * Create default pipeline stages for a pipeline
   */
  async createDefaultStages(pipelineKey: string): Promise<void> {
    const pipeline = await prisma.pipelineDefinition.findUnique({
      where: { key: pipelineKey as any }
    });

    if (!pipeline) {
      throw new Error(`Pipeline with key ${pipelineKey} not found`);
    }

    const defaultStages = this.getDefaultStages(pipelineKey);
    
    for (const [index, stageData] of defaultStages.entries()) {
      await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          name: stageData.name,
          orderIndex: index,
          color: stageData.color,
          description: stageData.description,
          isDefault: true,
          requiresAction: stageData.requiresAction,
          attentionThresholdHours: stageData.attentionThresholdHours
        }
      });
    }
  },

  /**
   * Get default stages for each pipeline type
   */
  getDefaultStages(pipelineKey: string) {
    const stageDefinitions = {
      'ACQUISITIONS': [
        { name: 'New Lead', color: 'blue', description: 'Newly received lead', requiresAction: true, attentionThresholdHours: 2 },
        { name: 'No Contact', color: 'orange', description: 'Unable to reach lead', requiresAction: true, attentionThresholdHours: 24 },
        { name: 'Contact Made', color: 'yellow', description: 'Initial contact established', requiresAction: false, attentionThresholdHours: 48 },
        { name: 'Appointment Set', color: 'purple', description: 'Meeting scheduled', requiresAction: false, attentionThresholdHours: null },
        { name: 'Appointment Complete', color: 'indigo', description: 'Property viewed/evaluated', requiresAction: false, attentionThresholdHours: 24 },
        { name: 'Due Diligence', color: 'pink', description: 'Research and analysis phase', requiresAction: true, attentionThresholdHours: 72 },
        { name: 'Offer Made', color: 'red', description: 'Offer presented to seller', requiresAction: false, attentionThresholdHours: 48 },
        { name: 'Contract Sent', color: 'green', description: 'Contract documents sent', requiresAction: false, attentionThresholdHours: 24 },
        { name: 'Under Contract', color: 'emerald', description: 'Contract executed', requiresAction: false, attentionThresholdHours: null }
      ],
      'TRANSACTION': [
        { name: 'New Lead', color: 'blue', description: 'New transaction assigned', requiresAction: true, attentionThresholdHours: 4 },
        { name: 'Title Open', color: 'yellow', description: 'Title company engaged', requiresAction: false, attentionThresholdHours: 24 },
        { name: 'Clear to Close', color: 'green', description: 'Ready for closing', requiresAction: false, attentionThresholdHours: 48 },
        { name: 'Closed', color: 'emerald', description: 'Transaction completed', requiresAction: false, attentionThresholdHours: null }
      ],
      'DISPOSITIONS': [
        { name: 'For Sale', color: 'blue', description: 'Property listed for sale', requiresAction: false, attentionThresholdHours: 48 },
        { name: 'Under Contract', color: 'yellow', description: 'Buyer under contract', requiresAction: false, attentionThresholdHours: 24 },
        { name: 'Closed', color: 'green', description: 'Sale completed', requiresAction: false, attentionThresholdHours: null }
      ]
    };

    return stageDefinitions[pipelineKey as keyof typeof stageDefinitions] || [];
  },

  /**
   * Update pipeline stage (Admin only)
   */
  async updatePipelineStage(stageId: string, updates: {
    name?: string;
    color?: string;
    description?: string;
    orderIndex?: number;
    requiresAction?: boolean;
    attentionThresholdHours?: number | null;
  }): Promise<void> {
    await prisma.pipelineStage.update({
      where: { id: stageId },
      data: updates
    });
  },

  /**
   * Get available lead sources for filtering (used by ACQ agents)
   */
  async getLeadSources() {
    try {
      return await prisma.leadSource.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      });
    } catch (error) {
      logger.error('Error fetching lead sources:', error);
      throw error;
    }
  },

  /**
   * Update stage role permissions
   */
  async updateStageRolePermissions(stageId: string, allowedRoles: string[]) {
    try {
      // First, delete all existing permissions for this stage
      await prisma.stageRolePermission.deleteMany({
        where: { stageId }
      });

      // Then create new permissions for the allowed roles
      if (allowedRoles && allowedRoles.length > 0) {
        await prisma.stageRolePermission.createMany({
          data: allowedRoles.map(roleName => ({
            stageId,
            roleName: roleName as any
          }))
        });
      }

      logger.info('Stage role permissions updated', { stageId, allowedRoles });
    } catch (error: any) {
      logger.error('Error updating stage role permissions', { stageId, error: error.message });
      throw error;
    }
  }
};
