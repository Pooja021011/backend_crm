import { prisma } from '../config/db.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { logger } from '../config/logger.js';
import { docusignService } from './docusignService.js';
import { env } from '../config/env.js';

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
      
      // Rule 2A: Appointment Complete (and any stage after it) requires Additional Property Info fields FIRST
      // Rule 2B: Appointment Complete (and any stage after it) requires at least 3 photos AFTER property info
      // Rule 2C: Due Diligence Complete requires ARV, comps, rehab, taxes, timeline
      // IMPORTANT: Collect ALL validation errors instead of returning early, so frontend can show all required popups.
      // CRITICAL: Order matters! Property info must come BEFORE photos in the requiredFields array.
      
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

      // NEW: Find Appointment Set stage to check appointmentDate requirement
      const appointmentSetStage = await prisma.pipelineStage.findFirst({
        where: {
          pipelineId: toStage.pipelineId,
          AND: [
            { name: { contains: 'appointment', mode: 'insensitive' } },
            { name: { contains: 'set', mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, orderIndex: true },
      });

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

      // Collect validation errors instead of returning early
      const allRequiredFields: string[] = [];
      const allErrors: string[] = [];

      // STEP 0: Check appointmentDate requirement (Appointment Set+ stages)
      // This must be checked FIRST before all other requirements
      if (appointmentSetStage && toStage.orderIndex >= appointmentSetStage.orderIndex) {
        if (isMissing(customFields.appointmentDate)) {
          allRequiredFields.push('appointmentDate');
          allErrors.push('Appointment date and time are required before moving to this stage');
        }
      }

      // STEP 1: Check property info requirement (Appointment Complete+ stages)
      // This is checked FIRST so it appears before photos in the validation flow
      if (appointmentCompleteStage && toStage.orderIndex >= appointmentCompleteStage.orderIndex) {
        const propertyInfoRequired = ['hvacType', 'hvacAge', 'waterHeaterAge', 'roofAge', 'waterType', 'sewerType'] as const;
        const missing = propertyInfoRequired.filter((k) => isMissing(customFields[k]));

        if (missing.length > 0) {
          allRequiredFields.push(...(missing as any));
          allErrors.push('Additional property information is required before moving to this stage');
        }
      }

      // STEP 2: Check photos requirement (Appointment Complete+ stages)
      // This is checked SECOND so it appears after property info
      if (appointmentCompleteStage && toStage.orderIndex >= appointmentCompleteStage.orderIndex) {
        const photoCount = await prisma.leadFile.count({
          where: {
            leadId,
            file: {
              category: { equals: 'photos', mode: 'insensitive' },
            },
          },
        });

        if (photoCount < 3) {
          allRequiredFields.push('photos');
          allErrors.push('At least 3 property photos are required before moving to this stage');
        }
      }

      // DO NOT RETURN EARLY - continue checking DD Complete requirements too
      
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
        // Property info validation (these were already checked above for DD stage, but DD Complete also needs them)
        // Only add if not already in the list
        const ddPropertyFields = ['hvacType', 'hvacAge', 'waterHeaterAge', 'roofAge', 'waterType', 'sewerType'];
        ddPropertyFields.forEach(field => {
          if (isMissing(customFields[field]) && !allRequiredFields.includes(field)) {
            allRequiredFields.push(field);
          }
        });

        // DD Complete checklist: ARV input, comparables, rehab budget, underwriting calculator
        const arv = asNumber(customFields.arv);
        if (!arv || arv <= 0) allRequiredFields.push('arv');

        // Comparable properties can be entered as rows OR uploaded as comp PDFs.
        const comparableCount = await prisma.leadComparable.count({ where: { leadId } });
        const compPdfCount = await prisma.leadCompPdf.count({ where: { leadId } });
        if (comparableCount <= 0 && compPdfCount <= 0) allRequiredFields.push('comparables');

        // Rehab Budget can be stored as a RehabBudget row OR reflected in customFields (UI uses this value).
        const rehabBudgetRow = await prisma.rehabBudget.findUnique({ where: { leadId } });
        const rehabBudgetFromFields = asNumber(customFields.rehabBudget);
        const rehabBudgetValue = (rehabBudgetRow?.totalCost ?? rehabBudgetFromFields ?? 0);
        if (!rehabBudgetRow && (!rehabBudgetFromFields || rehabBudgetFromFields <= 0)) allRequiredFields.push('rehabBudget');

        // Underwriting can be saved as an UnderwritingCalculation row OR inferred from ARV + Rehab Budget.
        // This matches the UI, where Final Offer is derived from ARV + rehab budget without always persisting a row.
        const underwritingCalc = await prisma.underwritingCalculation.findFirst({ where: { leadId } });
        const finalOfferFromFields = asNumber(customFields.finalOffer);
        const taxesFromFields = asNumber((customFields as any).underwritingTaxes);
        const timelineFromFields = asNumber((customFields as any).underwritingTimeline);
        const taxesValue = (underwritingCalc as any)?.taxes ?? taxesFromFields ?? 0;
        const timelineValue = (underwritingCalc as any)?.timeline ?? timelineFromFields ?? 0;
        const inferredFinalOffer = arv && rehabBudgetValue
          ? (arv * 0.72) - rehabBudgetValue - 25000
          : 0;
        const hasUnderwriting =
          !!underwritingCalc ||
          (finalOfferFromFields !== null && finalOfferFromFields !== undefined && Number.isFinite(finalOfferFromFields)) ||
          (Number.isFinite(inferredFinalOffer)); // Removed > 0 check to allow $0 final offers
        if (!hasUnderwriting) allRequiredFields.push('underwritingCalculation');
        // Annual Taxes + Timeline must be explicitly entered (placeholders do not count).
        if (!taxesValue || taxesValue <= 0) allRequiredFields.push('underwritingTaxes');
        if (!timelineValue || timelineValue <= 0) allRequiredFields.push('underwritingTimeline');

        // Build error message for DD Complete requirements
        const ddCompleteFields = ['arv', 'comparables', 'rehabBudget', 'underwritingCalculation', 'underwritingTaxes', 'underwritingTimeline'];
        const hasDdCompleteIssues = allRequiredFields.some(f => ddCompleteFields.includes(f));
        if (hasDdCompleteIssues && !allErrors.includes('Due diligence checklist must be completed before moving to Due Diligence Complete')) {
          allErrors.push('Due diligence checklist must be completed before moving to Due Diligence Complete');
        }
      }
      
      // Return ALL collected validation errors at once
      if (allRequiredFields.length > 0) {
        return {
          valid: false,
          stageName: toStage.name,
          requiredFields: allRequiredFields,
          errors: allErrors,
        };
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

      // Disable ONLY stage-transition auto tasks by default.
      // Set ENABLE_STAGE_AUTO_TASKS=true to re-enable.
      const stageAutoTasksEnabled = String(process.env.ENABLE_STAGE_AUTO_TASKS || '').toLowerCase() === 'true';
      
      logger.info({ 
        leadId, 
        stageName, 
        customFields: JSON.stringify(customFields) 
      }, 'Executing post-transition actions');
      
      // Rule 2A: Appointment Complete → Create "Underwrite" task
      // DISABLED: Auto-task creation completely disabled
      if (stageName.includes('appointment') && stageName.includes('complete')) {
        // if (stageAutoTasksEnabled) {
        //   await taskRepository.create(leadId, {
        //     title: `Underwrite ${address}`,
        //     description: 'Review property photos and underwrite the deal',
        //     dueAt: new Date(),
        //     assignedToId: lead.assignedUserId || userId,
        //     createdById: userId
        //   });
        //   
        //   logger.info({ leadId, stageName: stage.name }, 'Auto-created Underwrite task');
        // } else {
          logger.info({ leadId, stageName: stage.name }, 'Skipped auto-created Underwrite task (disabled)');
        // }
      }
      
      // Rule 2B: Due Diligence Complete → Create "Make Offer" task
      // DISABLED: Auto-task creation completely disabled
      if (stageName.includes('due diligence') && stageName.includes('complete')) {
        // if (stageAutoTasksEnabled) {
        //   await taskRepository.create(leadId, {
        //     title: `Make Offer on ${address}`,
        //     description: 'Prepare and submit offer based on due diligence findings',
        //     dueAt: new Date(),
        //     assignedToId: lead.assignedUserId || userId,
        //     createdById: userId
        //   });
        //   
        //   logger.info({ leadId, stageName: stage.name }, 'Auto-created Make Offer task');
        // } else {
          logger.info({ leadId, stageName: stage.name }, 'Skipped auto-created Make Offer task (disabled)');
        // }
      }
      
      // Rule 2C: Offer Made → Conditional task creation
      // DISABLED: Auto-task creation completely disabled
      if (stageName.includes('offer') && stageName.includes('made')) {
        const response = customFields.offerMadeResponse?.toLowerCase();
        
        logger.info({ 
          leadId, 
          offerMadeResponse: customFields.offerMadeResponse,
          responseLower: response 
        }, 'Checking offer response for task creation');
        
        if (response === 'negotiating') {
          // if (stageAutoTasksEnabled) {
          //   // Follow up in 6 hours
          //   const dueDate = new Date();
          //   dueDate.setHours(dueDate.getHours() + 6);
          //   
          //   await taskRepository.create(leadId, {
          //     title: `Follow Up With ${address}`,
          //     description: 'Check on offer negotiation status',
          //     dueAt: dueDate,
          //     assignedToId: lead.assignedUserId || userId,
          //     createdById: userId
          //   });
          //   
          //   logger.info({ leadId, stageName: stage.name }, 'Auto-created Follow Up task (negotiating)');
          // } else {
            logger.info({ leadId, stageName: stage.name }, 'Skipped auto-created Follow Up task (disabled)');
          // }
        } else if (response === 'rejected') {
          // TEMP: Disable auto-created Re-Offer task.
          // Keeping the rest of Offer Made automation intact.
          logger.info({ leadId, stageName: stage.name }, 'Skipped auto-created Re-Offer task (rejected) - temporarily disabled');
        } else if (response === 'accepted') {
          // Check if DocuSign is enabled
          if (env.DOCUSIGN_ENABLED) {
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
              
              // DISABLED: Auto-task creation completely disabled
              // Create task to follow up
              // await taskRepository.create(leadId, {
              //   title: `Contract Sent - Awaiting Signature for ${address}`,
              //   description: `DocuSign contract sent. Expires on ${envelopeResult.voidAt.toLocaleDateString()}. Envelope ID: ${envelopeResult.envelopeId}`,
              //   dueAt: new Date(envelopeResult.voidAt.getTime() - 24 * 60 * 60 * 1000), // 1 day before expiration
              //   assignedToId: lead.assignedUserId || userId,
              //   createdById: userId
              // });
              
              logger.info({ 
                leadId, 
                envelopeId: envelopeResult.envelopeId,
                voidAt: envelopeResult.voidAt
              }, 'Contract sent via DocuSign successfully (auto-task creation disabled)');
              
            } catch (error: any) {
              logger.error({ 
                leadId, 
                error: error.message 
              }, 'Failed to send contract via DocuSign');
              
              // DISABLED: Auto-task creation completely disabled
              // Create task for manual follow-up
              // await taskRepository.create(leadId, {
              //   title: `URGENT: DocuSign Failed for ${address}`,
              //   description: `Failed to send contract via DocuSign: ${error.message}. Please send contract manually.`,
              //   dueAt: new Date(),
              //   assignedToId: lead.assignedUserId || userId,
              //   createdById: userId
              // });
              
              logger.error({ leadId }, 'DocuSign failed - auto-task creation disabled, please handle manually');
              
              // Don't throw - log error but don't block stage transition
            }
          } else {
            // DocuSign is disabled - handle contract manually
            logger.info({ leadId, stageName: stage.name }, 'Offer accepted - DocuSign is DISABLED, contract must be handled manually');
            
            // Find "Contract Sent" status and update lead to indicate manual process
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
                data: { 
                  leadStatusId: contractSentStatus.id,
                  contractStatus: 'MANUAL' // Mark as requiring manual handling
                }
              });
              logger.info({ leadId }, 'Lead status updated to Contract Sent (MANUAL) - DocuSign disabled');
            }
          }
        }
      }
      
      // Rule 2D: Contract Void → Create check task
      // DISABLED: Auto-task creation completely disabled
      if (stageName.includes('void')) {
        // const dueDate = new Date();
        // dueDate.setHours(dueDate.getHours() + 1); // 1 hour from now
        // 
        // await taskRepository.create(leadId, {
        //   title: `Check Voided Contract With ${address}`,
        //   description: 'Review voided contract and determine next steps',
        //   dueAt: dueDate,
        //   assignedToId: lead.assignedUserId || userId,
        //   createdById: userId
        // });
        
        logger.info({ leadId, stageName: stage.name }, 'Skipped auto-created Void Check task (disabled)');
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

