import { prisma } from '../config/db.js';
import { RoleName } from '@prisma/client';

export interface NotificationData {
  type: 'NEW_CONTRACT' | 'NEW_LEAD' | 'NEW_DEAL_ASSIGNED';
  title: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  targetRoles?: RoleName[];
  targetUserId?: string;
  leadId?: string;
  dealId?: string;
  triggeredBy?: string;
  data?: any;
}

export const notificationService = {
  /**
   * Create a new notification
   */
  async createNotification(notificationData: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          priority: notificationData.priority || 'MEDIUM',
          targetRoles: notificationData.targetRoles || [],
          targetUserId: notificationData.targetUserId,
          leadId: notificationData.leadId,
          dealId: notificationData.dealId,
          triggeredBy: notificationData.triggeredBy,
          data: notificationData.data || {}
        }
      });

      console.log(`📢 Notification created: ${notification.type} - ${notification.title}`);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  },

  /**
   * Get notifications for a user (by user ID or roles)
   */
  async getUserNotifications(userId: string, userRoles: RoleName[]) {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { targetUserId: userId },
            { targetRoles: { hasSome: userRoles } }
          ]
        },
        include: {
          lead: {
            include: {
              address: true,
              seller: true,
              buyer: true
            }
          },
          deal: true,
          triggeredUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Limit to recent 50 notifications
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: { 
          id: notificationId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  },

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, userRoles: RoleName[]) {
    try {
      const count = await prisma.notification.count({
        where: {
          isRead: false,
          OR: [
            { targetUserId: userId },
            { targetRoles: { hasSome: userRoles } }
          ]
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  /**
   * Event handlers for creating notifications
   */
  
  /**
   * NEW_CONTRACT: Notify Manager and Transaction Coordinator
   */
  async notifyNewContract(leadId: string, triggeredBy: string) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          address: true,
          seller: true,
          pipelineStage: true
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const address = lead.address?.address1 || 'Unknown address';
      const sellerName = lead.seller ? `${lead.seller.firstName} ${lead.seller.lastName}` : 'Unknown seller';

      await this.createNotification({
        type: 'NEW_CONTRACT',
        title: 'New Contract',
        message: `New contract for ${address} (${sellerName}) has been created`,
        priority: 'HIGH',
        targetRoles: ['MANAGER', 'TC'],
        leadId: leadId,
        triggeredBy: triggeredBy,
        data: {
          address,
          sellerName,
          stageName: lead.pipelineStage?.name
        }
      });
    } catch (error) {
      console.error('Error notifying new contract:', error);
    }
  },

  /**
   * NEW_LEAD: Notify appropriate agents based on lead type
   */
  async notifyNewLead(leadId: string, triggeredBy: string) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          address: true,
          seller: true,
          buyer: true
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const address = lead.address?.address1 || 'Unknown address';
      let targetRoles: RoleName[] = [];
      let message = '';

      if (lead.leadType === 'SELLER') {
        targetRoles = ['ACQ']; // Acquisitions Agent
        const sellerName = lead.seller ? `${lead.seller.firstName} ${lead.seller.lastName}` : 'Unknown seller';
        message = `New seller lead: ${address} (${sellerName})`;
      } else if (lead.leadType === 'BUYER') {
        targetRoles = ['DISP']; // Dispositions Agent
        const buyerName = lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : 'Unknown buyer';
        message = `New buyer lead: ${buyerName}`;
      }

      if (targetRoles.length > 0) {
        await this.createNotification({
          type: 'NEW_LEAD',
          title: 'New Lead',
          message: message,
          priority: 'MEDIUM',
          targetRoles: targetRoles,
          leadId: leadId,
          triggeredBy: triggeredBy,
          data: {
            address,
            leadType: lead.leadType
          }
        });
      }
    } catch (error) {
      console.error('Error notifying new lead:', error);
    }
  },

  /**
   * NEW_DEAL_ASSIGNED: Notify Dispositions Agent
   */
  async notifyNewDealAssigned(leadId: string, assignedUserId: string, triggeredBy: string) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          address: true,
          seller: true,
          assignedUser: true
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const address = lead.address?.address1 || 'Unknown address';
      const assignedUserName = lead.assignedUser ? 
        `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : 
        'Unknown user';

      await this.createNotification({
        type: 'NEW_DEAL_ASSIGNED',
        title: 'New Deal Assigned',
        message: `Deal for ${address} has been assigned to ${assignedUserName}`,
        priority: 'MEDIUM',
        targetRoles: ['DISP'], // Dispositions Agent
        targetUserId: assignedUserId, // Also notify the specific assigned user
        leadId: leadId,
        triggeredBy: triggeredBy,
        data: {
          address,
          assignedUserName
        }
      });
    } catch (error) {
      console.error('Error notifying new deal assigned:', error);
    }
  },

  /**
   * Auto-clear notifications based on completed actions
   */
  async autoClearNotifications(action: 'MESSAGE_REPLIED' | 'TASK_COMPLETED' | 'LEAD_UPDATED', relatedId: string, userId?: string) {
    try {
      let whereClause: any = {};
      
      // Define which notifications to clear based on action
      switch (action) {
        case 'MESSAGE_REPLIED':
          // Clear communication-related notifications for the lead
          whereClause = {
            OR: [
              { type: 'NEW_LEAD', leadId: relatedId },
              { type: 'UNANSWERED_COMM', leadId: relatedId }
            ],
            isRead: false
          };
          break;
          
        case 'TASK_COMPLETED':
          // Clear task-related notifications
          whereClause = {
            data: {
              path: ['taskId'],
              equals: relatedId
            },
            isRead: false
          };
          break;
          
        case 'LEAD_UPDATED':
          // Clear lead-related notifications for ACQ/DISP agents
          whereClause = {
            OR: [
              { type: 'NEW_LEAD', leadId: relatedId },
              { type: 'NEW_DEAL_ASSIGNED', leadId: relatedId }
            ],
            isRead: false,
            // Only auto-clear for ACQ and DISP roles
            targetRoles: { hasSome: ['ACQ', 'DISP'] }
          };
          break;
      }

      // If userId is provided, only clear notifications for that user
      if (userId) {
        whereClause.OR = [
          { targetUserId: userId, ...whereClause },
          { targetRoles: { hasSome: ['ACQ', 'DISP'] }, ...whereClause }
        ];
      }

      const result = await prisma.notification.updateMany({
        where: whereClause,
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      console.log(`🔄 Auto-cleared ${result.count} notifications for action: ${action}`);
      return result.count;
    } catch (error) {
      console.error('Error auto-clearing notifications:', error);
      return 0;
    }
  },

  /**
   * Auto-clear notifications when message is replied
   */
  async autoClearOnMessageReply(leadId: string, userId: string) {
    return await this.autoClearNotifications('MESSAGE_REPLIED', leadId, userId);
  },

  /**
   * Auto-clear notifications when task is completed
   */
  async autoClearOnTaskComplete(taskId: string, userId: string) {
    return await this.autoClearNotifications('TASK_COMPLETED', taskId, userId);
  },

  /**
   * Auto-clear notifications when lead is updated
   */
  async autoClearOnLeadUpdate(leadId: string, userId: string) {
    return await this.autoClearNotifications('LEAD_UPDATED', leadId, userId);
  },

  /**
   * Check if user has auto-clear permissions (ACQ or DISP only)
   */
  shouldAutoClear(userRoles: RoleName[]): boolean {
    return userRoles.some(role => ['ACQ', 'DISP'].includes(role));
  },

  /**
   * Clean up old notifications (keep only last 30 days)
   */
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log(`🧹 Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }
};
