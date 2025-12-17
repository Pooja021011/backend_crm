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
          pipelineStage: { select: { name: true } },
          leadStatus: { select: { name: true } }
        }
      });
      
      if (!lead) {
        logger.warn('Lead not found for communication event', { leadId });
        return;
      }
      
      const currentStatus = lead.leadStatus?.name?.toLowerCase() || '';
      
      // Rule 3: Auto status changes based on communication
      if (direction === 'OUTBOUND') {
        // First outbound → Set to "No Contact Made" (if not already past this)
        // Only update if current status doesn't indicate contact has been made
        if (!currentStatus.includes('contact')) {
          const noContactStatus = await prisma.leadStatus.findFirst({
            where: { 
              name: { 
                contains: 'No Contact', 
                mode: 'insensitive' 
              } 
            }
          });
          
          if (noContactStatus) {
            await prisma.lead.update({
              where: { id: leadId },
              data: { 
                leadStatusId: noContactStatus.id,
                lastContactAt: new Date() // Update lastContactAt
              }
            });
            
            logger.info('Auto-updated lead status to No Contact Made', { 
              leadId, 
              communicationType: type,
              direction 
            });
          }
        }
      } else if (direction === 'INBOUND') {
        // First inbound response → Set to "Contact Made" (forward only)
        // Only update if current status is "No Contact" or doesn't mention contact
        if (currentStatus.includes('no contact') || !currentStatus.includes('contact')) {
          const contactMadeStatus = await prisma.leadStatus.findFirst({
            where: { 
              name: { 
                contains: 'Contact Made', 
                mode: 'insensitive' 
              } 
            }
          });
          
          if (contactMadeStatus) {
            await prisma.lead.update({
              where: { id: leadId },
              data: { 
                leadStatusId: contactMadeStatus.id,
                lastContactAt: new Date() // Update lastContactAt
              }
            });
            
            logger.info('Auto-updated lead status to Contact Made', { 
              leadId, 
              communicationType: type,
              direction 
            });
          }
        } else {
          // Even if status doesn't change, update lastContactAt for inbound
          await prisma.lead.update({
            where: { id: leadId },
            data: { lastContactAt: new Date() }
          });
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

