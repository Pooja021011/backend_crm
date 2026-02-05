import { prisma } from '../config/db.js';
import { RoleName, TaskStatus } from '@prisma/client';

export interface ReminderAlert {
  id: string;
  type: 'LEAD_UNTOUCHED' | 'DUE_DILIGENCE' | 'NEW_CONTRACT' | 'CLOSING_SOON' | 'UNANSWERED_COMM' | 'TASK_OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  description: string;
  leadId?: string;
  communicationId?: string;
  dueDate?: Date;
  createdAt: Date;
  status?: 'PENDING' | 'COMPLETED';
  lead?: any;
  communication?: any;
}

export const reminderRepository = {
  /**
   * Get role-specific reminders for a user
   */
  async getRoleBasedReminders(userId: string, userRoles: RoleName[]): Promise<ReminderAlert[]> {
    console.log('[Reminder Repository] getRoleBasedReminders called');
    console.log('[Reminder Repository] userId:', userId);
    console.log('[Reminder Repository] userRoles:', userRoles);
    console.log('[Reminder Repository] userRoles.includes("ACQ"):', userRoles.includes('ACQ'));
    
    const reminders: ReminderAlert[] = [];
    const now = new Date();

    // Helper function to add hours to current time
    const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
    const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    try {
      // Apply same date filter as Tasks tab (Jan 20, 2026) for consistency across all roles
      const tasksCutoffDate = new Date(2026, 0, 20); // Jan 20, 2026 - same as frontend Tasks tab
      
      // Role-based reminders with priority: MANAGER > ACQ > DISP > TC
      // If user has multiple roles, only highest priority role's reminders will be shown
      
      // MANAGER - ACQ agents' leads with tasks overdue 6h+ OR untouched 48h+
      // Priority: Task overdue (6h) checked first, then untouched (48h)
      // Note: ADMIN role does not receive reminders
      if (userRoles.includes('MANAGER')) {
        // Collect lead IDs that will be shown in ACQ reminders (to avoid duplicates)
        const acqLeadIds = new Set<string>();
        
        // First, collect all ACQ lead IDs from the ACQ block if user is also ACQ
        // This will be populated after ACQ block runs, so we'll filter at the end
        
        // Get all ACQ agents' leads that match EITHER condition
        const managerLeads = await prisma.lead.findMany({
          where: {
            assignedUser: {
              roles: {
                some: {
                  role: {
                    name: 'ACQ'
                  }
                }
              }
            },
            // Exclude leads with "dead" status (ONLY for reminders tab)
            leadStatus: {
              NOT: {
                name: {
                  equals: 'dead',
                  mode: 'insensitive'
                }
              }
            },
            OR: [
              // Condition 1: Lead untouched 48h+ (use updatedAt - any update resets the timer)
              {
                updatedAt: {
                  lte: hoursAgo(48)
                }
              },
              // Condition 2: Lead has task overdue 6h+ (with date filter, excluding auto-created tasks)
              {
                tasks: {
                  some: {
                    status: TaskStatus.OPEN,
                    dueAt: {
                      lte: hoursAgo(6),
                      gte: tasksCutoffDate // Only show tasks due >= Jan 20, 2026 (same as Tasks tab)
                    },
                    // Exclude auto-created tasks
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
            ]
          },
          include: {
            address: true,
            assignedUser: true,
            pipelineStage: true,
            leadStatus: true,
            tasks: {
              where: {
                status: TaskStatus.OPEN,
                dueAt: {
                  lte: hoursAgo(6),
                  gte: tasksCutoffDate // Only show tasks due >= Jan 20, 2026 (same as Tasks tab)
                },
                // Exclude auto-created tasks
                NOT: [
                  { title: { startsWith: 'Review note on ' } },
                  { title: { startsWith: 'Underwrite ' } },
                  { title: { startsWith: 'Make Offer on ' } },
                  { title: { startsWith: 'Follow Up With ' } },
                  { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
                  { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
                  { title: { startsWith: 'Check Voided Contract With ' } }
                ]
              },
              orderBy: { dueAt: 'asc' },
              include: {
                assignedTo: true
              }
            }
          }
        });

        managerLeads.forEach(lead => {
          // Use updatedAt - any update to the lead (like source change) resets the timer
          const lastUpdate = lead.updatedAt;
          const hoursUntouched = Math.floor((now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60));
          const isUntouched = hoursUntouched >= 48;
          
          // Filter tasks to only those assigned to the ACQ agent (lead owner)
          const acqAgentTasks = lead.tasks?.filter(task => task.assignedToId === lead.assignedUserId) || [];
          const hasOverdueTask = acqAgentTasks.length > 0;
          
          console.log(`[Manager/Admin Reminders] Lead ${lead.id}: ACQ agent tasks overdue 6h+ = ${acqAgentTasks.length}, untouched 48h+ = ${isUntouched}`);

          // Priority: Task overdue (6h) comes BEFORE untouched (48h)
          if (hasOverdueTask) {
            // Primary: Task overdue - task assigned to ACQ agent
            const task = acqAgentTasks[0]; // Most overdue task assigned to ACQ agent
            const hoursOverdue = Math.floor((now.getTime() - new Date(task.dueAt).getTime()) / (1000 * 60 * 60));
            
            reminders.push({
              id: `manager-lead-${lead.id}`,
              type: 'TASK_OVERDUE',
              priority: hoursOverdue >= 24 ? 'URGENT' : 'HIGH',
              title: 'Task overdue 6h+',
              description: 'Task overdue 6h+' +
                           (isUntouched ? ` (lead also untouched ${hoursUntouched}h)` : ''),
              leadId: lead.id,
              createdAt: now,
              status: 'PENDING',
              lead: lead
            });
          } else if (isUntouched) {
            // Only untouched (no overdue task)
            reminders.push({
              id: `manager-lead-${lead.id}`,
              type: 'LEAD_UNTOUCHED',
              priority: 'HIGH',
              title: 'Lead Untouched 48h+',
              description: `Lead at ${lead.address?.address1 || 'Unknown address'} hasn't been updated in ${hoursUntouched} hours (assigned to ${lead.assignedUser?.firstName} ${lead.assignedUser?.lastName})`,
              leadId: lead.id,
              createdAt: now,
              status: 'PENDING',
              lead: lead
            });
          }
        });
      } else if (userRoles.includes('ACQ')) {
        // ACQUISITIONS AGENT - Own leads with tasks overdue 4h+ OR untouched 36h+
        // Priority: Task overdue (4h) checked first, then untouched (36h)
        console.log(`[ACQ Reminders] ACQ role found! User ID: ${userId}, Roles:`, userRoles);
        
        // Step 1: Get ALL overdue tasks for user (4h+)
        // Using tasksCutoffDate declared at top for consistency
        // Exclude auto-created tasks (note mentions, stage transitions, etc.) - same as frontend Tasks tab
        const overdueTasks = await prisma.task.findMany({
          where: {
            assignedToId: userId,
            status: TaskStatus.OPEN,
            dueAt: {
              lte: hoursAgo(4),
              gte: tasksCutoffDate // Only show tasks due >= Jan 20, 2026 (same as Tasks tab)
            },
            // Exclude auto-created tasks (note mentions, stage transitions, DocuSign, etc.)
            NOT: [
              { title: { startsWith: 'Review note on ' } },
              { title: { startsWith: 'Underwrite ' } },
              { title: { startsWith: 'Make Offer on ' } },
              { title: { startsWith: 'Follow Up With ' } },
              { title: { startsWith: 'Contract Sent - Awaiting Signature for ' } },
              { title: { startsWith: 'URGENT: DocuSign Failed for ' } },
              { title: { startsWith: 'Check Voided Contract With ' } }
            ],
            // Exclude tasks for leads with "dead" status (ONLY for reminders tab)
            lead: {
              leadStatus: {
                NOT: {
                  name: {
                    equals: 'dead',
                    mode: 'insensitive'
                  }
                }
              }
            }
          },
          include: {
            lead: {
              include: {
                address: true,
                pipelineStage: true,
                leadStatus: true
              }
            }
          },
          orderBy: { dueAt: 'asc' }
        });
        
        console.log(`[ACQ Reminders] Found ${overdueTasks.length} overdue tasks (4h+)`);
        
        // Create reminders for overdue tasks
        const taskLeadIds = new Set<string>();
        overdueTasks.forEach(task => {
          taskLeadIds.add(task.leadId);
          const hoursOverdue = Math.floor((now.getTime() - new Date(task.dueAt).getTime()) / (1000 * 60 * 60));
          
          reminders.push({
            id: `acq-task-${task.id}`,
            type: 'TASK_OVERDUE',
            priority: hoursOverdue >= 24 ? 'URGENT' : 'HIGH',
            title: 'Task overdue 4h+',
            description: 'Task overdue 4h+',
            leadId: task.leadId,
            createdAt: now,
            status: 'PENDING',
            lead: task.lead
          });
        });
        
        console.log(`[ACQ Reminders] Created ${overdueTasks.length} TASK_OVERDUE reminders`);
        
        // Step 2: Get assigned/created leads that are untouched 36h+ (excluding leads with overdue tasks)
        const untouchedLeads = await prisma.lead.findMany({
          where: {
            AND: [
              {
                OR: [
                  { assignedUserId: userId },
                  { createdById: userId }
                ]
              },
              {
                NOT: {
                  id: { in: Array.from(taskLeadIds) } // Exclude leads that already have overdue task reminders
                }
              },
              {
                // Use updatedAt - any update to the lead (like source change) resets the timer
                updatedAt: {
                  lte: hoursAgo(36)
                }
              },
              // Exclude leads with "dead" status (ONLY for reminders tab)
              {
                leadStatus: {
                  NOT: {
                    name: {
                      equals: 'dead',
                      mode: 'insensitive'
                    }
                  }
                }
              }
            ]
          },
          include: {
            address: true,
            pipelineStage: true,
            leadStatus: true
          }
        });
        
        console.log(`[ACQ Reminders] Found ${untouchedLeads.length} untouched leads (36h+)`);
        
        // Create reminders for untouched leads
        untouchedLeads.forEach(lead => {
          // Use updatedAt - any update to the lead (like source change) resets the timer
          const lastUpdate = lead.updatedAt;
          const hoursUntouched = Math.floor((now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60));
          
          reminders.push({
            id: `acq-untouched-${lead.id}`,
            type: 'LEAD_UNTOUCHED',
            priority: 'HIGH',
            title: 'Lead Untouched 36h+',
            description: `Your lead at ${lead.address?.address1 || 'Unknown address'} needs follow-up (last updated ${hoursUntouched}h ago)`,
            leadId: lead.id,
            createdAt: now,
            status: 'PENDING',
            lead: lead
          });
        });
        
        console.log(`[ACQ Reminders] Created ${untouchedLeads.length} LEAD_UNTOUCHED reminders`);
        console.log(`[ACQ Reminders] Total reminders: ${reminders.length}`);
      } else if (userRoles.includes('DISP')) {
        // DISPOSITIONS AGENT - Leads untouched 36h, due diligence < 3-5 days
        // Leads untouched 36h
        const untouchedLeads = await prisma.lead.findMany({
          where: {
            assignedUserId: userId,
            lastContactAt: {
              lte: hoursAgo(36)
            },
            // Exclude leads with "dead" status (ONLY for reminders tab)
            leadStatus: {
              NOT: {
                name: {
                  equals: 'dead',
                  mode: 'insensitive'
                }
              }
            }
          },
          include: {
            address: true,
            pipelineStage: true,
            leadStatus: true
          }
        });

        untouchedLeads.forEach(lead => {
          reminders.push({
            id: `disp-untouched-${lead.id}`,
            type: 'LEAD_UNTOUCHED',
            priority: 'HIGH',
            title: 'Lead Untouched 36h+',
            description: `Your lead at ${lead.address?.address1 || 'Unknown address'} needs attention (${Math.floor((now.getTime() - new Date(lead.lastContactAt || lead.createdAt).getTime()) / (1000 * 60 * 60))}h ago)`,
            leadId: lead.id,
            createdAt: now,
            status: 'PENDING',
            lead: lead
          });
        });

        // Due diligence 3-5 days
        const dueDiligenceLeads = await prisma.lead.findMany({
          where: {
            assignedUserId: userId,
            pipelineStage: {
              name: { contains: 'Due Diligence', mode: 'insensitive' }
            },
            stageEnteredAt: {
              gte: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
              lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)  // 3 days ago
            },
            // Exclude leads with "dead" status (ONLY for reminders tab)
            leadStatus: {
              NOT: {
                name: {
                  equals: 'dead',
                  mode: 'insensitive'
                }
              }
            }
          },
          include: {
            address: true,
            pipelineStage: true,
            leadStatus: true
          }
        });

        dueDiligenceLeads.forEach(lead => {
          reminders.push({
            id: `disp-due-diligence-${lead.id}`,
            type: 'DUE_DILIGENCE',
            priority: 'URGENT',
            title: 'Due Diligence Alert',
            description: `Due diligence for ${lead.address?.address1 || 'Unknown address'} is ${Math.floor((now.getTime() - new Date(lead.stageEnteredAt || lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days old`,
            leadId: lead.id,
            createdAt: now,
            status: 'PENDING',
            lead: lead
          });
        });
      } else if (userRoles.includes('TC')) {
        // TRANSACTION COORDINATOR - Contracts closing within 2 days, unanswered comms
        // Contracts closing within 2 days
        const closingSoonLeads = await prisma.lead.findMany({
          where: {
            deal: {
              closedAt: {
                gte: now,
                lte: daysFromNow(2)
              }
            },
            // Exclude leads with "dead" status (ONLY for reminders tab)
            leadStatus: {
              NOT: {
                name: {
                  equals: 'dead',
                  mode: 'insensitive'
                }
              }
            }
          },
          include: {
            address: true,
            deal: true,
            pipelineStage: true,
            leadStatus: true
          }
        });

        closingSoonLeads.forEach(lead => {
          const daysUntilClosing = Math.ceil((new Date(lead.deal?.closedAt || now).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          reminders.push({
            id: `closing-soon-${lead.id}`,
            type: 'CLOSING_SOON',
            priority: 'URGENT',
            title: 'Closing Soon',
            description: `${lead.address?.address1 || 'Unknown address'} closes in ${daysUntilClosing} day${daysUntilClosing !== 1 ? 's' : ''}`,
            leadId: lead.id,
            dueDate: new Date(lead.deal?.closedAt || now),
            createdAt: now,
            status: 'PENDING',
            lead: lead
          });
        });

        // Unanswered communications (2/16h - using 16h for now)
        const unansweredComms = await prisma.communication.findMany({
          where: {
            direction: 'INBOUND',
            occurredAt: {
              lte: hoursAgo(16)
            },
            // Assuming we have a responded field or can check for outbound response
            lead: {
              // Exclude communications for leads with "dead" status (ONLY for reminders tab)
              leadStatus: {
                NOT: {
                  name: {
                    equals: 'dead',
                    mode: 'insensitive'
                  }
                }
              },
              communications: {
                none: {
                  direction: 'OUTBOUND',
                  occurredAt: {
                    gte: hoursAgo(16)
                  }
                }
              }
            }
          },
          include: {
            lead: {
              include: {
                address: true,
                leadStatus: true
              }
            }
          },
          take: 50 // Limit to avoid too many alerts
        });

        unansweredComms.forEach(comm => {
          reminders.push({
            id: `unanswered-${comm.id}`,
            type: 'UNANSWERED_COMM',
            priority: 'HIGH',
            title: 'Unanswered Communication',
            description: `${comm.type} from ${comm.lead?.address?.address1 || 'Unknown'} needs response (${Math.floor((now.getTime() - new Date(comm.occurredAt).getTime()) / (1000 * 60 * 60))}h ago)`,
            leadId: comm.leadId,
            communicationId: comm.id,
            createdAt: now,
            status: 'PENDING',
            lead: comm.lead,
            communication: comm
          });
        });
      }

      const sortedReminders = reminders.sort((a, b) => {
        // Sort by priority: URGENT > HIGH > MEDIUM > LOW
        const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      console.log(`[Reminder Repository] FINAL: Returning ${sortedReminders.length} total reminders`);
      console.log(`[Reminder Repository] Breakdown: TASK_OVERDUE=${sortedReminders.filter(r => r.type === 'TASK_OVERDUE').length}, LEAD_UNTOUCHED=${sortedReminders.filter(r => r.type === 'LEAD_UNTOUCHED').length}, Others=${sortedReminders.filter(r => !['TASK_OVERDUE', 'LEAD_UNTOUCHED'].includes(r.type)).length}`);
      
      return sortedReminders;

    } catch (error) {
      console.error('Error fetching role-based reminders:', error);
      return [];
    }
  },

  /**
   * Get reminder counts by type for dashboard
   */
  async getReminderCounts(userId: string, userRoles: RoleName[]) {
    const reminders = await this.getRoleBasedReminders(userId, userRoles);
    
    const counts = {
      total: reminders.length,
      urgent: reminders.filter(r => r.priority === 'URGENT').length,
      high: reminders.filter(r => r.priority === 'HIGH').length,
      medium: reminders.filter(r => r.priority === 'MEDIUM').length,
      low: reminders.filter(r => r.priority === 'LOW').length,
      byType: {
        LEAD_UNTOUCHED: reminders.filter(r => r.type === 'LEAD_UNTOUCHED').length,
        DUE_DILIGENCE: reminders.filter(r => r.type === 'DUE_DILIGENCE').length,
        NEW_CONTRACT: reminders.filter(r => r.type === 'NEW_CONTRACT').length,
        CLOSING_SOON: reminders.filter(r => r.type === 'CLOSING_SOON').length,
        UNANSWERED_COMM: reminders.filter(r => r.type === 'UNANSWERED_COMM').length,
      }
    };

    return counts;
  }
};
