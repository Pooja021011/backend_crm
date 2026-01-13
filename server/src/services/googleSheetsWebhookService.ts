import { prisma } from '../config/db.js';
import { leadAssignmentService } from './leadAssignmentService.js';
import type { LeadType } from '@prisma/client';
import { logger } from '../config/logger.js';

interface GoogleSheetLeadData {
  leadType: 'SELLER' | 'BUYER' | 'VENDOR';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  motivation?: string;
  notes?: string;
  leadSource?: string;
  propertyType?: string;
  priceRange?: string;
  timeline?: string;
  
  // Buyer specific
  vip?: boolean;
  preApproved?: boolean;
  creditScore?: string;
  
  // Vendor specific
  company?: string;
  industry?: string;
  
  // Custom fields
  customFields?: Record<string, any>;
}

export const googleSheetsWebhookService = {
  /**
   * Process a lead from Google Sheets webhook
   */
  async processIncomingLead(data: GoogleSheetLeadData) {
    console.log('Processing incoming lead from Google Sheets:', data);

    // Validate required fields
    this.validateLeadData(data);

    // DEBUG LOG: Google Sheets lead import (H7)
    logger.info({
      event: 'LEAD_CREATE_GOOGLE_SHEETS',
      leadType: data.leadType,
      source: 'google_sheets_webhook',
      usesDistribution: true
    }, 'Processing lead from Google Sheets - will use distribution service');

    // Get next agent for assignment
    const assignedUserId = await leadAssignmentService.getNextAgentForAssignment();

    if (!assignedUserId) {
      logger.error({
        event: 'LEAD_CREATE_GOOGLE_SHEETS_NO_AGENT',
        leadType: data.leadType
      }, 'Failed to create Google Sheets lead - no active agents available');
      throw new Error('No active agents available for lead assignment');
    }

    // DEBUG LOG: Agent assigned via distribution
    logger.info({
      event: 'LEAD_CREATE_GOOGLE_SHEETS_AGENT_ASSIGNED',
      assignedUserId,
      leadType: data.leadType
    }, `Google Sheets lead will be assigned to: ${assignedUserId}`);

    // Find the default pipeline stage for the lead type
    const defaultStage = await this.getDefaultPipelineStage(data.leadType);

    // Create the lead with all related data in a transaction
    const lead = await prisma.$transaction(async (tx) => {
      // Create the main lead record
      const newLead = await tx.lead.create({
        data: {
          leadType: data.leadType as LeadType,
          assignedUserId,
          pipelineStageId: defaultStage?.id,
          stageEnteredAt: new Date(),
          customFields: {
            leadSource: data.leadSource || 'Google Sheets',
            propertyType: data.propertyType,
            priceRange: data.priceRange,
            timeline: data.timeline,
            ...data.customFields,
          },
        },
      });

      // Create address if provided
      if (data.address1 && data.city && data.state && data.zip) {
        await tx.leadAddress.create({
          data: {
            leadId: newLead.id,
            address1: data.address1,
            city: data.city,
            state: data.state,
            zip: data.zip,
          },
        });
      }

      // Create type-specific details
      if (data.leadType === 'SELLER') {
        await tx.sellerDetail.create({
          data: {
            leadId: newLead.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            motivation: data.motivation,
            notes: data.notes,
          },
        });
      } else if (data.leadType === 'BUYER') {
        await tx.buyerDetail.create({
          data: {
            leadId: newLead.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            vip: data.vip || false,
            preApproved: data.preApproved || false,
            creditScore: data.creditScore,
            motivation: data.timeline,
            timeline: data.timeline,
          },
        });
      } else if (data.leadType === 'VENDOR') {
        await tx.vendorDetail.create({
          data: {
            leadId: newLead.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            company: data.company || '',
            industry: data.industry || '',
            marketIds: [],
          },
        });
      }

      // Create stage history entry
      if (defaultStage) {
        await tx.stageHistory.create({
          data: {
            leadId: newLead.id,
            toStageId: defaultStage.id,
            changedAt: new Date(),
          },
        });
      }

      return newLead;
    });

    // Fetch the complete lead with all relations
    const completeLead = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: {
        address: true,
        seller: true,
        buyer: true,
        vendor: true,
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        pipelineStage: {
          include: {
            pipeline: true,
          },
        },
      },
    });

    console.log('Lead created successfully:', {
      leadId: lead.id,
      assignedTo: assignedUserId,
      leadType: data.leadType,
    });

    return completeLead;
  },

  /**
   * Process multiple leads in batch
   */
  async processBatchLeads(leads: GoogleSheetLeadData[]) {
    const results = {
      successful: [] as any[],
      failed: [] as { data: GoogleSheetLeadData; error: string }[],
    };

    for (const leadData of leads) {
      try {
        const lead = await this.processIncomingLead(leadData);
        results.successful.push(lead);
      } catch (error: any) {
        console.error('Failed to process lead:', error);
        results.failed.push({
          data: leadData,
          error: error.message,
        });
      }
    }

    return results;
  },

  /**
   * Validate incoming lead data
   */
  validateLeadData(data: GoogleSheetLeadData) {
    const requiredFields = ['leadType', 'firstName', 'lastName', 'email', 'phone'];

    for (const field of requiredFields) {
      if (!data[field as keyof GoogleSheetLeadData]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate lead type
    if (!['SELLER', 'BUYER', 'VENDOR'].includes(data.leadType)) {
      throw new Error(`Invalid lead type: ${data.leadType}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error(`Invalid email format: ${data.email}`);
    }

    return true;
  },

  /**
   * Get default pipeline stage for lead type
   */
  async getDefaultPipelineStage(leadType: string) {
    let pipelineKey: 'ACQUISITIONS' | 'DISPOSITIONS' | 'TRANSACTION' = 'ACQUISITIONS';

    if (leadType === 'BUYER') {
      pipelineKey = 'DISPOSITIONS';
    }

    const pipeline = await prisma.pipelineDefinition.findUnique({
      where: { key: pipelineKey },
      include: {
        stages: {
          where: { isDefault: true },
          orderBy: { orderIndex: 'asc' },
          take: 1,
        },
      },
    });

    return pipeline?.stages[0] || null;
  },

  /**
   * Get webhook statistics
   */
  async getWebhookStats(startDate?: Date, endDate?: Date) {
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30); // Last 30 days
      return d;
    })();

    const end = endDate || new Date();

    const leads = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        customFields: {
          path: ['leadSource'],
          equals: 'Google Sheets',
        },
      },
      select: {
        id: true,
        leadType: true,
        createdAt: true,
        assignedUserId: true,
      },
    });

    const byType = leads.reduce((acc, lead) => {
      acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDay = leads.reduce((acc, lead) => {
      const day = lead.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLeads: leads.length,
      byType,
      byDay,
      startDate: start,
      endDate: end,
    };
  },
};
