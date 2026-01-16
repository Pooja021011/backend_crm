import { prisma } from '../config/db.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { logger } from '../config/logger.js';
import { docusignService } from './docusignService.js';

/**
 * Service for handling stage transition rules and validations
 * This is ADDITIVE - doesn't modify existing logic
 */
export const stageTransitionService = {
  
  /**
   * Validate if stage transition is allowed
   * Returns validation errors if transition should be blocked
   */
  async validateStageTransition(
    leadId: string, 
    fromStageId: string | null, 
    toStageId: string
  ): Promise<{ valid: boolean; errors?: string[]; requiredFields?: string[]; stageName?: string }> {
    
    try {
      const toStage = await prisma.pipelineStage.findUnique({
        where: { id: toStageId },
        select: { name: true }
      });
      
      if (!toStage) {
        logger.warn('Stage not found during validation, allowing transition', { toStageId, leadId });
        // Fail open - allow transition if stage not found (might be a data issue)
        return { valid: true };
      }
      
      const stageName = toStage.name.toLowerCase();
      logger.info('Validating stage transition', { leadId, toStageId, stageName });
      
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          customFields: true,
          leadType: true,
          address: { select: { address1: true, city: true, state: true, zip: true } },
          seller: { select: { firstName: true, lastName: true, phone: true, email: true } },
          buyer: { select: { firstName: true, lastName: true, phone: true, email: true } },
          vendor: { select: { firstName: true, lastName: true, phone: true, email: true } },
        }
      });
      
      if (!lead) {
        logger.warn('Lead not found during validation, allowing transition', { leadId });
        // Fail open - allow transition if lead not found (might be a data issue)
        return { valid: true };
      }
      
      const customFields = (lead.customFields as any) || {};
      const requiredFields: string[] = [];
      const errors: string[] = [];
      
      // Rule 2A: Appointment Complete requires photo upload
      if (stageName.includes('appointment') && stageName.includes('complete')) {
        // Check if photos exist for this lead
        const photoCount = await prisma.file.count({
          where: {
            leadId,
            category: 'PHOTO'
          }
        });
        
        if (photoCount === 0) {
          return {
            valid: false,
            stageName: toStage.name,
            requiredFields: ['photos'],
            errors: ['Property photos are required before marking appointment as complete']
          };
        }
      }
      
      // Rule 2B: Due Diligence Complete requires property questions
      if (stageName.includes('due diligence') && stageName.includes('complete')) {
        // Also require basic contact/address info before allowing Due Diligence Complete.
        // Email is optional by requirement.
        const nonEmpty = (v: any) => typeof v === 'string' && v.trim().length > 0;

        const contact =
          lead.leadType === 'SELLER' ? lead.seller :
          lead.leadType === 'BUYER' ? lead.buyer :
          lead.vendor;

        if (!nonEmpty(contact?.firstName)) requiredFields.push('firstName');
        if (!nonEmpty(contact?.lastName)) requiredFields.push('lastName');
        // Phone is NOT required for stage transition validation (per CRM requirement)

        // For property leads (SELLER), address must be present.
        if (lead.leadType === 'SELLER') {
          if (!nonEmpty(lead.address?.address1)) requiredFields.push('address1');
          if (!nonEmpty(lead.address?.city)) requiredFields.push('city');
          if (!nonEmpty(lead.address?.state)) requiredFields.push('state');
          if (!nonEmpty(lead.address?.zip)) requiredFields.push('zip');
        }

        if (!customFields.hvacType) requiredFields.push('hvacType');
        if (!customFields.hvacAge) requiredFields.push('hvacAge');
        if (!customFields.waterHeaterAge) requiredFields.push('waterHeaterAge');
        if (!customFields.roofAge) requiredFields.push('roofAge');
        if (!customFields.waterType) requiredFields.push('waterType');
        if (!customFields.sewerType) requiredFields.push('sewerType');
        
        if (requiredFields.length > 0) {
          // Build a clear message: separate “basic info” from “property info” (custom fields).
          const basic = requiredFields.filter(f => ['firstName','lastName','address1','city','state','zip'].includes(f));
          const dd = requiredFields.filter(f => !basic.includes(f));
          if (basic.length) errors.push(`Basic information required: ${basic.join(', ')}`);
          if (dd.length) errors.push(`Property information required: ${dd.join(', ')}`);
          return { 
            valid: false,
            stageName: toStage.name,
            requiredFields,
            errors: errors.length ? errors : [`Property information required: ${requiredFields.join(', ')}`]
          };
        }
      }
      
      // Rule 2C: Offer Made requires offer tracking fields
      if (stageName.includes('offer') && stageName.includes('made')) {
        if (!customFields.offerMadePrice) requiredFields.push('offerMadePrice');
        if (!customFields.maxAllowableOffer) requiredFields.push('maxAllowableOffer');
        if (!customFields.offerMadeResponse) requiredFields.push('offerMadeResponse');
        
        if (requiredFields.length > 0) {
          return { 
            valid: false,
            stageName: toStage.name,
            requiredFields,
            errors: [`Offer details required: ${requiredFields.join(', ')}`]
          };
        }
      }
      
      return { valid: true, stageName: toStage.name };
    } catch (error: any) {
      logger.error('Error validating stage transition', { error: error.message, leadId, toStageId });
      // On error, allow transition (fail open to not break existing functionality)
      return { valid: true };
    }
  },
  
  /**
   * Execute post-transition actions (task creation, etc.)
   * This runs AFTER the stage change is committed
   */
  async executePostTransitionActions(
    leadId: string,
    toStageId: string,
    userId: string
  ): Promise<void> {
    
    try {
      const stage = await prisma.pipelineStage.findUnique({
        where: { id: toStageId },
        select: { name: true }
      });
      
      if (!stage) return;
      
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { 
          assignedUserId: true, 
          customFields: true,
          address: { select: { address1: true } }
        }
      });
      
      if (!lead) return;
      
      const stageName = stage.name.toLowerCase();
      const address = lead.address?.address1 || 'Property';
      const customFields = (lead.customFields as any) || {};
      
      logger.info('Executing post-transition actions', { 
        leadId, 
        stageName, 
        customFields: JSON.stringify(customFields) 
      });
      
      // Rule 2A: Appointment Complete → Create "Underwrite" task
      if (stageName.includes('appointment') && stageName.includes('complete')) {
        await taskRepository.create(leadId, {
          title: `Underwrite ${address}`,
          description: 'Review property photos and underwrite the deal',
          dueAt: new Date(),
          assignedToId: lead.assignedUserId || userId,
          createdById: userId
        });
        
        logger.info('Auto-created Underwrite task', { leadId, stageName: stage.name });
      }
      
      // Rule 2B: Due Diligence Complete → Create "Make Offer" task
      if (stageName.includes('due diligence') && stageName.includes('complete')) {
        await taskRepository.create(leadId, {
          title: `Make Offer on ${address}`,
          description: 'Prepare and submit offer based on due diligence findings',
          dueAt: new Date(),
          assignedToId: lead.assignedUserId || userId,
          createdById: userId
        });
        
        logger.info('Auto-created Make Offer task', { leadId, stageName: stage.name });
      }
      
      // Rule 2C: Offer Made → Conditional task creation
      if (stageName.includes('offer') && stageName.includes('made')) {
        const response = customFields.offerMadeResponse?.toLowerCase();
        
        logger.info('Checking offer response for task creation', { 
          leadId, 
          offerMadeResponse: customFields.offerMadeResponse,
          responseLower: response 
        });
        
        if (response === 'negotiating') {
          // Follow up in 6 hours
          const dueDate = new Date();
          dueDate.setHours(dueDate.getHours() + 6);
          
          await taskRepository.create(leadId, {
            title: `Follow Up With ${address}`,
            description: 'Check on offer negotiation status',
            dueAt: dueDate,
            assignedToId: lead.assignedUserId || userId,
            createdById: userId
          });
          
          logger.info('Auto-created Follow Up task (negotiating)', { leadId, stageName: stage.name });
        } else if (response === 'rejected') {
          // Re-offer in 2 weeks
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 14);
          
          await taskRepository.create(leadId, {
            title: `Re-Offer on ${address}`,
            description: 'Prepare revised offer after rejection',
            dueAt: dueDate,
            assignedToId: lead.assignedUserId || userId,
            createdById: userId
          });
          
          logger.info('Auto-created Re-Offer task (rejected)', { leadId, stageName: stage.name });
        } else if (response === 'accepted') {
          // Send contract via DocuSign
          try {
            logger.info('Offer accepted - sending contract via DocuSign', { leadId, stageName: stage.name });
            
            const envelopeResult = await docusignService.createAndSendEnvelopeFromTemplate(leadId);
            
            // Update lead with DocuSign envelope info and change status to CONTRACT_SENT
            await prisma.lead.update({
              where: { id: leadId },
              data: {
                docusignEnvelopeId: envelopeResult.envelopeId,
                contractSentAt: envelopeResult.sentAt,
                contractVoidAt: envelopeResult.voidAt,
                contractStatus: 'SENT',
                esignProvider: 'docusign'
              }
            });
            
            // Find "Contract Sent" status and update lead
            const contractSentStatus = await prisma.leadStatus.findFirst({
              where: { 
                name: { 
                  contains: 'Contract Sent', 
                  mode: 'insensitive' 
                } 
              }
            });
            
            if (contractSentStatus) {
              await prisma.lead.update({
                where: { id: leadId },
                data: { leadStatusId: contractSentStatus.id }
              });
            }
            
            // Create task to follow up
            await taskRepository.create(leadId, {
              title: `Contract Sent - Awaiting Signature for ${address}`,
              description: `DocuSign contract sent. Expires on ${envelopeResult.voidAt.toLocaleDateString()}. Envelope ID: ${envelopeResult.envelopeId}`,
              dueAt: new Date(envelopeResult.voidAt.getTime() - 24 * 60 * 60 * 1000), // 1 day before expiration
              assignedToId: lead.assignedUserId || userId,
              createdById: userId
            });
            
            logger.info('Contract sent via DocuSign successfully', { 
              leadId, 
              envelopeId: envelopeResult.envelopeId,
              voidAt: envelopeResult.voidAt
            });
            
          } catch (error: any) {
            logger.error('Failed to send contract via DocuSign', { 
              leadId, 
              error: error.message 
            });
            
            // Create task for manual follow-up
            await taskRepository.create(leadId, {
              title: `URGENT: DocuSign Failed for ${address}`,
              description: `Failed to send contract via DocuSign: ${error.message}. Please send contract manually.`,
              dueAt: new Date(),
              assignedToId: lead.assignedUserId || userId,
              createdById: userId
            });
            
            // Don't throw - log error but don't block stage transition
          }
        }
      }
      
      // Rule 2D: Contract Void → Create check task
      if (stageName.includes('void')) {
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 1); // 1 hour from now
        
        await taskRepository.create(leadId, {
          title: `Check Voided Contract With ${address}`,
          description: 'Review voided contract and determine next steps',
          dueAt: dueDate,
          assignedToId: lead.assignedUserId || userId,
          createdById: userId
        });
        
        logger.info('Auto-created Void Check task', { leadId, stageName: stage.name });
      }
    } catch (error: any) {
      // Don't throw - task creation failures shouldn't block stage changes
      logger.error('Error executing post-transition actions', { 
        error: error.message, 
        leadId, 
        toStageId 
      });
    }
  }
};

