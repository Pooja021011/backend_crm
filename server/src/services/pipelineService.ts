import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

export interface PipelineLeadFilters {
  needsAttention?: boolean;
  assignedUserId?: string;
}

export const pipelineService = {
  /**
   * Get all stages for a specific pipeline
   */
  async getPipelineStages(pipelineKey: string) {
    try {
      const pipeline = await prisma.pipelineDefinition.findUnique({
        where: { key: pipelineKey as any },
        include: {
          stages: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              name: true,
              orderIndex: true,
              color: true,
              _count: {
                select: {
                  leads: true
                }
              }
            }
          }
        }
      });

      if (!pipeline) {
        throw new Error(`Pipeline with key ${pipelineKey} not found`);
      }

      return pipeline.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        orderIndex: stage.orderIndex,
        color: stage.color || 'gray',
        leadCount: stage._count.leads
      }));
    } catch (error: any) {
      logger.error('Error getting pipeline stages', { pipelineKey, error: error.message });
      throw error;
    }
  },

  /**
   * Get all leads in a pipeline with their details
   */
  async getPipelineLeads(pipelineKey: string, filters: PipelineLeadFilters = {}) {
    try {
      const pipeline = await prisma.pipelineDefinition.findUnique({
        where: { key: pipelineKey as any },
        select: { id: true }
      });

      if (!pipeline) {
        throw new Error(`Pipeline with key ${pipelineKey} not found`);
      }

      const whereClause: any = {
        pipelineStage: {
          pipelineId: pipeline.id
        }
      };

      if (filters.assignedUserId) {
        whereClause.assignedUserId = filters.assignedUserId;
      }

      const leads = await prisma.lead.findMany({
        where: whereClause,
        include: {
          address: true,
          seller: true,
          buyer: true,
          pipelineStage: true,
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          communications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              createdAt: true,
              type: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Transform leads to match frontend format
      const transformedLeads = leads.map(lead => {
        const lastContact = lead.communications[0]?.createdAt || lead.createdAt;
        
        return {
          id: lead.id,
          address: lead.address ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}` : 'Address not provided',
          sellerName: lead.seller ? `${lead.seller.firstName} ${lead.seller.lastName}` : 'No seller info',
          buyerName: lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : '',
          dateCreated: lead.createdAt,
          statusChangedDate: lead.updatedAt,
          lastContactDate: lastContact,
          priceReduction: false, // TODO: Implement price tracking
          clearToClose: lead.status === 'clear_to_close',
          originalPrice: null, // TODO: Implement price tracking
          currentPrice: null, // TODO: Implement price tracking
          stage: lead.pipelineStage?.id || '',
          stageName: lead.pipelineStage?.name || '',
          assignedAgent: lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : 'Unassigned',
          leadType: lead.leadType,
          status: lead.status
        };
      });

      // Filter for needs attention if requested
      if (filters && filters.needsAttention === true) {
        const now = new Date();
        const filteredLeads = transformedLeads.filter(lead => {
          // No contact in 72+ hours
          const hoursSinceLastContact = Math.floor((now.getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60));
          
          return (
            hoursSinceLastContact >= 72 ||
            lead.status === 'urgent' ||
            lead.clearToClose === false
          );
        });
        
        return filteredLeads;
      }

      return transformedLeads;
    } catch (error: any) {
      logger.error('Error getting pipeline leads', { pipelineKey, filters, error: error.message });
      throw error;
    }
  },

  /**
   * Move a lead to a different pipeline stage
   */
  async moveLeadToStage(leadId: string, stageId: string, userId?: string) {
    try {
      // Get current lead to track previous stage
      const currentLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { pipelineStageId: true }
      });

      if (!currentLead) {
        throw new Error('Lead not found');
      }

      // Verify the new stage exists
      const stage = await prisma.pipelineStage.findUnique({
        where: { id: stageId },
        select: { id: true, name: true }
      });

      if (!stage) {
        throw new Error('Pipeline stage not found');
      }

      // Don't move if it's the same stage
      if (currentLead.pipelineStageId === stageId) {
        return {
          leadId,
          newStageId: stageId,
          newStageName: stage.name,
          updatedAt: new Date()
        };
      }

      // Update the lead's pipeline stage
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          pipelineStageId: stageId,
          updatedAt: new Date()
        },
        include: {
          pipelineStage: true
        }
      });

      // Create stage history record
      await prisma.stageHistory.create({
        data: {
          leadId: leadId,
          fromStageId: currentLead.pipelineStageId,
          toStageId: stageId,
          changedById: userId,
          changedAt: new Date()
        }
      });

      logger.info('Lead moved to new stage', { 
        leadId, 
        stageId, 
        stageName: stage.name, 
        userId 
      });

      return {
        leadId,
        newStageId: stageId,
        newStageName: stage.name,
        updatedAt: updatedLead.updatedAt
      };
    } catch (error: any) {
      logger.error('Error moving lead to stage', { 
        leadId, 
        stageId, 
        userId, 
        error: error.message,
        stack: error.stack,
        code: error.code
      });
      throw new Error(`Failed to move lead: ${error.message}`);
    }
  },

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(pipelineKey: string) {
    try {
      const pipeline = await prisma.pipelineDefinition.findUnique({
        where: { key: pipelineKey as any },
        include: {
          stages: {
            include: {
              _count: {
                select: {
                  leads: true
                }
              }
            },
            orderBy: { orderIndex: 'asc' }
          }
        }
      });

      if (!pipeline) {
        throw new Error(`Pipeline with key ${pipelineKey} not found`);
      }

      const totalLeads = await prisma.lead.count({
        where: {
          pipelineStage: {
            pipelineId: pipeline.id
          }
        }
      });

      const stageStats = pipeline.stages.map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        leadCount: stage._count.leads,
        percentage: totalLeads > 0 ? Math.round((stage._count.leads / totalLeads) * 100) : 0
      }));

      return {
        totalLeads,
        stageStats,
        needsAttentionCount: 0 // TODO: Implement needs attention logic
      };
    } catch (error: any) {
      logger.error('Error getting pipeline stats', { pipelineKey, error: error.message });
      throw error;
    }
  },

  /**
   * Get leads that need attention
   */
  async getNeedsAttentionLeads(pipelineKey: string) {
    try {
      const leads = await this.getPipelineLeads(pipelineKey);
      return this.filterNeedsAttentionLeads(leads);
    } catch (error: any) {
      logger.error('Error getting needs attention leads', { pipelineKey, error: error.message });
      throw error;
    }
  },

  /**
   * Filter leads that need attention based on business rules
   * This function is kept for potential future use but the logic is now inlined
   */
  filterNeedsAttentionLeads(leads: any[]) {
    const now = new Date();
    
    return leads.filter(lead => {
      const hoursSinceLastContact = Math.floor((now.getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60));
      
      return (
        hoursSinceLastContact >= 72 ||
        lead.status === 'urgent' ||
        lead.clearToClose === false
      );
    });
  }
};
