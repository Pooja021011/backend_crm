import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService.js';
import { RoleName } from '@prisma/client';

export const notificationController = {
  /**
   * Get all notifications for the authenticated user
   */
  async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      // req.user.roles is already a string[] from auth middleware, not an array of objects
      const userRoles = (req.user?.roles || []) as RoleName[];

      console.log(`[notificationController] getUserNotifications - userId: ${userId}, userRoles: ${JSON.stringify(userRoles)}`);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const notifications = await notificationService.getUserNotifications(userId, userRoles);
      
      console.log(`[notificationController] Returning ${notifications.length} notifications to frontend`);

      // Transform notifications for frontend
      const transformedNotifications = notifications.map(notification => {
        // Check if this notification has been read by the current user
        const userRead = notification.reads && notification.reads.length > 0 
          ? notification.reads[0] 
          : null;
        const isReadByUser = !!userRead;
        
        return {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        isRead: isReadByUser, // Use per-user read status
        createdAt: notification.createdAt,
        readAt: userRead?.readAt || notification.readAt, // Use per-user readAt if available
        lead: notification.lead ? {
          id: notification.lead.id,
          address: notification.lead.address ? {
            address1: notification.lead.address.address1 || '',
            city: notification.lead.address.city || '',
            state: notification.lead.address.state || '',
            zip: notification.lead.address.zip || ''
          } : null,
          sellerName: notification.lead.seller ? 
            `${notification.lead.seller.firstName} ${notification.lead.seller.lastName}` : null,
          buyerName: notification.lead.buyer ? 
            `${notification.lead.buyer.firstName} ${notification.lead.buyer.lastName}` : null
        } : null,
        deal: notification.deal,
        triggeredBy: notification.triggeredUser ? {
          name: `${notification.triggeredUser.firstName} ${notification.triggeredUser.lastName}`,
          email: notification.triggeredUser.email
        } : null,
        data: notification.data
        };
      });

      res.json({
        success: true,
        data: transformedNotifications,
        meta: {
          total: transformedNotifications.length,
          unread: transformedNotifications.filter(n => !n.isRead).length
        }
      });
    } catch (error: any) {
      console.error('Error in notificationController.getUserNotifications:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch notifications'
      });
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      // req.user.roles is already a string[] from auth middleware, not an array of objects
      const userRoles = (req.user?.roles || []) as RoleName[];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const count = await notificationService.getUnreadCount(userId, userRoles);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error: any) {
      console.error('Error in notificationController.getUnreadCount:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get unread count'
      });
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: 'Notification ID is required'
        });
      }

      const notification = await notificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      console.error('Error in notificationController.markAsRead:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark notification as read'
      });
    }
  },

  /**
   * Auto-clear notifications when message is replied
   */
  async autoClearOnMessageReply(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];
      const { leadId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Check if user has auto-clear permissions
      if (!notificationService.shouldAutoClear(userRoles)) {
        return res.json({
          success: true,
          data: { cleared: 0 },
          message: 'Auto-clear not applicable for this user role'
        });
      }

      const clearedCount = await notificationService.autoClearOnMessageReply(leadId, userId);

      res.json({
        success: true,
        data: { cleared: clearedCount },
        message: `Auto-cleared ${clearedCount} notifications after message reply`
      });
    } catch (error: any) {
      console.error('Error in notificationController.autoClearOnMessageReply:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to auto-clear notifications'
      });
    }
  },

  /**
   * Auto-clear notifications when task is completed
   */
  async autoClearOnTaskComplete(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];
      const { taskId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Check if user has auto-clear permissions
      if (!notificationService.shouldAutoClear(userRoles)) {
        return res.json({
          success: true,
          data: { cleared: 0 },
          message: 'Auto-clear not applicable for this user role'
        });
      }

      const clearedCount = await notificationService.autoClearOnTaskComplete(taskId, userId);

      res.json({
        success: true,
        data: { cleared: clearedCount },
        message: `Auto-cleared ${clearedCount} notifications after task completion`
      });
    } catch (error: any) {
      console.error('Error in notificationController.autoClearOnTaskComplete:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to auto-clear notifications'
      });
    }
  },

  /**
   * Auto-clear notifications when lead is updated
   */
  async autoClearOnLeadUpdate(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];
      const { leadId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Check if user has auto-clear permissions
      if (!notificationService.shouldAutoClear(userRoles)) {
        return res.json({
          success: true,
          data: { cleared: 0 },
          message: 'Auto-clear not applicable for this user role'
        });
      }

      const clearedCount = await notificationService.autoClearOnLeadUpdate(leadId, userId);

      res.json({
        success: true,
        data: { cleared: clearedCount },
        message: `Auto-cleared ${clearedCount} notifications after lead update`
      });
    } catch (error: any) {
      console.error('Error in notificationController.autoClearOnLeadUpdate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to auto-clear notifications'
      });
    }
  },

  /**
   * Trigger test notifications (for development)
   */
  async createTestNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Create some test notifications
      const testNotifications = [];

      // Test new contract notification
      const contractNotification = await notificationService.createNotification({
        type: 'NEW_CONTRACT',
        title: 'New Contract Created',
        message: 'A new contract for 123 Test Street has been created',
        priority: 'HIGH',
        targetRoles: ['MANAGER', 'TC'],
        triggeredBy: userId,
        data: { test: true }
      });
      testNotifications.push(contractNotification);

      // Test new lead notification
      const leadNotification = await notificationService.createNotification({
        type: 'NEW_LEAD',
        title: 'New Seller Lead',
        message: 'A new seller lead has been added to the system',
        priority: 'MEDIUM',
        targetRoles: ['ACQ'],
        triggeredBy: userId,
        data: { test: true }
      });
      testNotifications.push(leadNotification);

      // Test deal assigned notification
      const dealNotification = await notificationService.createNotification({
        type: 'NEW_DEAL_ASSIGNED',
        title: 'Deal Assigned',
        message: 'A new deal has been assigned to you',
        priority: 'MEDIUM',
        targetUserId: userId,
        triggeredBy: userId,
        data: { test: true }
      });
      testNotifications.push(dealNotification);

      res.json({
        success: true,
        data: testNotifications,
        message: `Created ${testNotifications.length} test notifications`
      });
    } catch (error: any) {
      console.error('Error in notificationController.createTestNotifications:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create test notifications'
      });
    }
  }
};
