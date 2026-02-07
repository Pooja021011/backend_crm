import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { stageTransitionService } from './stageTransitionService.js';
import { leadService } from './leadService.js';

export interface PipelineLeadFilters {
  needsAttention?: boolean;
  assignedUserId?: string;
  leadSourceId?: string;
  dispAgentId?: string;
  acqAgentIds?: string[];
  dispAgentIds?: string[];
  createdFrom?: string;
  createdTo?: string;
  lastTouchedFrom?: string;
  lastTouchedTo?: string;
  userRole?: string | string[];
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
  async getVisibleLeadCountsByStage(stageIds: string[]) {
    if (!stageIds.length) return new Map<string, number>();

    const grouped = await prisma.lead.groupBy({
      by: ['pipelineStageId'],
      where: {
        pipelineStageId: { in: stageIds },
        leadStatus: {
          name: { equals: 'Pipeline', mode: 'insensitive' }
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
    
    // Dispositions Agent: Only their assigned leads
    if (hasRole('DISP')) {
      return {
        canViewFull: false,
        canViewAssignedOnly: true,
        canViewTeam: false,
        allowedPipelines: ['DISPOSITIONS'],
        availableToggles: [] // Needs attention filter hidden for now
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
   * Rules match exact business requirements for ADMIN, MANAGER, and ACQ roles
   * Prevents duplicates by evaluating ALL roles and returning single highest priority reason
   */
  async checkNeedsAttention(leadId: string, userRoles: string[], userId?: string): Promise<{ needsAttention: boolean; reason?: string }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        pipelineStage: true,
        assignedUser: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        },
        tasks: {
          where: { status: 'OPEN' },
          orderBy: { dueAt: 'asc' }
        },
        communications: {
          where: {
            OR: [
              { direction: 'INBOUND' },
              { type: 'NOTE' }
            ]
          },
          orderBy: { occurredAt: 'desc' },
          take: 10,
          include: {
            reads: userId ? {
              where: { userId: userId }
            } : false
          }
        },
        deal: true
      }
    });

    if (!lead) return { needsAttention: false };

    const now = new Date();
    const hoursSinceLastContact = lead.lastContactAt ? 
      (now.getTime() - lead.lastContactAt.getTime()) / (1000 * 60 * 60) : Infinity;
    
    // Check if lead is in 'New Leads' pipeline status
    const isNewLeadStage = lead.pipelineStage?.name?.toLowerCase().includes('new lead');
    
    // Check if lead has upcoming (future) tasks - ALL tasks (for ADMIN/MANAGER team monitoring)
    const upcomingTasks = lead.tasks.filter(task => new Date(task.dueAt) > now);
    const hasUpcomingTask = upcomingTasks.length > 0;
    
    // Check if lead has past due tasks - ALL tasks (for ADMIN/MANAGER team monitoring)
    const pastDueTasks = lead.tasks.filter(task => new Date(task.dueAt) < now);
    const hasPastDueTask = pastDueTasks.length > 0;
    
    // Check user-specific tasks (for ACQ agent - only tasks assigned to login user)
    const upcomingTasksForUser = lead.tasks.filter(task => 
      new Date(task.dueAt) > now && task.assignedToId === userId
    );
    const hasUpcomingTaskForUser = upcomingTasksForUser.length > 0;
    
    const pastDueTasksForUser = lead.tasks.filter(task => 
      new Date(task.dueAt) < now && task.assignedToId === userId
    );
    const hasPastDueTaskForUser = pastDueTasksForUser.length > 0;
    
    // Check if lead is actively in user's communication inbox (has unread communications)
    const hasUnreadComms = userId ? lead.communications.some(comm => 
      comm.reads && comm.reads.length === 0
    ) : false;
    
    // Check if assigned user is an ACQ agent
    const assignedUserRoles = lead.assignedUser?.roles?.map(ur => ur.role.name) || [];
    const isAssignedToACQ = assignedUserRoles.includes('ACQ');

    // Collect reasons from ALL applicable roles - prevents duplicates
    const allReasons: Array<{ priority: number; reason: string; role: string }> = [];

    // ADMIN Role Logic
    if (userRoles.includes('ADMIN')) {
      // Priority 1 (LOWEST TIME): Task past due 48 hours
      if (hasPastDueTask) {
        const oldestPastDueTask = pastDueTasks[0];
        const hoursPastDue = (now.getTime() - new Date(oldestPastDueTask.dueAt).getTime()) / (1000 * 60 * 60);
        if (hoursPastDue >= 48) {
          allReasons.push({ priority: 1, reason: `Task past due ${Math.floor(hoursPastDue)}h`, role: 'ADMIN' });
        }
      }
      
      // Priority 7: No outreach in 72 hours without upcoming task
      if (isAssignedToACQ && hoursSinceLastContact >= 72 && !hasUpcomingTask) {
        allReasons.push({ priority: 7, reason: `No outreach in ${Math.floor(hoursSinceLastContact)}h without upcoming task`, role: 'ADMIN' });
      }
      
      // Priority 10: Unread communications
      if (hasUnreadComms) {
        allReasons.push({ priority: 10, reason: 'Unread communications in inbox', role: 'ADMIN' });
      }
    }

    // MANAGER (Acquisitions Manager) Role Logic
    if (userRoles.includes('MANAGER')) {
      // Skip own leads if user is also ACQ (to prevent duplicates)
      const skipAsManager = userRoles.includes('ACQ') && lead.assignedUserId === userId;
      
      if (!skipAsManager && isAssignedToACQ) {
        // Priority 2 (LOWEST TIME for MANAGER): Task past due 30+ minutes
        if (hasPastDueTask) {
          const oldestPastDueTask = pastDueTasks[0];
          const minutesPastDue = (now.getTime() - new Date(oldestPastDueTask.dueAt).getTime()) / (1000 * 60);
          if (minutesPastDue >= 30) {
            allReasons.push({ priority: 2, reason: `Task past due ${Math.floor(minutesPastDue)}min (team)`, role: 'MANAGER' });
          }
        }
        
        // Priority 5: No outreach in 48 hours without upcoming task
        if (hoursSinceLastContact >= 48 && !hasUpcomingTask) {
          allReasons.push({ priority: 5, reason: `No outreach in ${Math.floor(hoursSinceLastContact)}h without upcoming task (team)`, role: 'MANAGER' });
        }
        
        // Priority 8: New Leads status
        if (isNewLeadStage) {
          allReasons.push({ priority: 8, reason: 'New lead status (team)', role: 'MANAGER' });
        }
        
        // Priority 10: Unread communications
        if (hasUnreadComms) {
          allReasons.push({ priority: 10, reason: 'Unread communications in inbox', role: 'MANAGER' });
        }
      }
    }

    // ACQ (Acquisitions Agent) Role Logic - Only own leads
    if (userRoles.includes('ACQ') && lead.assignedUserId === userId) {
      // Priority 3 (LOWEST TIME for ACQ): Any past due task assigned to user
      if (hasPastDueTaskForUser) {
        const oldestPastDueTask = pastDueTasksForUser[0];
        const minutesPastDue = (now.getTime() - new Date(oldestPastDueTask.dueAt).getTime()) / (1000 * 60);
        allReasons.push({ priority: 3, reason: `Task past due ${Math.floor(minutesPastDue)}min`, role: 'ACQ' });
      }
      
      // Priority 4: No outreach in 36 hours without upcoming task assigned to user
      if (hoursSinceLastContact >= 36 && !hasUpcomingTaskForUser) {
        allReasons.push({ priority: 4, reason: `No outreach in ${Math.floor(hoursSinceLastContact)}h without upcoming task`, role: 'ACQ' });
      }
      
      // Priority 8: New Leads status
      if (isNewLeadStage) {
        allReasons.push({ priority: 8, reason: 'New lead status', role: 'ACQ' });
      }
      
      // Priority 10: Unread communications
      if (hasUnreadComms) {
        allReasons.push({ priority: 10, reason: 'Unread communications in inbox', role: 'ACQ' });
      }
    }

    // DISP (Dispositions) Role Logic
    if (userRoles.includes('DISP')) {
      if (lead.leadType === 'BUYER' || lead.leadType === 'SELLER') {
        // Priority 6: New deal assignment (< 2 hours)
        if (lead.deal && !lead.deal.contractedAt) {
          const hoursInCurrentStage = lead.stageEnteredAt ? 
            (now.getTime() - lead.stageEnteredAt.getTime()) / (1000 * 60 * 60) : 0;
          if (hoursInCurrentStage < 2) {
            allReasons.push({ priority: 6, reason: 'New deal assigned', role: 'DISP' });
          }
        }
        
        // Priority 9: Due diligence deadline approaching (> 2 days since contract)
        if (lead.deal?.contractedAt) {
          const daysSinceContract = (now.getTime() - lead.deal.contractedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceContract > 2 && !lead.deal.closedAt) {
            allReasons.push({ priority: 9, reason: `Due diligence period ending soon (${Math.floor(daysSinceContract)} days)`, role: 'DISP' });
          }
        }
      }
    }

    // TC (Transaction Coordinator) Role Logic
    if (userRoles.includes('TC')) {
      // Priority 6: Closing in 2 days or less
      if (lead.deal?.contractedAt) {
        const daysToClosing = lead.deal.closedAt ? 
          (lead.deal.closedAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;
        if (daysToClosing !== null && daysToClosing <= 2 && daysToClosing > 0) {
          allReasons.push({ priority: 6, reason: `Closing in ${Math.floor(daysToClosing * 24)} hours`, role: 'TC' });
        }
      }
      
      // Priority 9: Uncontacted new lead
      if (!lead.lastContactAt && lead.pipelineStage?.name === 'New Lead') {
        allReasons.push({ priority: 9, reason: 'Uncontacted new lead', role: 'TC' });
      }
    }

    // Return SINGLE highest priority (lowest number) reason across ALL roles
    // This prevents duplicate leads when user has multiple roles
    if (allReasons.length > 0) {
      allReasons.sort((a, b) => a.priority - b.priority);
      return { needsAttention: true, reason: allReasons[0].reason };
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
        const { needsAttention, reason } = await this.checkNeedsAttention(lead.id, userRoles, userId);
        
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            needsAttention,
            attentionReason: reason
          }
        });
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error updating needs attention status');
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
      logger.error({ pipelineKey, error: error.message }, 'Error getting pipeline stages');
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
      logger.error({ pipelineKey, userRoles, error: error.message }, 'Error getting pipeline stages for user');
      throw error;
    }
  },

  /**
   * Get all leads in a pipeline with their details
   */
  async getPipelineLeads(pipelineKey: string, filters: PipelineLeadFilters = {}) {
    try {
      const parseRangeStart = (v?: string) => (v ? new Date(v.length <= 10 ? `${v}T00:00:00.000Z` : v) : undefined);
      const parseRangeEnd = (v?: string) => (v ? new Date(v.length <= 10 ? `${v}T23:59:59.999Z` : v) : undefined);

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
        leadStatus: {
          name: { 
            in: ['Pipeline', 'Closed'],
            mode: 'insensitive' 
          }
        },
      };

      // Apply role-based filtering
      if (filters.userRole && filters.userId) {
        // Handle userRole as array (passed from controller)
        const userRoles = Array.isArray(filters.userRole) ? filters.userRole : [filters.userRole];
        const access = this.getPipelineAccess(userRoles);
        
        if (access.canViewAssignedOnly) {
          whereClause.assignedUserId = filters.userId;
        }
        
        // Filter by lead type based on role
        // IMPORTANT: Only apply leadType filter for specific roles, not ADMIN/EXECUTIVE/MANAGER
        const hasACQ = userRoles.includes('ACQ');
        const hasDISP = userRoles.includes('DISP');
        const hasAdminRole = userRoles.some(r => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(r));
        
        if (hasACQ && !hasAdminRole) {
          // ACQ agent (without admin privileges) only sees SELLER leads
          whereClause.leadType = 'SELLER';
        } else if (hasDISP && !hasAdminRole) {
          // DISP agent (without admin privileges) sees BUYER and SELLER leads
          whereClause.leadType = { in: ['BUYER', 'SELLER'] };
        }
        // ADMIN/EXECUTIVE/MANAGER see all lead types (no filter applied)
      }

      if (filters.assignedUserId) {
        whereClause.assignedUserId = filters.assignedUserId;
      }

      if (filters.dispAgentId) {
        console.log('🔍 Applying DISP agent filter in backend:', filters.dispAgentId);
        whereClause.dispAgentId = filters.dispAgentId;
      }

      // Multi-select agent filters
      if (filters.acqAgentIds && filters.acqAgentIds.length > 0) {
        whereClause.assignedUserId = { in: filters.acqAgentIds };
      }

      if (filters.dispAgentIds && filters.dispAgentIds.length > 0) {
        whereClause.dispAgentId = { in: filters.dispAgentIds };
      }

      if (filters.leadSourceId) {
        whereClause.leadSourceId = filters.leadSourceId;
      }

      if (filters.createdFrom || filters.createdTo) {
        whereClause.createdAt = {
          ...(filters.createdFrom ? { gte: parseRangeStart(filters.createdFrom) } : {}),
          ...(filters.createdTo ? { lte: parseRangeEnd(filters.createdTo) } : {}),
        };
      }

      if (filters.lastTouchedFrom || filters.lastTouchedTo) {
        whereClause.lastContactAt = {
          ...(filters.lastTouchedFrom ? { gte: parseRangeStart(filters.lastTouchedFrom) } : {}),
          ...(filters.lastTouchedTo ? { lte: parseRangeEnd(filters.lastTouchedTo) } : {}),
        };
      }

      // Apply role-based Needs Attention filter
      if (filters.needsAttention && filters.userRole && filters.userId) {
        const userRoles = Array.isArray(filters.userRole) 
          ? filters.userRole 
          : [filters.userRole];
        
        const isAdmin = userRoles.includes('ADMIN');
        const isManager = userRoles.includes('MANAGER');
        const isACQ = userRoles.includes('ACQ');
        
        const now = new Date();
        const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
        const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);
        
        const needsAttentionConditions: any[] = [];
        
        // ADMIN CONDITIONS
        if (isAdmin) {
          console.log('🔍 Applying ADMIN needs attention criteria');
          
          // Apply same date filter as Tasks tab (Jan 20, 2026) for consistency - same as reminder logic
          const tasksCutoffDate = new Date(2026, 0, 20); // Jan 20, 2026
          
          // 1. All pipeline lead status leads that an Acquisitions Agent has had no outreach in the last 72 hours that does not have an upcoming task
          // Use OUTBOUND communication (reached out) - same as reminder logic
          // Logic: Either no OUTBOUND communications at all, OR last OUTBOUND is 72+ hours old
          needsAttentionConditions.push({
            AND: [
              {
                assignedUser: {
                  roles: { some: { role: { name: 'ACQ' } } }
                }
              },
              {
                leadStatus: {
                  name: {
                    equals: 'Pipeline',
                    mode: 'insensitive'
                  }
                }
              },
              {
                OR: [
                  // Case 1: No OUTBOUND communications at all (excluding NOTES - they're internal, not outreach)
                  {
                    communications: {
                      none: {
                        AND: [
                          { direction: 'OUTBOUND' },
                          { type: { not: 'NOTE' } } // Exclude NOTES - they're internal, not outreach
                        ]
                      }
                    }
                  },
                  // Case 2: Has OUTBOUND communication (excluding NOTES) that is 72+ hours old AND no newer OUTBOUND within 72h
                  {
                    AND: [
                      {
                        communications: {
                          some: {
                            AND: [
                              { direction: 'OUTBOUND' },
                              { type: { not: 'NOTE' } }, // Exclude NOTES from outreach check
                              {
                                occurredAt: {
                                  lte: hoursAgo(72)
                                }
                              }
                            ]
                          }
                        }
                      },
                      {
                        NOT: {
                          communications: {
                            some: {
                              AND: [
                                { direction: 'OUTBOUND' },
                                { type: { not: 'NOTE' } }, // Exclude NOTES from outreach check
                                {
                                  occurredAt: {
                                    gt: hoursAgo(72)
                                  }
                                }
                              ]
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              },
              {
                NOT: {
                  tasks: {
                    some: {
                      status: 'OPEN',
                      dueAt: {
                        gt: now,
                        gte: tasksCutoffDate // Only check tasks due >= Jan 20, 2026
                      },
                      NOT: [
                        { title: { startsWith: 'Review note on ' } },
                        { title: { startsWith: 'Underwrite ' } },
                        { title: { startsWith: 'Make Offer on ' } },
                        { title: { startsWith: 'Follow Up With ' } },
                        { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
                        { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
                        { title: { startsWith: 'Check Voided Contract With ' } }
                      ]
                    }
                  }
                }
              }
            ]
          });
          
          // 2. Any lead with a task that has been past due for 48 hours (manual tasks only)
          // Only show tasks due >= Jan 20, 2026 (same as Tasks tab and reminder logic)
          needsAttentionConditions.push({
            tasks: {
              some: {
                status: 'OPEN',
                dueAt: {
                  lte: hoursAgo(48),
                  gte: tasksCutoffDate // Only show tasks due >= Jan 20, 2026 (same as Tasks tab)
                },
                NOT: [
                  { title: { startsWith: 'Review note on ' } },
                  { title: { startsWith: 'Underwrite ' } },
                  { title: { startsWith: 'Make Offer on ' } },
                  { title: { startsWith: 'Follow Up With ' } },
                  { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
                  { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
                  { title: { startsWith: 'Check Voided Contract With ' } }
                ]
              }
            }
          });
          
          // 3. Any lead actively in the user's communication inbox
          // Check if there's an unread communication (INBOUND or OUTBOUND, excluding NOTES) with date filter
          // NOTES are internal and should not trigger needs attention
          needsAttentionConditions.push({
            communications: {
              some: {
                AND: [
                  {
                    OR: [
                      { direction: 'INBOUND' },
                      { direction: 'OUTBOUND' }
                    ]
                  },
                  { type: { not: 'NOTE' } }, // Exclude NOTES - they're internal, not actionable
                  {
                    occurredAt: {
                      gte: tasksCutoffDate // Only show communications >= Jan 20, 2026 (same as inbox page)
                    }
                  },
                  { reads: { none: { userId: filters.userId } } } // Unread check (same as inbox page)
                ]
              }
            }
          });
        }
        
        // MANAGER CONDITIONS
        if (isManager) {
          console.log('🔍 Applying MANAGER needs attention criteria');
          
          // Apply same date filter as Tasks tab (Jan 20, 2026) for consistency - same as reminder logic
          const tasksCutoffDate = new Date(2026, 0, 20); // Jan 20, 2026
          
          // 1. Any leads in the 'New Leads' pipeline status for all acquisitions agents
          needsAttentionConditions.push({
            assignedUser: {
              roles: { some: { role: { name: 'ACQ' } } }
            },
            pipelineStage: {
              name: { contains: 'New Lead', mode: 'insensitive' }
            }
          });
          
          // 2. All pipeline lead status leads that an Acquisitions Agent has had no outreach in the last 48 hours that does not have an upcoming task
          // Use OUTBOUND communication (reached out) - same as reminder logic
          // Logic: Either no OUTBOUND communications at all, OR last OUTBOUND is 48+ hours old
          needsAttentionConditions.push({
            AND: [
              {
                assignedUser: {
                  roles: { some: { role: { name: 'ACQ' } } }
                }
              },
              {
                leadStatus: {
                  name: {
                    equals: 'Pipeline',
                    mode: 'insensitive'
                  }
                }
              },
              {
                OR: [
                  // Case 1: No OUTBOUND communications at all (excluding NOTES - they're internal, not outreach)
                  {
                    communications: {
                      none: {
                        AND: [
                          { direction: 'OUTBOUND' },
                          { type: { not: 'NOTE' } } // Exclude NOTES - they're internal, not outreach
                        ]
                      }
                    }
                  },
                  // Case 2: Has OUTBOUND communication (excluding NOTES) that is 48+ hours old AND no newer OUTBOUND within 48h
                  {
                    AND: [
                      {
                        communications: {
                          some: {
                            AND: [
                              { direction: 'OUTBOUND' },
                              { type: { not: 'NOTE' } }, // Exclude NOTES from outreach check
                              {
                                occurredAt: {
                                  lte: hoursAgo(48)
                                }
                              }
                            ]
                          }
                        }
                      },
                      {
                        NOT: {
                          communications: {
                            some: {
                              AND: [
                                { direction: 'OUTBOUND' },
                                { type: { not: 'NOTE' } }, // Exclude NOTES from outreach check
                                {
                                  occurredAt: {
                                    gt: hoursAgo(48)
                                  }
                                }
                              ]
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              },
              {
                NOT: {
                  tasks: {
                    some: {
                      status: 'OPEN',
                      dueAt: {
                        gt: now,
                        gte: tasksCutoffDate // Only check tasks due >= Jan 20, 2026
                      },
                      NOT: [
                        { title: { startsWith: 'Review note on ' } },
                        { title: { startsWith: 'Underwrite ' } },
                        { title: { startsWith: 'Make Offer on ' } },
                        { title: { startsWith: 'Follow Up With ' } },
                        { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
                        { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
                        { title: { startsWith: 'Check Voided Contract With ' } }
                      ]
                    }
                  }
                }
              }
            ]
          });
          
          // 3. Any lead that has a past due task for all acquisitions agents that has been past due for at least 6 hours
          // Only show tasks due >= Jan 20, 2026 (same as Tasks tab and reminder logic)
          needsAttentionConditions.push({
            assignedUser: {
              roles: { some: { role: { name: 'ACQ' } } }
            },
            tasks: {
              some: {
                status: 'OPEN',
                dueAt: {
                  lte: hoursAgo(6),
                  gte: tasksCutoffDate // Only show tasks due >= Jan 20, 2026 (same as Tasks tab)
                },
                NOT: [
                  { title: { startsWith: 'Review note on ' } },
                  { title: { startsWith: 'Underwrite ' } },
                  { title: { startsWith: 'Make Offer on ' } },
                  { title: { startsWith: 'Follow Up With ' } },
                  { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
                  { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
                  { title: { startsWith: 'Check Voided Contract With ' } }
                ]
              }
            }
          });
          
          // 4. Any lead actively in the user's communication inbox
          // Check if there's an unread communication (INBOUND or OUTBOUND, excluding NOTES) with date filter
          // NOTES are internal and should not trigger needs attention
          if (!isAdmin) { // Don't duplicate if already added by Admin role
            needsAttentionConditions.push({
              communications: {
                some: {
                  AND: [
                    {
                      OR: [
                        { direction: 'INBOUND' },
                        { direction: 'OUTBOUND' }
                      ]
                    },
                    { type: { not: 'NOTE' } }, // Exclude NOTES - they're internal, not actionable
                    {
                      occurredAt: {
                        gte: tasksCutoffDate // Only show communications >= Jan 20, 2026 (same as inbox page)
                      }
                    },
                    { reads: { none: { userId: filters.userId } } } // Unread check (same as inbox page)
                  ]
                }
              }
            });
          }
        }
        
        // ACQ AGENT CONDITIONS
        if (isACQ) {
          console.log('🔍 Applying ACQ needs attention criteria');
          
          // Apply same date filter as Tasks tab (Jan 20, 2026) for consistency - same as reminder logic
          const tasksCutoffDate = new Date(2026, 0, 20); // Jan 20, 2026
          
          // 1. Any leads in the 'New Leads' pipeline status for the user
          needsAttentionConditions.push({
            assignedUserId: filters.userId,
            pipelineStage: {
              name: { contains: 'New Lead', mode: 'insensitive' }
            }
          });
          
          // 2. All pipeline lead status leads that an Acquisitions Agent has had no outreach in the last 36 hours that does not have an upcoming task
          // Use OUTBOUND communication (reached out) - same as reminder logic
          // Logic: Either no OUTBOUND communications at all, OR last OUTBOUND is 36+ hours old
          needsAttentionConditions.push({
            AND: [
              {
                assignedUserId: filters.userId
              },
              {
                leadStatus: {
                  name: {
                    equals: 'Pipeline',
                    mode: 'insensitive'
                  }
                }
              },
              {
                OR: [
                  // Case 1: No OUTBOUND communications at all (excluding NOTES - they're internal, not outreach)
                  {
                    communications: {
                      none: {
                        AND: [
                          { direction: 'OUTBOUND' },
                          { type: { not: 'NOTE' } } // Exclude NOTES - they're internal, not outreach
                        ]
                      }
                    }
                  },
                  // Case 2: Has OUTBOUND communication (excluding NOTES) that is 36+ hours old AND no newer OUTBOUND within 36h
                  {
                    AND: [
                      {
                        communications: {
                          some: {
                            AND: [
                              { direction: 'OUTBOUND' },
                              { type: { not: 'NOTE' } }, // Exclude NOTES from outreach check
                              {
                                occurredAt: {
                                  lte: hoursAgo(36)
                                }
                              }
                            ]
                          }
                        }
                      },
                      {
                        NOT: {
                          communications: {
                            some: {
                              AND: [
                                { direction: 'OUTBOUND' },
                                { type: { not: 'NOTE' } }, // Exclude NOTES from outreach check
                                {
                                  occurredAt: {
                                    gt: hoursAgo(36)
                                  }
                                }
                              ]
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              },
              {
                NOT: {
                  tasks: {
                    some: {
                      status: 'OPEN',
                      dueAt: {
                        gt: now,
                        gte: tasksCutoffDate // Only check tasks due >= Jan 20, 2026
                      },
                      NOT: [
                        { title: { startsWith: 'Review note on ' } },
                        { title: { startsWith: 'Underwrite ' } },
                        { title: { startsWith: 'Make Offer on ' } },
                        { title: { startsWith: 'Follow Up With ' } },
                        { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
                        { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
                        { title: { startsWith: 'Check Voided Contract With ' } }
                      ]
                    }
                  }
                }
              }
            ]
          });
          
          // 3. Any lead that has a past due task for the user
          // Only show tasks due >= Jan 20, 2026 (same as Tasks tab and reminder logic)
          needsAttentionConditions.push({
            assignedUserId: filters.userId,
            tasks: {
              some: {
                status: 'OPEN',
                dueAt: {
                  lt: now,
                  gte: tasksCutoffDate // Only show tasks due >= Jan 20, 2026 (same as Tasks tab)
                },
                assignedToId: filters.userId  // Task must be assigned to the user
              }
            }
          });
          
          // 4. Any lead actively in the user's communication inbox
          // Check if there's an unread communication (INBOUND or OUTBOUND, excluding NOTES) with date filter
          // NOTES are internal and should not trigger needs attention
          if (!isAdmin && !isManager) { // Don't duplicate if already added by Admin/Manager role
            needsAttentionConditions.push({
              assignedUserId: filters.userId,
              communications: {
                some: {
                  AND: [
                    {
                      OR: [
                        { direction: 'INBOUND' },
                        { direction: 'OUTBOUND' }
                      ]
                    },
                    { type: { not: 'NOTE' } }, // Exclude NOTES - they're internal, not actionable
                    {
                      occurredAt: {
                        gte: tasksCutoffDate // Only show communications >= Jan 20, 2026 (same as inbox page)
                      }
                    },
                    { reads: { none: { userId: filters.userId } } } // Unread check (same as inbox page)
                  ]
                }
              }
            });
          }
        }
        
        // Apply OR conditions to whereClause
        if (needsAttentionConditions.length > 0) {
          whereClause.OR = needsAttentionConditions;
          console.log(`🔍 Applied ${needsAttentionConditions.length} needs attention conditions`);
        }
      }

      console.log('🔍 Final whereClause:', JSON.stringify(whereClause, null, 2));

      const leads = await prisma.lead.findMany({
        where: whereClause,
        include: {
          address: true,
          seller: true,
          buyer: true,
          leadStatus: true,
          pipelineStage: {
            include: {
              pipeline: {
                select: {
                  key: true,
                }
              }
            }
          },
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              roles: {
                include: {
                  role: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          dispAgent: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          communications: {
            orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
            take: 10, // Get recent communications for last touched/activity + counts
            select: {
              id: true,
              type: true,
              direction: true,
              createdAt: true,
              occurredAt: true,
              metadata: true,
              reads: filters.userId ? {
                where: { userId: filters.userId },
                select: { readAt: true }
              } : false
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
            select: {
              id: true,
              assignedToId: true,
              dueAt: true,
              title: true,
              status: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: { updatedAt: 'desc' }
          },
          deal: true
        },
        orderBy: [
          { pipelineStage: { orderIndex: 'asc' } },
          { id: 'asc' },
        ]
      });

      console.log(`🔍 Query returned ${leads.length} leads`);
      if (filters.dispAgentId) {
        const leadsWithDisp = leads.filter(l => l.dispAgentId);
        console.log(`🔍 Leads with dispAgentId set: ${leadsWithDisp.length}`, leadsWithDisp.map(l => ({
          id: l.id,
          dispAgentId: l.dispAgentId,
          dispAgent: l.dispAgent?.firstName + ' ' + l.dispAgent?.lastName
        })));
      }

      // For Admin, Manager, and ACQ needs attention: Post-fetch refinement
      // Database query filters by Rule 1/2/3 using OR, but we need post-fetch refinement for:
      // 1. Rule 1 refinement: Exclude leads with upcoming tasks (database can't easily check this)
      // 2. Rule 1 refinement: Ensure there WAS at least one OUTBOUND comm (excluding NOTES) in the past
      // 3. Rule 4: Check unread communications (requires checking most recent comm, excluding NOTES)
      if (filters.needsAttention && filters.userId && filters.userRole) {
        const userRoles = Array.isArray(filters.userRole) ? filters.userRole : [filters.userRole];
        const isAdmin = userRoles.includes('ADMIN');
        const isManager = userRoles.includes('MANAGER');
        const isACQ = userRoles.includes('ACQ');
        
        if (isAdmin || isManager || isACQ) {
          const originalCount = leads.length;
          const now = new Date();
          const tasksCutoffDate = new Date(2026, 0, 20); // Jan 20, 2026
          
          // Helper: Check if task is auto-created
          const isAutoCreatedTask = (title: string) => {
            return title.startsWith('Review note on ') ||
                   title.startsWith('Underwrite ') ||
                   title.startsWith('Make Offer on ') ||
                   title.startsWith('Follow Up With ') ||
                   title.startsWith('Contract Sent - Awaiting Signature for ') ||
                   title.startsWith('URGENT: DocuSign Failed for ') ||
                   title.startsWith('Check Voided Contract With ');
          };
          
          // Helper: Check for upcoming tasks
          const hasUpcomingTask = (lead: any) => {
            return lead.tasks?.some((t: any) => {
              if (t.status !== 'OPEN') return false;
              const dueDate = new Date(t.dueAt);
              if (dueDate < tasksCutoffDate) return false;
              if (dueDate <= now) return false;
              return !isAutoCreatedTask(t.title || '');
            }) || false;
          };
          
          // Track which leads match which rules (for logging and preventing duplicates)
          const ruleMatches = {
            rule1: new Set<string>(), // No outreach in X hours
            rule2: new Set<string>(), // Past due tasks
            rule3: new Set<string>(), // Unread communications
          };
          
          // Filter leads: Refine Rule 1/2/3 matches and check Rule 4
          const filteredLeads = leads.filter(lead => {
            const isACQAgent = lead.assignedUser?.roles?.some((ur: any) => ur.role?.name === 'ACQ');
            const isPipelineStatus = lead.leadStatus?.name?.toLowerCase() === 'pipeline';
            const isAssignedToUser = isACQ && lead.assignedUserId === filters.userId;
            
            // Rule 2: Past due tasks (database already filtered, but verify)
            const hasPastDueTask = lead.tasks?.some((t: any) => {
              if (t.status !== 'OPEN') return false;
              const dueDate = new Date(t.dueAt);
              if (dueDate < tasksCutoffDate) return false;
              const hoursPastDue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
              const minHours = isAdmin ? 48 : isManager ? 6 : 0; // ACQ: any past due
              if (hoursPastDue < minHours) return false;
              if (isACQ && t.assignedToId !== filters.userId) return false; // ACQ: must be assigned to user
              return !isAutoCreatedTask(t.title || '');
            });
            
            if (hasPastDueTask) {
              ruleMatches.rule2.add(lead.id);
              return true; // Keep - matches Rule 2
            }
            
            // Rule 1: No outreach in X hours (needs refinement)
            // Only check if ACQ agent and Pipeline status
            // CRITICAL: Exclude leads with upcoming tasks from Rule 1
            if (isACQAgent && isPipelineStatus) {
              // First check: If lead has upcoming tasks, exclude from Rule 1 completely
              if (hasUpcomingTask(lead)) {
                // Don't match Rule 1 - continue to check Rule 4 below
              } else {
                const outboundComms = lead.communications?.filter((c: any) => 
                  c.direction === 'OUTBOUND' && c.type !== 'NOTE'
                ) || [];
                
                // Refinement: Must have had at least one OUTBOUND comm in the past
                // If no OUTBOUND comms at all (only NOTES), don't match Rule 1
                if (outboundComms.length > 0) {
                  const lastOutbound = outboundComms[0];
                  const lastOutboundTime = new Date(lastOutbound.occurredAt);
                  const hoursSinceOutbound = (now.getTime() - lastOutboundTime.getTime()) / (1000 * 60 * 60);
                  const thresholdHours = isAdmin ? 72 : isManager ? 48 : 36;
                  
                  if (hoursSinceOutbound >= thresholdHours) {
                    // Check if there's no newer outbound within threshold
                    const hasNewerOutbound = outboundComms.some((c: any) => {
                      const commTime = new Date(c.occurredAt);
                      return commTime > lastOutboundTime && (now.getTime() - commTime.getTime()) / (1000 * 60 * 60) < thresholdHours;
                    });
                    
                    if (!hasNewerOutbound) {
                      ruleMatches.rule1.add(lead.id);
                      return true; // Keep - matches Rule 1
                    }
                  }
                }
                // If no OUTBOUND comms, don't match Rule 1 - check Rule 4 below
              }
            }
            
            // Rule 4: Unread communications (excluding NOTES)
            const mostRecentComm = lead.communications?.find((c: any) => c.type !== 'NOTE');
            
            if (!mostRecentComm) {
              return false; // No communication (excluding NOTES)
            }
            
            const isValidComm = mostRecentComm.type === 'EMAIL' || 
                                mostRecentComm.type === 'SMS' || 
                                mostRecentComm.type === 'CALL';
            
            if (!isValidComm) {
              return false;
            }
            
            const commDate = new Date(mostRecentComm.occurredAt);
            const meetsDateFilter = commDate >= tasksCutoffDate;
            const isUnread = !mostRecentComm.reads || mostRecentComm.reads.length === 0;
            
            if (isUnread && meetsDateFilter) {
              ruleMatches.rule3.add(lead.id);
              return true; // Keep - matches Rule 4 (unread comms)
            }
            
            return false; // Doesn't match any rule
          });
          
          // Replace leads array with filtered results
          leads.length = 0;
          leads.push(...filteredLeads);
          
          const roleLabel = isAdmin ? 'Admin' : isManager ? 'Manager' : 'ACQ';
          console.log(`🔍 ${roleLabel} needs attention: Filtered from ${originalCount} to ${leads.length} leads (Rule 1: ${ruleMatches.rule1.size}, Rule 2: ${ruleMatches.rule2.size}, Rule 3: ${ruleMatches.rule3.size})`);
        }
      }

      const stageOrderIndexByLeadId = new Map<string, number>();
      for (const lead of leads) {
        stageOrderIndexByLeadId.set(lead.id, lead.pipelineStage?.orderIndex ?? 0);
      }

      // Transform leads to match frontend format with pipeline card data
      const transformedLeads = leads.map(lead => {
        const lastCommAt = lead.communications[0]?.occurredAt || lead.communications[0]?.createdAt;
        const lastTaskAt = lead.tasks[0]?.updatedAt || lead.tasks[0]?.createdAt;
        // For "last attempted contact" timer:
        // - Use ONLY lead.lastContactAt (which we update for outbound/inbound call attempts + SMS attempts)
        // - If null, UI should show 0 Minutes (no attempt).
        const lastAttemptedContactAt = lead.lastContactAt || null;
        // Keep lastActivityAt for other UI needs, but it should mirror attempted contact for pipeline timing.
        const lastActivityAt = lastAttemptedContactAt;

        const contactComms = lead.communications.filter((c: any) => {
          const t = String(c.type || '').toUpperCase();
          if (!['CALL', 'SMS', 'EMAIL'].includes(t)) return false;
          if (t === 'CALL') {
            const status = String((c.metadata as any)?.status || '').toLowerCase();
            if (status === 'missed' || status === 'ringing') return false;
          }
          return true;
        });
        const lastTouchedCommAt = contactComms[0]?.occurredAt || contactComms[0]?.createdAt;
        const lastTouchedAt = lead.lastContactAt || lastTouchedCommAt || null;

        const lastContact = lastTouchedAt;
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
        
        // Calculate unread count for the current user
        const unreadCount = filters.userId 
          ? lead.communications.filter((c: any) => 
              !c.reads || c.reads.length === 0
            ).length 
          : 0;
        
        return {
          id: lead.id,
          address: lead.address ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}` : 'Address not provided',
          sellerName: lead.seller ? `${lead.seller.firstName} ${lead.seller.lastName}` : 'No seller info',
          buyerName: lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : '',
          buyerNames: buyerNames,
          dateCreated: lead.createdAt,
          statusChangedDate: lead.updatedAt,
          lastContactDate: lastContact,
          lastAttemptedContactAt: lastAttemptedContactAt,
          lastTouchedAt: lastTouchedAt,
          lastActivityAt: lastActivityAt,
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
          assignedUserRoles: lead.assignedUser?.roles?.map((ur: any) => ur.role.name) || [],
          
          // Basic info
          leadType: lead.leadType,
          status: lead.status,
          
          // Attention flags
          needsAttention: lead.needsAttention,
          attentionReason: lead.attentionReason,
          
          // Unread communications count
          unreadCount: unreadCount,
          
          // Tasks - store raw tasks for needs attention filtering
          tasks: lead.tasks,
          
          // Communications - store raw communications for needs attention filtering
          communications: lead.communications,
          
          // Tasks counts
          // NOTE: Exclude mention-generated "Review note on ..." tasks from pipeline card counts.
          // Those are created from note @mentions and should not inflate operational task KPIs on pipeline cards.
          openTasks: lead.tasks.filter(task => {
            if (task.status !== 'OPEN') return false;
            const title = String(task.title || '');
            if (title.startsWith('Review note on ')) return false;
            return true;
          }).length,
          openTasksMine: filters.userId
            ? lead.tasks.filter(task => {
                if (task.status !== 'OPEN') return false;
                if (task.assignedToId !== filters.userId) return false;
                const title = String(task.title || '');
                if (title.startsWith('Review note on ')) return false;
                return true;
              }).length
            : 0,
          overdueTasks: lead.tasks.filter(task => task.status === 'OPEN' && new Date(task.dueAt) < now).length
        };
      });

      // Filter for needs attention if requested
      if (filters && filters.needsAttention === true && filters.userRole && filters.userId) {
        const now = new Date();
        
        // Convert userRole to array to handle both single role and multiple roles
        const userRolesArray = Array.isArray(filters.userRole) ? filters.userRole : [filters.userRole];
        const isAdmin = userRolesArray.includes('ADMIN');
        const isManager = userRolesArray.includes('MANAGER');
        const isACQ = userRolesArray.includes('ACQ');
        
        console.log('🔍 Post-fetch filter: User roles:', userRolesArray, { isAdmin, isManager, isACQ });
        
        // Filter leads based on ALL roles the user has (combined approach)
        const filteredLeads = transformedLeads.filter(lead => {
          let meetsAdminCriteria = false;
          let meetsManagerCriteria = false;
          let meetsAcqCriteria = false;
          
          // ADMIN CRITERIA
          if (isAdmin) {
            // Criterion 1: No outreach in 72h + no upcoming tasks (for ACQ-assigned leads)
            const assignedUserRoles = lead.assignedUserRoles || [];
            const isAssignedToACQ = assignedUserRoles.includes('ACQ');
            const lastContactDate = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
            const hoursSinceLastContact = lastContactDate 
              ? (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60)
              : Infinity;
            // Check for no upcoming tasks (past due tasks are allowed)
            const hasNoUpcomingTasks = !lead.tasks || !lead.tasks.some((t: any) => 
              t.status === 'OPEN' && new Date(t.dueAt) > now
            );
            const noOutreachNoTasks = isAssignedToACQ && hoursSinceLastContact >= 72 && hasNoUpcomingTasks;
            
            // Criterion 2: Task past due for 48+ hours
            const tasksPastDue48h = lead.tasks?.some((t: any) => {
              if (t.status !== 'OPEN') return false;
              const dueDate = new Date(t.dueAt);
              if (dueDate >= now) return false;
              const hoursPastDue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
              return hoursPastDue >= 48;
            }) || false;
            
            // Criterion 3: Unread communications
            const hasUnreadComms = lead.unreadCount > 0;
            
            meetsAdminCriteria = noOutreachNoTasks || tasksPastDue48h || hasUnreadComms;
          }
          
          // MANAGER CRITERIA
          if (isManager) {
            // Manager only sees ACQ agent leads (SELLER type)
            const isAcqLead = lead.leadType === 'SELLER' && !!lead.assignedUserId;
            
            if (isAcqLead) {
              // Criterion 1: New Leads pipeline stage (all ACQ agents per requirements)
              const stageName = (lead.stageName || '').toLowerCase();
              const isNewLeadStage = stageName === 'new lead' || stageName === 'new leads';
              
              // Criterion 2: No outreach in 48h + no upcoming tasks (past due tasks are allowed)
              const lastContactDate = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
              const hoursSinceLastContact = lastContactDate 
                ? (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60)
                : Infinity;
              // Check for no upcoming tasks (past due tasks are allowed)
              const hasNoUpcomingTasks = !lead.tasks || !lead.tasks.some((t: any) => 
                t.status === 'OPEN' && new Date(t.dueAt) > now
              );
              const noCommNoTasks = hoursSinceLastContact >= 48 && hasNoUpcomingTasks;
              
              // Criterion 3: Task past due for at least 6 hours (assigned to ACQ agent)
              const tasksPastDue6h = lead.tasks?.some((t: any) => {
                if (t.status !== 'OPEN') return false;
                const dueDate = new Date(t.dueAt);
                if (dueDate >= now) return false;
                const hoursPastDue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
                return hoursPastDue >= 6;  // Changed from 30 minutes to 6 hours
              }) || false;
              
              // Criterion 4: Unread communications
              const hasUnreadComms = lead.unreadCount > 0;
              
              meetsManagerCriteria = isNewLeadStage || noCommNoTasks || tasksPastDue6h || hasUnreadComms;
            }
          }
          
          // ACQ AGENT CRITERIA
          if (isACQ) {
            // ACQ only sees their own assigned leads (SELLER type)
            const isMyLead = lead.leadType === 'SELLER' && lead.assignedUserId === filters.userId;
            
            if (isMyLead) {
              // Criterion 1: New Leads pipeline stage for this user
              const stageName = (lead.stageName || '').toLowerCase();
              const isNewLeadStage = stageName === 'new lead' || stageName === 'new leads';
              
              // Criterion 2: No outreach in 36h + no upcoming tasks (past due tasks are allowed)
              const lastContactDate = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
              const hoursSinceLastContact = lastContactDate 
                ? (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60)
                : Infinity;
              // Check for no upcoming tasks (past due tasks are allowed)
              const hasNoUpcomingTasks = !lead.tasks || !lead.tasks.some((t: any) => 
                t.status === 'OPEN' && new Date(t.dueAt) > now
              );
              const noCommNoTasks = hoursSinceLastContact >= 36 && hasNoUpcomingTasks;
              
              // Criterion 3: Any past due task for this user
              const hasPastDueTask = lead.tasks?.some((t: any) => {
                if (t.status !== 'OPEN') return false;
                if (t.assignedToId !== filters.userId) return false;
                const dueDate = new Date(t.dueAt);
                return dueDate < now;
              }) || false;
              
              // Criterion 4: Unread communications
              const hasUnreadComms = lead.unreadCount > 0;
              
              meetsAcqCriteria = isNewLeadStage || noCommNoTasks || hasPastDueTask || hasUnreadComms;
            }
          }
          
          // Lead passes if it meets ANY role's criteria (combined approach)
          return meetsAdminCriteria || meetsManagerCriteria || meetsAcqCriteria;
        });
        
        console.log(`🔍 Post-fetch filter: ${filteredLeads.length} leads match needs attention criteria`);
        
        return filteredLeads.sort((a: any, b: any) => {
          const aStageIndex = stageOrderIndexByLeadId.get(a.id) ?? 0;
          const bStageIndex = stageOrderIndexByLeadId.get(b.id) ?? 0;
          if (aStageIndex !== bStageIndex) return aStageIndex - bStageIndex;
          const aAt = new Date(a.lastActivityAt).getTime();
          const bAt = new Date(b.lastActivityAt).getTime();
          if (aAt !== bAt) return bAt - aAt; // DESC: most recent first
          return String(a.id).localeCompare(String(b.id));
        });
      }

      // Final sort: stage order asc, lastActivityAt desc (most recently touched at top)
      return transformedLeads.sort((a: any, b: any) => {
        const aStageIndex = stageOrderIndexByLeadId.get(a.id) ?? 0;
        const bStageIndex = stageOrderIndexByLeadId.get(b.id) ?? 0;
        if (aStageIndex !== bStageIndex) return aStageIndex - bStageIndex;
        const aAt = new Date(a.lastActivityAt).getTime();
        const bAt = new Date(b.lastActivityAt).getTime();
        if (aAt !== bAt) return bAt - aAt; // DESC: most recent first
        return String(a.id).localeCompare(String(b.id));
      });
    } catch (error: any) {
      logger.error({ pipelineKey, filters, error: error.message }, 'Error getting pipeline leads');
      throw error;
    }
  },

  /**
   * Compute previous/next lead IDs in the same order as Pipeline view.
   * For multiple pipeline keys (Admin/Manager combined view), results are concatenated in the given pipelineKeys order.
   */
  async getPipelineLeadNav(pipelineKeys: string[], currentLeadId: string, filters: PipelineLeadFilters = {}) {
    const keys = (pipelineKeys || []).map((k) => k.toUpperCase()).filter(Boolean);
    if (!keys.length) {
      return { prevLeadId: null as string | null, nextLeadId: null as string | null };
    }

    const lists = await Promise.all(keys.map((k) => this.getPipelineLeads(k, filters)));
    const orderedLeadIds = lists.flat().map((l: any) => l.id).filter(Boolean);

    const idx = orderedLeadIds.indexOf(currentLeadId);
    if (idx === -1) {
      return { prevLeadId: null as string | null, nextLeadId: null as string | null };
    }

    return {
      prevLeadId: idx > 0 ? orderedLeadIds[idx - 1] : null,
      nextLeadId: idx < orderedLeadIds.length - 1 ? orderedLeadIds[idx + 1] : null,
    };
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
        logger.error({ 
          stageId, 
          leadId,
          stageIdType: typeof stageId,
          stageIdLength: stageId?.length 
        }, 'Pipeline stage not found - cannot move lead');
        
        // Try to find a similar stage by name or list available stages
        const allStages = await prisma.pipelineStage.findMany({
          select: { id: true, name: true, pipelineId: true }
        });
        
        logger.error({ 
          count: allStages.length,
          stages: allStages.map(s => ({ id: s.id, name: s.name }))
        }, 'Available stages in database');
        
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

      // CRITICAL:
      // Route all pipeline moves through leadService.changeStage so we consistently:
      // - validate transition
      // - set offerMadeAt / underContractAt (timeline dates)
      // - merge customFields safely
      // - update deal timestamps
      // - set stageEnteredAt + stageHistory via leadRepository.changeStage
      const updatedLead = await leadService.changeStage(leadId, stageId, userId);

      logger.info({ 
        leadId, 
        stageId, 
        stageName: stage.name, 
        userId 
      }, 'Lead moved to new stage');

      return {
        leadId,
        newStageId: stageId,
        newStageName: stage.name,
        updatedAt: (updatedLead as any)?.updatedAt || new Date()
      };
    } catch (error: any) {
      logger.error({ 
        leadId, 
        stageId, 
        userId, 
        error: error.message,
        stack: error.stack,
        code: error.code
      }, 'Error moving lead to stage');
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
      logger.error({ pipelineKey, error: error.message }, 'Error getting pipeline stats');
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
      logger.error({ pipelineKey, error: error.message }, 'Error getting needs attention leads');
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
      const lastContactDate = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
      const hoursSinceLastContact = lastContactDate 
        ? Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60))
        : Infinity;
      
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
      logger.error({ error }, 'Error fetching lead sources');
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

      logger.info({ stageId, allowedRoles }, 'Stage role permissions updated');
    } catch (error: any) {
      logger.error({ stageId, error: error.message }, 'Error updating stage role permissions');
      throw error;
    }
  }
};
