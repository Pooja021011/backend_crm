import { prisma } from '../config/db.js';
import { RoleName } from '@prisma/client';

export interface ReminderAlert {
  id: string;
  type: 'LEAD_UNTOUCHED' | 'DUE_DILIGENCE' | 'NEW_CONTRACT' | 'CLOSING_SOON' | 'UNANSWERED_COMM';
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
      // ADMIN / EXECUTIVE - Generic reminders (TBD for now)
      if (userRoles.includes('ADMIN') || userRoles.includes('EXECUTIVE')) {
        // Placeholder for generic reminders
        // Could add system-wide alerts, overdue reports, etc.
      }

      // MANAGER - Leads untouched 42-54h, due diligence < 3 days, new contracts
      if (userRoles.includes('MANAGER')) {
        // Leads untouched in 42-54h
        const untouchedLeads = await prisma.lead.findMany({
          where: {
            lastContactAt: {
              gte: hoursAgo(54),
              lte: hoursAgo(42)
            },
            assignedUser: {
              roles: {
                some: {
                  role: {
                    name: { in: ['ACQ', 'DISP'] }
                  }
                }
              }
            }
          },
          include: {
            address: true,
            assignedUser: true,
            pipelineStage: true
          }
        });

        untouchedLeads.forEach(lead => {
          reminders.push({
            id: `untouched-${lead.id}`,
            type: 'LEAD_UNTOUCHED',
            priority: 'HIGH',
            title: 'Lead Untouched 42-54h',
            description: `Lead at ${lead.address?.address1 || 'Unknown address'} hasn't been contacted in ${Math.floor((now.getTime() - new Date(lead.lastContactAt || lead.createdAt).getTime()) / (1000 * 60 * 60))} hours`,
            leadId: lead.id,
            createdAt: now,
            lead: lead
          });
        });

        // Due diligence < 3 days
        const dueDiligenceLeads = await prisma.lead.findMany({
          where: {
            pipelineStage: {
              name: { contains: 'Due Diligence', mode: 'insensitive' }
            },
            stageEnteredAt: {
              lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
            }
          },
          include: {
            address: true,
            assignedUser: true,
            pipelineStage: true
          }
        });

        dueDiligenceLeads.forEach(lead => {
          reminders.push({
            id: `due-diligence-${lead.id}`,
            type: 'DUE_DILIGENCE',
            priority: 'URGENT',
            title: 'Due Diligence Overdue',
            description: `Lead at ${lead.address?.address1 || 'Unknown address'} has been in due diligence for ${Math.floor((now.getTime() - new Date(lead.stageEnteredAt || lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days`,
            leadId: lead.id,
            createdAt: now,
            lead: lead
          });
        });

        // New contracts (last 24h)
        const newContracts = await prisma.lead.findMany({
          where: {
            pipelineStage: {
              name: { contains: 'Contract', mode: 'insensitive' }
            },
            stageEnteredAt: {
              gte: hoursAgo(24)
            }
          },
          include: {
            address: true,
            assignedUser: true,
            pipelineStage: true
          }
        });

        newContracts.forEach(lead => {
          reminders.push({
            id: `new-contract-${lead.id}`,
            type: 'NEW_CONTRACT',
            priority: 'MEDIUM',
            title: 'New Contract',
            description: `New contract for ${lead.address?.address1 || 'Unknown address'} entered ${Math.floor((now.getTime() - new Date(lead.stageEnteredAt || lead.createdAt).getTime()) / (1000 * 60 * 60))} hours ago`,
            leadId: lead.id,
            createdAt: now,
            lead: lead
          });
        });
      }

      // ACQUISITIONS AGENT - Leads not touched in 36h
      if (userRoles.includes('ACQ')) {
        const untouchedLeads = await prisma.lead.findMany({
          where: {
            leadType: 'SELLER',
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
            id: `acq-untouched-${lead.id}`,
            type: 'LEAD_UNTOUCHED',
            priority: 'HIGH',
            title: 'Lead Untouched 36h+',
            description: `Your lead at ${lead.address?.address1 || 'Unknown address'} needs follow-up (${Math.floor((now.getTime() - new Date(lead.lastContactAt || lead.createdAt).getTime()) / (1000 * 60 * 60))}h ago)`,
            leadId: lead.id,
            createdAt: now,
            lead: lead
          });
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
