import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

/**
 * Service for detecting communication responses and auto-updating lead status
 * This is ADDITIVE - doesn't break existing communication logging
 */
export const communicationResponseService = {
  
  /**
   * Handle communication event and update lead status if needed
   * Called AFTER communication is already logged (non-breaking)
   */
  async handleCommunicationEvent(
    leadId: string,
    direction: 'INBOUND' | 'OUTBOUND',
    type: 'CALL' | 'SMS' | 'EMAIL'
  ): Promise<void> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          pipelineStage: { select: { id: true, name: true, orderIndex: true, pipelineId: true } },
        }
      });
      
      if (!lead) {
        logger.warn('Lead not found for communication event', { leadId });
        return;
      }
      
      const currentStageName = (lead.pipelineStage?.name || '').toLowerCase();
      const currentStageId = lead.pipelineStage?.id || null;
      const currentOrderIndex = typeof lead.pipelineStage?.orderIndex === 'number' ? lead.pipelineStage.orderIndex : null;
      const pipelineId = lead.pipelineStage?.pipelineId || null;

      if (!pipelineId) {
        logger.warn('Lead has no pipelineStage/pipelineId; skipping pipeline automation', { leadId });
        return;
      }

      const findStageByExactName = async (name: string) => {
        return prisma.pipelineStage.findFirst({
          where: {
            pipelineId,
            name: { equals: name, mode: 'insensitive' },
          },
          select: { id: true, name: true, orderIndex: true },
        });
      };

      const moveLeadToStage = async (toStage: { id: string; name: string; orderIndex: number } | null) => {
        if (!toStage) return;
        if (toStage.id === currentStageId) return;
        if (currentOrderIndex !== null && typeof toStage.orderIndex === 'number' && toStage.orderIndex < currentOrderIndex) return;

        await prisma.lead.update({
          where: { id: leadId },
          data: {
            pipelineStageId: toStage.id,
            stageEnteredAt: new Date(),
            updatedAt: new Date(),
          },
        });

        if (currentStageId) {
          await prisma.stageHistory.create({
            data: {
              leadId,
              fromStageId: currentStageId,
              toStageId: toStage.id,
              changedById: null,
              changedAt: new Date(),
            },
          });
        }

        logger.info('Auto-updated lead pipeline stage', {
          leadId,
          fromStage: lead.pipelineStage?.name,
          toStage: toStage.name,
          communicationType: type,
          direction,
        });
      };
      
      // Rule: Auto pipeline stage changes based on communication
      if (direction === 'OUTBOUND') {
        // Outbound CALL/SMS attempt: if current stage is exactly "New Lead" → set to "No Contact Made"
        if (currentStageName === 'new lead') {
          const noContactMadeStage = await findStageByExactName('No Contact Made');
          await moveLeadToStage(noContactMadeStage);
        }
      } else if (direction === 'INBOUND') {
        // Inbound CALL/SMS from lead: if current stage is "New Lead" or "No Contact Made" → set to "Contact Made"
        if (currentStageName === 'new lead' || currentStageName === 'no contact made') {
          const contactMadeStage = await findStageByExactName('Contact Made');
          await moveLeadToStage(contactMadeStage);
        }
      }
    } catch (error: any) {
      // Don't throw - this is a background enhancement, shouldn't break communication logging
      logger.error('Error handling communication event', { 
        error: error.message, 
        leadId,
        direction,
        type 
      });
    }
  }
};

