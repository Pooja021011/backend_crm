import type { Request, Response } from 'express';
import { settingsService } from '../services/settingsService.js';
import { smsSettingsRepository } from '../repositories/smsSettingsRepository.js';
import { prisma } from '../config/db.js';
import fs from 'node:fs';
import path from 'node:path';

export const settingsController = {
  // Markets
  listMarkets: async (_req: Request, res: Response) => res.json({ data: await settingsService.listMarkets() }),
  createMarket: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createMarket(req.body.name) }),
  updateMarket: async (req: Request, res: Response) => res.json({ data: await settingsService.updateMarket(req.params.id, req.body.name) }),
  deleteMarket: async (req: Request, res: Response) => { await settingsService.deleteMarket(req.params.id); res.json({ success: true }); },

  // Counties
  listCounties: async (req: Request, res: Response) => res.json({ data: await settingsService.listCounties(req.query.marketId as string|undefined) }),
  createCounty: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createCounty(req.body.marketId, req.body.name) }),
  updateCounty: async (req: Request, res: Response) => res.json({ data: await settingsService.updateCounty(req.params.id, req.body.name, req.body.marketId) }),
  deleteCounty: async (req: Request, res: Response) => { await settingsService.deleteCounty(req.params.id); res.json({ success: true }); },

  // Lead Sources
  listLeadSources: async (_req: Request, res: Response) => res.json({ data: await settingsService.listLeadSources() }),
  createLeadSource: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createLeadSource(req.body.name, req.body.active) }),
  updateLeadSource: async (req: Request, res: Response) => res.json({ data: await settingsService.updateLeadSource(req.params.id, req.body.name, req.body.active) }),
  deleteLeadSource: async (req: Request, res: Response) => { await settingsService.deleteLeadSource(req.params.id); res.json({ success: true }); },

  // Asset Classes
  listAssetClasses: async (_req: Request, res: Response) => res.json({ data: await settingsService.listAssetClasses() }),
  createAssetClass: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createAssetClass(req.body.name, req.body.active) }),
  updateAssetClass: async (req: Request, res: Response) => res.json({ data: await settingsService.updateAssetClass(req.params.id, req.body.name, req.body.active) }),
  deleteAssetClass: async (req: Request, res: Response) => { await settingsService.deleteAssetClass(req.params.id); res.json({ success: true }); },

  // Price Ranges
  listPriceRanges: async (_req: Request, res: Response) => res.json({ data: await settingsService.listPriceRanges() }),
  createPriceRange: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createPriceRange(req.body.label, req.body.min, req.body.max) }),
  updatePriceRange: async (req: Request, res: Response) => res.json({ data: await settingsService.updatePriceRange(req.params.id, req.body.label, req.body.min, req.body.max) }),
  deletePriceRange: async (req: Request, res: Response) => { await settingsService.deletePriceRange(req.params.id); res.json({ success: true }); },

  // Doc Categories
  listDocCategories: async (_req: Request, res: Response) => res.json({ data: await settingsService.listDocCategories() }),
  createDocCategory: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createDocCategory(req.body.name) }),
  updateDocCategory: async (req: Request, res: Response) => res.json({ data: await settingsService.updateDocCategory(req.params.id, req.body.name) }),
  deleteDocCategory: async (req: Request, res: Response) => { await settingsService.deleteDocCategory(req.params.id); res.json({ success: true }); },

  // App Settings
  getAppSettings: async (_req: Request, res: Response) => res.json({ data: await settingsService.getAppSettings() }),
  setAppSettings: async (req: Request, res: Response) => res.json({ data: await settingsService.setAppSettings(req.body) }),

  // Per-user Email Settings
  getUserEmailSettings: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id as string;
      const data = await settingsService.getUserEmailSettings(userId);
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error in getUserEmailSettings:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },
  upsertUserEmailSettings: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    const data = await settingsService.upsertUserEmailSettings(userId, req.body);
    return res.json({ success: true, data });
  },
  testImapConnection: async (req: Request, res: Response) => {
    const { imapHost, imapPort, imapUser, imapPass, imapSecure } = req.body;
    try {
      const result = await settingsService.testImapConnection({
        imapHost,
        imapPort,
        imapUser,
        imapPass,
        imapSecure
      });
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  // Fetch Gmail emails via IMAP
  fetchGmailEmails: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    const limit = parseInt(req.query.limit as string) || 20;
    
    try {
      const { emailService } = await import('../services/emailService.js');
      const emails = await emailService.fetchGmailEmails(userId, limit);
      return res.json({ success: true, data: emails });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  // Fetch only lead-related emails
  fetchLeadEmails: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    const limit = parseInt(req.query.limit as string) || 20;
    
    try {
      const { emailService } = await import('../services/emailService.js');
      const { emailMatchingService } = await import('../services/emailMatchingService.js');
      
      // Fetch all emails
      const allEmails = await emailService.fetchGmailEmails(userId, limit);
      
      // Filter to only emails that match leads
      const leadEmails = [];
      for (const email of allEmails) {
        const leadId = await emailMatchingService.findLeadByMultipleEmails([
          email.from,
          email.to,
          email.cc,
          email.bcc
        ].filter(Boolean));
        
        if (leadId) {
          leadEmails.push({
            ...email,
            leadId
          });
        }
      }

      // Inbox behavior: hide emails already opened/dismissed by this user
      const emailIds = leadEmails.map((e: any) => String(e.id)).filter(Boolean);
      if (emailIds.length > 0) {
        const reads = await prisma.gmailEmailRead.findMany({
          where: { userId, emailId: { in: emailIds } },
          select: { emailId: true },
        });
        const readSet = new Set(reads.map((r: { emailId: string }) => r.emailId));
        const unreadLeadEmails = leadEmails.filter((e: any) => !readSet.has(String(e.id)));
        return res.json({ success: true, data: unreadLeadEmails });
      }
      
      return res.json({ success: true, data: leadEmails });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  // Send email using user's SMTP settings
  sendEmail: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    const { to, subject, text, html, replyTo, inReplyTo, references, leadId } = req.body;
    
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, and text/html' 
      });
    }
    
    try {
      const { emailService } = await import('../services/emailService.js');
      const result = await emailService.sendEmail(userId, {
        to,
        subject,
        text,
        html,
        replyTo,
        inReplyTo,
        references,
        leadId
      });
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  // Test SMTP connection for current user
  testSmtpConnection: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    
    try {
      const { emailService } = await import('../services/emailService.js');
      const result = await emailService.testSmtpConnection(userId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  // Fetch email thread for a specific subject
  fetchEmailThread: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    
    try {
      const { subject } = req.body;
      if (!subject) {
        return res.status(400).json({ success: false, error: 'Email subject is required' });
      }

      const { emailService } = await import('../services/emailService.js');
      const threadEmails = await emailService.fetchEmailThread(userId, subject);
      
      res.json({
        success: true,
        data: threadEmails
      });
    } catch (error: any) {
      console.error('Thread fetch error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch email thread'
      });
    }
  },

  // Mark email as read on Gmail
  markEmailAsRead: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    
    try {
      const { emailId } = req.body;
      if (!emailId) {
        return res.status(400).json({ success: false, error: 'Email ID is required' });
      }

      const { emailService } = await import('../services/emailService.js');
      const result = await emailService.markEmailAsRead(userId, emailId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark email as read'
      });
    }
  },

  // Pipelines
  listPipelines: async (_req: Request, res: Response) => res.json({ data: await settingsService.listPipelines() }),
  createStage: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createStage(req.params.pipelineId, req.body.name, req.body.orderIndex, req.body.color) }),
  updateStage: async (req: Request, res: Response) => res.json({ data: await settingsService.updateStage(req.params.stageId, { name: req.body.name, orderIndex: req.body.orderIndex, color: req.body.color }) }),
  deleteStage: async (req: Request, res: Response) => { await settingsService.deleteStage(req.params.stageId); res.json({ success: true }); },
  reorderStages: async (req: Request, res: Response) => res.json({ data: await settingsService.reorderStages(req.params.pipelineId, req.body.items) }),

  // SMS Settings
  getUserSmsSettings: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const smsSettings = await smsSettingsRepository.getUserSmsSettings(userId);
      res.json({ 
        success: true, 
        data: smsSettings || {
          phoneNumber: null,
          displayName: null,
          active: true
        }
      });
    } catch (error: any) {
      console.error('Error getting SMS settings:', error);
      res.status(500).json({ success: false, error: 'Failed to get SMS settings' });
    }
  },

  upsertUserSmsSettings: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const { phoneNumber, displayName, active } = req.body;

      // Validate phone number format if provided
      if (phoneNumber && !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' 
        });
      }

      const smsSettings = await smsSettingsRepository.upsertUserSmsSettings(userId, {
        phoneNumber,
        displayName,
        active: active !== undefined ? active : true,
      });

      res.json({ success: true, data: smsSettings });
    } catch (error: any) {
      console.error('Error saving SMS settings:', error);
      res.status(500).json({ success: false, error: 'Failed to save SMS settings' });
    }
  },

  // Voicemail Greeting (per-user) - upload WAV and associate to UserSmsSettings
  uploadVoicemailGreeting: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
      }

      // Basic type guard: ensure it is audio (we primarily expect WAV)
      if (!String(file.mimetype || '').startsWith('audio/')) {
        return res.status(400).json({ success: false, error: 'Voicemail greeting must be an audio file' });
      }

      // Move the uploaded file into a stable location by userId
      const greetingsDir = path.resolve(process.cwd(), 'server', 'uploads', 'voicemail-greetings');
      fs.mkdirSync(greetingsDir, { recursive: true });

      const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetFilename = `${safeUserId}.wav`;
      const targetPath = path.join(greetingsDir, targetFilename);

      // Multer saved the file into server/uploads already; move/replace to stable path
      try {
        fs.renameSync(file.path, targetPath);
      } catch {
        // Cross-device rename fallback
        fs.copyFileSync(file.path, targetPath);
        fs.unlinkSync(file.path);
      }

      // Ensure UserSmsSettings exists and store greeting pointer
      const updated = await prisma.userSmsSettings.upsert({
        where: { userId },
        update: {
          voicemailGreetingPath: targetFilename,
          voicemailGreetingUpdatedAt: new Date(),
        },
        create: {
          userId,
          active: true,
          voicemailGreetingPath: targetFilename,
          voicemailGreetingUpdatedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        data: {
          userId,
          voicemailGreetingPath: updated.voicemailGreetingPath,
          voicemailGreetingUpdatedAt: updated.voicemailGreetingUpdatedAt,
        },
      });
    } catch (error: any) {
      console.error('Error uploading voicemail greeting:', error);
      return res.status(500).json({ success: false, error: 'Failed to upload voicemail greeting' });
    }
  },

  // Delete Voicemail Greeting (per-user)
  deleteVoicemailGreeting: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Get user settings to find the file
      const settings = await prisma.userSmsSettings.findUnique({
        where: { userId },
        select: { voicemailGreetingPath: true },
      });

      // Delete the physical file if it exists
      if (settings?.voicemailGreetingPath) {
        const greetingsDir = path.resolve(process.cwd(), 'server', 'uploads', 'voicemail-greetings');
        const filePath = path.join(greetingsDir, settings.voicemailGreetingPath);
        
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Error deleting voicemail file:', err);
          }
        }
      }

      // Clear the greeting path in database
      await prisma.userSmsSettings.update({
        where: { userId },
        data: {
          voicemailGreetingPath: null,
          voicemailGreetingUpdatedAt: null,
        },
      });

      return res.json({
        success: true,
        message: 'Voicemail greeting deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting voicemail greeting:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete voicemail greeting' });
    }
  },
};

