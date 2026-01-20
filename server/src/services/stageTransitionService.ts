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
        select: { id: true, name: true, pipelineId: true, orderIndex: true }
      });
      
      if (!toStage) {
        logger.warn({ toStageId, leadId }, 'Stage not found during validation, allowing transition');
        // Fail open - allow transition if stage not found (might be a data issue)
        return { valid: true };
      }
      
      const stageName = toStage.name.toLowerCase();
      logger.info({ leadId, toStageId, stageName }, 'Validating stage transition');
      
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
        logger.warn({ leadId }, 'Lead not found during validation, allowing transition');
        // Fail open - allow transition if lead not found (might be a data issue)
        return { valid: true };
      }
      
      const customFields = (lead.customFields as any) || {};
      const requiredFields: string[] = [];
      const errors: string[] = [];

      const isMissing = (v: any) => {
        if (v === null || v === undefined) return true;
        if (typeof v === 'string') return v.trim().length === 0;
        return false;
      };

      const asNumber = (v: any): number | null => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') {
          const n = parseFloat(v);
          return Number.isFinite(n) ? n : null;
        }
        return null;
      };

      // Rule: Long Term Follow Up requires at least one OPEN task (not a note/mention task).
      // Notes are NOT accepted for this requirement — task only.
      const normalizedStageName = (toStage.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (normalizedStageName === 'long term follow up') {
        const openTaskCount = await prisma.task.count({
          where: {
            leadId,
            status: 'OPEN',
            NOT: { title: { startsWith: 'Review note on ' } },
          },
        });

        if (openTaskCount <= 0) {
          return {
            valid: false,
            stageName: toStage.name,
            requiredFields: ['followUpTask'],
            errors: ['Please add a follow-up task before moving this lead to Long Term Follow Up.'],
          };
        }
      }
      
      // Rule 2A: Appointment Complete (and any stage after it) requires at least one photo in the Photos section.
      // Stages are configurable (Settings), so we find the Appointment Complete stage dynamically in the same pipeline.
      // IMPORTANT: This is category-driven (photos), so Files/Documents do not satisfy the requirement.
      const appointmentCompleteStage = await prisma.pipelineStage.findFirst({
        where: {
          pipelineId: toStage.pipelineId,
          AND: [
            { name: { contains: 'appointment', mode: 'insensitive' } },
            { name: { contains: 'complete', mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, orderIndex: true },
      });

      if (appointmentCompleteStage && toStage.orderIndex >= appointmentCompleteStage.orderIndex) {
        const photoCount = await prisma.leadFile.count({
          where: {
            leadId,
            file: {
              category: { equals: 'photos', mode: 'insensitive' },
            },
          },
        });

        if (photoCount === 0) {
          return {
            valid: false,
            stageName: toStage.name,
            requiredFields: ['photos'],
            errors: ['Property photos are required before moving to this stage'],
          };
        }
      }

      // Rule 2B: Due Diligence (and any stage after it) requires Additional Property Info fields.
      // We locate the Due Diligence stage dynamically (name contains "due diligence" but NOT "complete").
      const dueDiligenceStage = await prisma.pipelineStage.findFirst({
        where: {
          pipelineId: toStage.pipelineId,
          AND: [
            { name: { contains: 'due diligence', mode: 'insensitive' } },
            { NOT: { name: { contains: 'complete', mode: 'insensitive' } } },
          ],
        },
        select: { id: true, name: true, orderIndex: true },
      });

      if (dueDiligenceStage && toStage.orderIndex >= dueDiligenceStage.orderIndex) {
        const ddRequired = ['hvacType', 'hvacAge', 'waterHeaterAge', 'roofAge', 'waterType', 'sewerType'] as const;
        const missing = ddRequired.filter((k) => isMissing(customFields[k]));

        if (missing.length > 0) {
          return {
            valid: false,
            stageName: toStage.name,
            requiredFields: missing as any,
            errors: ['Additional property information is required before moving to this stage'],
          };
        }
      }
      
      // Rule 2C: Due Diligence Complete (and any stage after it) requires property questions + completion checklist.
      // We locate the "Due Diligence Complete" stage dynamically so jumps to later stages are progressively gated.
      const dueDiligenceCompleteStage = await prisma.pipelineStage.findFirst({
        where: {
          pipelineId: toStage.pipelineId,
          AND: [
            { name: { contains: 'due diligence', mode: 'insensitive' } },
            { name: { contains: 'complete', mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, orderIndex: true },
      });

      if (dueDiligenceCompleteStage && toStage.orderIndex >= dueDiligenceCompleteStage.orderIndex) {
        // Also require basic contact/address info before allowing Due Diligence Complete.
        // Email is optional by requirement.
        const nonEmpty = (v: any) => typeof v === 'string' && v.trim().length > 0;

        const contact =
          lead.leadType === 'SELLER' ? lead.seller :
          lead.leadType === 'BUYER' ? lead.buyer :
          lead.vendor;

       // if (!nonEmpty(contact?.firstName)) requiredFields.push('firstName');
       // if (!nonEmpty(contact?.lastName)) requiredFields.push('lastName');
        // Phone is NOT required for stage transition validation (per CRM requirement)

        // For property leads (SELLER), address must be present.
       // if (lead.leadType === 'SELLER') {
         // if (!nonEmpty(lead.address?.address1)) requiredFields.push('address1');
          //if (!nonEmpty(lead.address?.city)) requiredFields.push('city');
          //if (!nonEmpty(lead.address?.state)) requiredFields.push('state');
          //if (!nonEmpty(lead.address?.zip)) requiredFields.push('zip');
        //}

        // Property info must be present (use same "missing" semantics as Due Diligence gate).
        if (isMissing(customFields.hvacType)) requiredFields.push('hvacType');
        if (isMissing(customFields.hvacAge)) requiredFields.push('hvacAge');
        if (isMissing(customFields.waterHeaterAge)) requiredFields.push('waterHeaterAge');
        if (isMissing(customFields.roofAge)) requiredFields.push('roofAge');
        if (isMissing(customFields.waterType)) requiredFields.push('waterType');
        if (isMissing(customFields.sewerType)) requiredFields.push('sewerType');
        
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

        // DD Complete checklist: ARV input, comparables, rehab budget, underwriting calculator
        const ddCompleteMissing: string[] = [];

        const arv = asNumber(customFields.arv);
        if (!arv || arv <= 0) ddCompleteMissing.push('arv');

        // Comparable properties can be entered as rows OR uploaded as comp PDFs.
        const comparableCount = await prisma.leadComparable.count({ where: { leadId } });
        const compPdfCount = await prisma.leadCompPdf.count({ where: { leadId } });
        if (comparableCount <= 0 && compPdfCount <= 0) ddCompleteMissing.push('comparables');

        // Rehab Budget can be stored as a RehabBudget row OR reflected in customFields (UI uses this value).
        const rehabBudgetRow = await prisma.rehabBudget.findUnique({ where: { leadId } });
        const rehabBudgetFromFields = asNumber(customFields.rehabBudget);
        const rehabBudgetValue = (rehabBudgetRow?.totalCost ?? rehabBudgetFromFields ?? 0);
        if (!rehabBudgetRow && (!rehabBudgetFromFields || rehabBudgetFromFields <= 0)) ddCompleteMissing.push('rehabBudget');

        // Underwriting can be saved as an UnderwritingCalculation row OR inferred from ARV + Rehab Budget.
        // This matches the UI, where Final Offer is derived from ARV + rehab budget without always persisting a row.
        const underwritingCalc = await prisma.underwritingCalculation.findFirst({ where: { leadId } });
        const finalOfferFromFields = asNumber(customFields.finalOffer);
        const inferredFinalOffer = arv && rehabBudgetValue
          ? (arv * 0.72) - rehabBudgetValue - 25000
          : 0;
        const hasUnderwriting =
          !!underwritingCalc ||
          (!!finalOfferFromFields && finalOfferFromFields > 0) ||
          (Number.isFinite(inferredFinalOffer) && inferredFinalOffer > 0);
        if (!hasUnderwriting) ddCompleteMissing.push('underwritingCalculation');

        if (ddCompleteMissing.length > 0) {
          return {
            valid: false,
            stageName: toStage.name,
            requiredFields: ddCompleteMissing,
            errors: ['Due diligence checklist must be completed before moving to Due Diligence Complete'],
          };
        }
      }
      
      // Rule 2D: Offer Made (and any stage after it) requires offer tracking fields.
      // We locate the "Offer Made" stage dynamically so jumps to later stages are progressively gated.
      const offerMadeStage = await prisma.pipelineStage.findFirst({
        where: {
          pipelineId: toStage.pipelineId,
          AND: [
            { name: { contains: 'offer', mode: 'insensitive' } },
            { name: { contains: 'made', mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, orderIndex: true },
      });

      if (offerMadeStage && toStage.orderIndex >= offerMadeStage.orderIndex) {
        if (isMissing(customFields.offerMadePrice)) requiredFields.push('offerMadePrice');
        // MAO removed by requirement.
        if (isMissing(customFields.offerMadeResponse)) requiredFields.push('offerMadeResponse');
        
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
      logger.error({ error: error.message, leadId, toStageId }, 'Error validating stage transition');
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
      
      logger.info({ 
        leadId, 
        stageName, 
        customFields: JSON.stringify(customFields) 
      }, 'Executing post-transition actions');
      
      // Rule 2A: Appointment Complete → Create "Underwrite" task
      if (stageName.includes('appointment') && stageName.includes('complete')) {
        await taskRepository.create(leadId, {
          title: `Underwrite ${address}`,
          description: 'Review property photos and underwrite the deal',
          dueAt: new Date(),
          assignedToId: lead.assignedUserId || userId,
          createdById: userId
        });
        
        logger.info({ leadId, stageName: stage.name }, 'Auto-created Underwrite task');
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
        
        logger.info({ leadId, stageName: stage.name }, 'Auto-created Make Offer task');
      }
      
      // Rule 2C: Offer Made → Conditional task creation
      if (stageName.includes('offer') && stageName.includes('made')) {
        const response = customFields.offerMadeResponse?.toLowerCase();
        
        logger.info({ 
          leadId, 
          offerMadeResponse: customFields.offerMadeResponse,
          responseLower: response 
        }, 'Checking offer response for task creation');
        
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
          
          logger.info({ leadId, stageName: stage.name }, 'Auto-created Follow Up task (negotiating)');
        } else if (response === 'rejected') {
          // TEMP: Disable auto-created Re-Offer task.
          // Keeping the rest of Offer Made automation intact.
          logger.info({ leadId, stageName: stage.name }, 'Skipped auto-created Re-Offer task (rejected) - temporarily disabled');
        } else if (response === 'accepted') {
          // Send contract via DocuSign
          try {
            logger.info({ leadId, stageName: stage.name }, 'Offer accepted - sending contract via DocuSign');
            
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
            
            logger.info({ 
              leadId, 
              envelopeId: envelopeResult.envelopeId,
              voidAt: envelopeResult.voidAt
            }, 'Contract sent via DocuSign successfully');
            
          } catch (error: any) {
            logger.error({ 
              leadId, 
              error: error.message 
            }, 'Failed to send contract via DocuSign');
            
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
        
        logger.info({ leadId, stageName: stage.name }, 'Auto-created Void Check task');
      }
    } catch (error: any) {
      // Don't throw - task creation failures shouldn't block stage changes
      logger.error({ 
        error: error.message, 
        leadId, 
        toStageId 
      }, 'Error executing post-transition actions');
    }
  }
};

