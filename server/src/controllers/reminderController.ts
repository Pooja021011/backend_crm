import { Request, Response } from 'express';
import { reminderService } from '../services/reminderService.js';
import { RoleName } from '@prisma/client';

export const reminderController = {
  /**
   * Get all reminders for the authenticated user
   */
  async getUserReminders(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const reminders = await reminderService.getUserReminders(userId, userRoles);

      res.json({
        success: true,
        data: reminders,
        meta: {
          total: reminders.length,
          userId,
          userRoles
        }
      });
    } catch (error: any) {
      console.error('Error in reminderController.getUserReminders:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch reminders'
      });
    }
  },

  /**
   * Get reminder counts for badge display
   */
  async getReminderCounts(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const counts = await reminderService.getReminderCounts(userId, userRoles);

      res.json({
        success: true,
        data: counts
      });
    } catch (error: any) {
      console.error('Error in reminderController.getReminderCounts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch reminder counts'
      });
    }
  },

  /**
   * Get reminders filtered by type
   */
  async getRemindersByType(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];
      const { type } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Reminder type is required'
        });
      }

      const reminders = await reminderService.getRemindersByType(userId, userRoles, type.toUpperCase());

      res.json({
        success: true,
        data: reminders,
        meta: {
          total: reminders.length,
          type: type.toUpperCase()
        }
      });
    } catch (error: any) {
      console.error('Error in reminderController.getRemindersByType:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch reminders by type'
      });
    }
  },

  /**
   * Get reminders filtered by priority
   */
  async getRemindersByPriority(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];
      const { priority } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!priority) {
        return res.status(400).json({
          success: false,
          error: 'Priority is required'
        });
      }

      const reminders = await reminderService.getRemindersByPriority(userId, userRoles, priority.toUpperCase());

      res.json({
        success: true,
        data: reminders,
        meta: {
          total: reminders.length,
          priority: priority.toUpperCase()
        }
      });
    } catch (error: any) {
      console.error('Error in reminderController.getRemindersByPriority:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch reminders by priority'
      });
    }
  },

  /**
   * Acknowledge a reminder
   */
  async acknowledgeReminder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { reminderId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!reminderId) {
        return res.status(400).json({
          success: false,
          error: 'Reminder ID is required'
        });
      }

      const acknowledged = await reminderService.acknowledgeReminder(userId, reminderId);

      res.json({
        success: true,
        data: { acknowledged },
        message: 'Reminder acknowledged successfully'
      });
    } catch (error: any) {
      console.error('Error in reminderController.acknowledgeReminder:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to acknowledge reminder'
      });
    }
  },

  /**
   * Get SLA status for the user
   */
  async getSLAStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRoles = req.user?.roles?.map((r: any) => r.role?.name || r.name) as RoleName[] || [];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const slaStatus = await reminderService.getSLAStatus(userId, userRoles);

      res.json({
        success: true,
        data: slaStatus,
        meta: {
          userId,
          userRoles,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Error in reminderController.getSLAStatus:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch SLA status'
      });
    }
  }
};
