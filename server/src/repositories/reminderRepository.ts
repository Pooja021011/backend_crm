import { prisma } from '../config/db.js';
import { RoleName } from '@prisma/client';

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
  lead?: any;
  communication?: any;
}

export const reminderRepository = {
  /**
   * Get role-specific reminders for a user
   */
  async getRoleBasedReminders(userId: string, userRoles: RoleName[]): Promise<ReminderAlert[]> {
    const reminders: ReminderAlert[] = [];
    const now = new Date();

    // Helper function to add hours to current time
    const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
    const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    try {
      // MANAGER / ADMIN - ACQ agents' leads with tasks overdue 1h+ OR untouched 48h+
      // Priority: Task overdue (1h) checked first, then untouched (48h)
      if (userRoles.includes('MANAGER') || userRoles.includes('ADMIN')) {
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
            OR: [
              // Condition 1: Lead untouched 48h+
              {
                lastContactAt: {
                  lte: hoursAgo(48)
                }
              },
              {
                lastContactAt: null,
                createdAt: {
                  lte: hoursAgo(48)
                }
              },
              // Condition 2: Lead has task overdue 1h+
              {
                tasks: {
                  some: {
                    status: 'OPEN',
                    dueAt: {
                      lte: hoursAgo(1)
                    },
                    NOT: {
                      OR: [
                        { title: { startsWith: 'Review note on ' } },
                        { title: { startsWith: 'Underwrite ' } },
                        { title: { startsWith: 'Make Offer on ' } }
                      ]
                    }
                  }
                }
              }
            ]
          },
          include: {
            address: true,
            assignedUser: true,
            pipelineStage: true,
            tasks: {
              where: {
                status: 'OPEN',
                dueAt: {
                  lte: hoursAgo(1)
                },
                NOT: {
                  OR: [
                    { title: { startsWith: 'Review note on ' } },
                    { title: { startsWith: 'Underwrite ' } },
                    { title: { startsWith: 'Make Offer on ' } }
                  ]
                }
              },
              orderBy: { dueAt: 'asc' },
              include: {
                assignedTo: true
              }
            }
          }
        });

        managerLeads.forEach(lead => {
          // Skip if this is user's own lead and user is also ACQ (will be handled in ACQ block)
          if (userRoles.includes('ACQ') && lead.assignedUserId === userId) {
            return;
          }

          const lastContact = lead.lastContactAt || lead.createdAt;
          const hoursUntouched = Math.floor((now.getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60));
          const isUntouched = hoursUntouched >= 48;
          const hasOverdueTask = lead.tasks && lead.tasks.length > 0;

          // Priority: Task overdue (lowest time: 1h) comes BEFORE untouched (48h)
          if (hasOverdueTask) {
            // Primary: Task overdue
            const task = lead.tasks[0]; // Most overdue task
            const hoursOverdue = Math.floor((now.getTime() - new Date(task.dueAt).getTime()) / (1000 * 60 * 60));
            
            reminders.push({
              id: `manager-lead-${lead.id}`,
              type: 'TASK_OVERDUE',
              priority: hoursOverdue >= 24 ? 'URGENT' : 'HIGH',
              title: 'Task Overdue',
              description: `"${task.title}" for ${lead.address?.address1 || 'lead'} is ${hoursOverdue}h overdue (assigned to ${task.assignedTo?.firstName} ${task.assignedTo?.lastName})` +
                           (isUntouched ? ` (lead also untouched ${hoursUntouched}h)` : ''),
              leadId: lead.id,
              createdAt: now,
              lead: lead
            });
          } else if (isUntouched) {
            // Only untouched (no overdue task)
            reminders.push({
              id: `manager-lead-${lead.id}`,
              type: 'LEAD_UNTOUCHED',
              priority: 'HIGH',
              title: 'Lead Untouched 48h+',
              description: `Lead at ${lead.address?.address1 || 'Unknown address'} hasn't been contacted by ${lead.assignedUser?.firstName} ${lead.assignedUser?.lastName} in ${hoursUntouched} hours`,
              leadId: lead.id,
              createdAt: now,
              lead: lead
            });
          }
        });
      }

      // ACQUISITIONS AGENT - Own leads with tasks overdue 30min+ OR untouched 36h+
      // Priority: Task overdue (30min) checked first, then untouched (36h)
      if (userRoles.includes('ACQ')) {
        // Get own leads that match EITHER condition
        const acqLeads = await prisma.lead.findMany({
          where: {
            assignedUserId: userId,
            OR: [
              // Condition 1: Lead untouched 36h+
              {
                lastContactAt: {
                  lte: hoursAgo(36)
                }
              },
              {
                lastContactAt: null,
                createdAt: {
                  lte: hoursAgo(36)
                }
              },
              // Condition 2: Lead has task overdue 30min+
              {
                tasks: {
                  some: {
                    assignedToId: userId,
                    status: 'OPEN',
                    dueAt: {
                      lte: new Date(now.getTime() - 30 * 60 * 1000)
                    },
                    NOT: {
                      OR: [
                        { title: { startsWith: 'Review note on ' } },
                        { title: { startsWith: 'Underwrite ' } },
                        { title: { startsWith: 'Make Offer on ' } }
                      ]
                    }
                  }
                }
              }
            ]
          },
          include: {
            address: true,
            pipelineStage: true,
            tasks: {
              where: {
                assignedToId: userId,
                status: 'OPEN',
                dueAt: {
                  lte: new Date(now.getTime() - 30 * 60 * 1000)
                },
                NOT: {
                  OR: [
                    { title: { startsWith: 'Review note on ' } },
                    { title: { startsWith: 'Underwrite ' } },
                    { title: { startsWith: 'Make Offer on ' } }
                  ]
                }
              },
              orderBy: { dueAt: 'asc' }
            }
          }
        });

        acqLeads.forEach(lead => {
          const lastContact = lead.lastContactAt || lead.createdAt;
          const hoursUntouched = Math.floor((now.getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60));
          const isUntouched = hoursUntouched >= 36;
          const hasOverdueTask = lead.tasks && lead.tasks.length > 0;

          // Priority: Task overdue (lowest time: 30min) comes BEFORE untouched (36h)
          if (hasOverdueTask) {
            // Primary: Task overdue
            const task = lead.tasks[0]; // Most overdue task
            const minutesOverdue = Math.floor((now.getTime() - new Date(task.dueAt).getTime()) / (1000 * 60));
            
            reminders.push({
              id: `acq-lead-${lead.id}`,
              type: 'TASK_OVERDUE',
              priority: minutesOverdue >= 120 ? 'URGENT' : 'HIGH',
              title: 'Task Past Due',
              description: `"${task.title}" for ${lead.address?.address1 || 'lead'} is ${minutesOverdue} minutes overdue` +
                           (isUntouched ? ` (lead also untouched ${hoursUntouched}h)` : ''),
              leadId: lead.id,
              createdAt: now,
              lead: lead
            });
          } else if (isUntouched) {
            // Only untouched (no overdue task)
            reminders.push({
              id: `acq-lead-${lead.id}`,
              type: 'LEAD_UNTOUCHED',
              priority: 'HIGH',
              title: 'Lead Untouched 36h+',
              description: `Your lead at ${lead.address?.address1 || 'Unknown address'} needs follow-up (last contact ${hoursUntouched}h ago)`,
              leadId: lead.id,
              createdAt: now,
              lead: lead
            });
          }
        });
      }

      // DISPOSITIONS AGENT - Leads untouched 36h, due diligence < 3-5 days
      if (userRoles.includes('DISP')) {
        // Leads untouched 36h
        const untouchedLeads = await prisma.lead.findMany({
          where: {
            assignedUserId: userId,
            lastContactAt: {
              lte: hoursAgo(36)
            }
          },
          include: {
            address: true,
            pipelineStage: true
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
            }
          },
          include: {
            address: true,
            pipelineStage: true
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
            lead: lead
          });
        });
      }

      // TRANSACTION COORDINATOR - Contracts closing within 2 days, unanswered comms
      if (userRoles.includes('TC')) {
        // Contracts closing within 2 days
        const closingSoonLeads = await prisma.lead.findMany({
          where: {
            deal: {
              closedAt: {
                gte: now,
                lte: daysFromNow(2)
              }
            }
          },
          include: {
            address: true,
            deal: true,
            pipelineStage: true
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
                address: true
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
            lead: comm.lead,
            communication: comm
          });
        });
      }

      return reminders.sort((a, b) => {
        // Sort by priority: URGENT > HIGH > MEDIUM > LOW
        const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

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
