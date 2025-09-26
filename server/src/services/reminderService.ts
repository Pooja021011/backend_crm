import { reminderRepository, ReminderAlert } from '../repositories/reminderRepository.js';
import { RoleName } from '@prisma/client';

export const reminderService = {
  /**
   * Get all reminders for a user based on their roles
   */
  async getUserReminders(userId: string, userRoles: RoleName[]): Promise<ReminderAlert[]> {
    try {
      const reminders = await reminderRepository.getRoleBasedReminders(userId, userRoles);
      
      // Add any additional business logic here
      // e.g., filtering, additional sorting, etc.
      
      return reminders;
    } catch (error) {
      console.error('Error in reminderService.getUserReminders:', error);
      throw new Error('Failed to fetch user reminders');
    }
  },

  /**
   * Get reminder counts for dashboard/badge display
   */
  async getReminderCounts(userId: string, userRoles: RoleName[]) {
    try {
      return await reminderRepository.getReminderCounts(userId, userRoles);
    } catch (error) {
      console.error('Error in reminderService.getReminderCounts:', error);
      throw new Error('Failed to fetch reminder counts');
    }
  },

  /**
   * Get reminders filtered by type
   */
  async getRemindersByType(userId: string, userRoles: RoleName[], type: string): Promise<ReminderAlert[]> {
    try {
      const allReminders = await this.getUserReminders(userId, userRoles);
      return allReminders.filter(reminder => reminder.type === type);
    } catch (error) {
      console.error('Error in reminderService.getRemindersByType:', error);
      throw new Error('Failed to fetch reminders by type');
    }
  },

  /**
   * Get reminders filtered by priority
   */
  async getRemindersByPriority(userId: string, userRoles: RoleName[], priority: string): Promise<ReminderAlert[]> {
    try {
      const allReminders = await this.getUserReminders(userId, userRoles);
      return allReminders.filter(reminder => reminder.priority === priority);
    } catch (error) {
      console.error('Error in reminderService.getRemindersByPriority:', error);
      throw new Error('Failed to fetch reminders by priority');
    }
  },

  /**
   * Mark reminder as acknowledged (for future enhancement)
   * This could be used to track which reminders user has seen
   */
  async acknowledgeReminder(userId: string, reminderId: string): Promise<boolean> {
    // For now, just return true
    // In future, we could store acknowledged reminders in database
    console.log(`User ${userId} acknowledged reminder ${reminderId}`);
    return true;
  },

  /**
   * Get SLA status for leads based on role
   */
  async getSLAStatus(userId: string, userRoles: RoleName[]) {
    try {
      const reminders = await this.getUserReminders(userId, userRoles);
      
      // Calculate SLA metrics
      const slaStatus = {
        totalAlerts: reminders.length,
        criticalAlerts: reminders.filter(r => r.priority === 'URGENT').length,
        overdueItems: reminders.filter(r => 
          r.type === 'LEAD_UNTOUCHED' || 
          r.type === 'DUE_DILIGENCE' || 
          r.type === 'UNANSWERED_COMM'
        ).length,
        upcomingDeadlines: reminders.filter(r => 
          r.type === 'CLOSING_SOON' && 
          r.dueDate && 
          new Date(r.dueDate).getTime() > Date.now()
        ).length,
        roleSpecificMetrics: this.calculateRoleSpecificMetrics(reminders, userRoles)
      };

      return slaStatus;
    } catch (error) {
      console.error('Error in reminderService.getSLAStatus:', error);
      throw new Error('Failed to fetch SLA status');
    }
  },

  /**
   * Calculate role-specific metrics
   */
  calculateRoleSpecificMetrics(reminders: ReminderAlert[], userRoles: RoleName[]) {
    const metrics: any = {};

    if (userRoles.includes('MANAGER')) {
      metrics.manager = {
        untouchedLeads42_54h: reminders.filter(r => 
          r.type === 'LEAD_UNTOUCHED' && 
          r.description.includes('42-54h')
        ).length,
        dueDiligenceOverdue: reminders.filter(r => r.type === 'DUE_DILIGENCE').length,
        newContracts24h: reminders.filter(r => r.type === 'NEW_CONTRACT').length
      };
    }

    if (userRoles.includes('ACQ')) {
      metrics.acquisitions = {
        untouchedLeads36h: reminders.filter(r => 
          r.type === 'LEAD_UNTOUCHED' && 
          r.id.includes('acq-untouched')
        ).length
      };
    }

    if (userRoles.includes('DISP')) {
      metrics.dispositions = {
        untouchedLeads36h: reminders.filter(r => 
          r.type === 'LEAD_UNTOUCHED' && 
          r.id.includes('disp-untouched')
        ).length,
        dueDiligence3_5days: reminders.filter(r => 
          r.type === 'DUE_DILIGENCE' && 
          r.id.includes('disp-due-diligence')
        ).length
      };
    }

    if (userRoles.includes('TC')) {
      metrics.transactionCoordinator = {
        closingWithin2Days: reminders.filter(r => r.type === 'CLOSING_SOON').length,
        unansweredComms16h: reminders.filter(r => r.type === 'UNANSWERED_COMM').length
      };
    }

    return metrics;
  }
};
