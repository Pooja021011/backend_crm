import cron from 'node-cron';
import { googleSheetsService } from './googleSheetsService.js';
import { prisma } from '../config/db.js';

class SchedulerService {
  private syncJob: cron.ScheduledTask | null = null;

  /**
   * Initialize scheduler
   */
  async init() {
    console.log('📅 Initializing scheduler service...');

    // Start Google Sheets sync job
    await this.startGoogleSheetsSync();

    console.log('✅ Scheduler service initialized');
  }

  /**
   * Start Google Sheets sync job
   */
  async startGoogleSheetsSync() {
    // Check if sync is enabled
    const config = await googleSheetsService.getConfig();

    if (this.syncJob) {
      this.syncJob.stop();
    }

    if (!config.syncEnabled) {
      console.log('⏸️  Google Sheets sync is disabled');
      return;
    }

    // Get sync interval in minutes (default: 60 minutes)
    const intervalMinutes = config.syncInterval || 60;

    // Create cron expression for every N minutes
    // For hourly: '0 * * * *' (at minute 0 of every hour)
    // For every 30 mins: '*/30 * * * *'
    const cronExpression = `*/${intervalMinutes} * * * *`;

    console.log(`🔄 Starting Google Sheets sync job (every ${intervalMinutes} minutes)`);

    this.syncJob = cron.schedule(cronExpression, async () => {
      try {
        console.log('🔄 Running scheduled Google Sheets sync...');
        const results = await googleSheetsService.syncLeads();
        console.log('✅ Sync completed:', results);
      } catch (error: any) {
        console.error('❌ Sync failed:', error.message);
      }
    });

    // Run immediately on start if last sync was more than interval ago
    const now = new Date();
    if (config.lastSyncAt) {
      const minutesSinceLastSync = (now.getTime() - config.lastSyncAt.getTime()) / (1000 * 60);
      if (minutesSinceLastSync >= intervalMinutes) {
        console.log('🔄 Running initial sync (last sync was too long ago)...');
        try {
          const results = await googleSheetsService.syncLeads();
          console.log('✅ Initial sync completed:', results);
        } catch (error: any) {
          console.error('❌ Initial sync failed:', error.message);
        }
      }
    } else {
      // Never synced before, run now
      console.log('🔄 Running first-time sync...');
      try {
        const results = await googleSheetsService.syncLeads();
        console.log('✅ First-time sync completed:', results);
      } catch (error: any) {
        console.error('❌ First-time sync failed:', error.message);
      }
    }
  }

  /**
   * Restart Google Sheets sync with new settings
   */
  async restartGoogleSheetsSync() {
    console.log('🔄 Restarting Google Sheets sync with updated settings...');
    await this.startGoogleSheetsSync();
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    console.log('⏹️  Stopping all scheduled jobs...');
    
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
    }

    console.log('✅ All scheduled jobs stopped');
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
