import type { Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { taskRepository } from '../repositories/taskRepository.js';

export const docusignWebhookController = {
  /**
   * Verify DocuSign webhook signature
   */
  verifyWebhookSignature(req: Request): boolean {
    try {
      const signature = req.headers['x-docusign-signature-1'] as string;
      const webhookSecret = env.DOCUSIGN_WEBHOOK_SECRET;
      
      if (!signature || !webhookSecret) {
        return false;
      }
      
      const payload = JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payload);
      const computedSignature = hmac.digest('base64');
      
      return signature === computedSignature;
    } catch (error) {
      logger.error('Error verifying webhook signature', { error });
      return false;
    }
  },

  /**
   * Handle DocuSign webhook events
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      // Verify signature (optional but recommended)
      if (env.DOCUSIGN_WEBHOOK_SECRET) {
        const isValid = docusignWebhookController.verifyWebhookSignature(req);
        if (!isValid) {
          logger.warn('Invalid DocuSign webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      const event = req.body;
      const envelopeId = event.data?.envelopeId || event.envelopeId;
      const status = event.data?.envelopeSummary?.status || event.status;
      
      logger.info('DocuSign webhook received', { 
        envelopeId, 
        status,
        event: event.event 
      });

      if (!envelopeId) {
        logger.warn('No envelope ID in webhook');
        return res.status(400).json({ error: 'No envelope ID' });
      }

      // Find lead by envelope ID
      const lead = await prisma.lead.findFirst({
        where: { docusignEnvelopeId: envelopeId },
        include: {
          address: true,
          assignedUser: true
        }
      });

      if (!lead) {
        logger.warn('No lead found for envelope', { envelopeId });
        return res.status(404).json({ error: 'Lead not found' });
      }

      const address = lead.address?.address1 || 'Property';

      // Handle different envelope statuses
      switch (status?.toLowerCase()) {
        case 'completed':
          await docusignWebhookController.handleCompleted(lead.id, envelopeId, address);
          break;
          
        case 'voided':
        case 'declined':
        case 'expired':
          await docusignWebhookController.handleVoidedOrExpired(
            lead.id, 
            envelopeId, 
            address, 
            status,
            lead.assignedUserId
          );
          break;
          
        case 'sent':
        case 'delivered':
          // Update contract status but don't change lead status
          await prisma.lead.update({
            where: { id: lead.id },
            data: { contractStatus: status.toUpperCase() }
          });
          logger.info('Contract status updated', { leadId: lead.id, status });
          break;
          
        default:
          logger.info('Unhandled envelope status', { envelopeId, status });
      }

      return res.json({ success: true, message: 'Webhook processed' });

    } catch (error: any) {
      logger.error('Error processing DocuSign webhook', { 
        error: error.message,
        stack: error.stack 
      });
      return res.status(500).json({ error: 'Failed to process webhook' });
    }
  },

  /**
   * Handle completed envelope (contract signed)
   */
  async handleCompleted(leadId: string, envelopeId: string, address: string) {
    try {
      logger.info('Contract completed (signed)', { leadId, envelopeId });

      // Update lead to UNDER_CONTRACT status
      const underContractStatus = await prisma.leadStatus.findFirst({
        where: { 
          name: { 
            contains: 'Under Contract', 
            mode: 'insensitive' 
          } 
        }
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          leadStatusId: underContractStatus?.id,
          contractStatus: 'COMPLETED',
          contractSignedAt: new Date()
        }
      });

      logger.info('Lead status updated to UNDER_CONTRACT', { leadId });

    } catch (error: any) {
      logger.error('Error handling completed envelope', { 
        leadId, 
        envelopeId, 
        error: error.message 
      });
    }
  },

  /**
   * Handle voided, declined, or expired envelope
   */
  async handleVoidedOrExpired(
    leadId: string, 
    envelopeId: string, 
    address: string, 
    status: string,
    assignedUserId?: string | null
  ) {
    try {
      logger.info('Contract voided/declined/expired', { leadId, envelopeId, status });

      // Update lead contract status
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          contractStatus: status.toUpperCase()
        }
      });

      // Create task to check voided contract (due 1 hour from now)
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 1);

      await taskRepository.create(leadId, {
        title: `Check Voided Contract With ${address}`,
        description: `Contract was ${status} in DocuSign. Envelope ID: ${envelopeId}. Please review and determine next steps.`,
        dueAt: dueDate,
        assignedToId: assignedUserId || undefined,
        createdById: undefined
      });

      logger.info('Task created for voided contract', { leadId, status });

    } catch (error: any) {
      logger.error('Error handling voided/expired envelope', { 
        leadId, 
        envelopeId, 
        error: error.message 
      });
    }
  }
};

