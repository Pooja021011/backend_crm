import { leadRepository, type LeadCreateInput } from '../repositories/leadRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { prisma } from '../config/db.js';
import { dealRepository } from '../repositories/dealRepository.js';
import { stageTransitionService } from './stageTransitionService.js';

export const leadService = {
  create: (input: LeadCreateInput, createdById?: string) => leadRepository.create(input, createdById),
  update: (id: string, data: any) => leadRepository.update(id, data),
  get: (id: string) => leadRepository.findById(id),
  list: (params: any) => leadRepository.list(params),
  delete: (id: string) => leadRepository.delete(id),
  changeStage: async (leadId: string, toStageId: string, userId?: string) => {
    // NEW: Validation check before stage change
    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { pipelineStageId: true, customFields: true }
    });
    
    const validation = await stageTransitionService.validateStageTransition(
      leadId,
      currentLead?.pipelineStageId || null,
      toStageId
    );
    
    if (!validation.valid) {
      const error: any = new Error(validation.errors?.[0] || 'Validation failed');
      error.code = 'VALIDATION_REQUIRED';
      error.requiredFields = validation.requiredFields;
      error.stageName = validation.stageName;
      throw error;
    }
    
    // PRE-UPDATE: Track stage transition dates BEFORE changing stage
    // This prevents race condition with frontend autosave
    const toStage = await prisma.pipelineStage.findUnique({
      where: { id: toStageId },
      select: { name: true }
    });
    
    if (toStage) {
      const stageName = (toStage.name || '').toLowerCase();
      // CRITICAL: Re-fetch customFields to ensure we have latest data
      // This prevents overwriting recently saved data (e.g., from frontend autosave)
      const freshLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { customFields: true }
      });
      
      const currentCustomFields = (freshLead?.customFields as any) || {};
      const dateFieldsToAdd: any = {};
      
      // Track "Offer Made" stage transition
      if (stageName.includes('offer') && stageName.includes('made') && !currentCustomFields.offerMadeAt) {
        dateFieldsToAdd.offerMadeAt = new Date().toISOString();
      }
      
      // Track "Under Contract" stage transition
      // Only set when moving to actual "Under Contract" stage, NOT "Contract Sent"
      if (stageName.includes('contract') && 
          !stageName.includes('offer') && 
          !stageName.includes('sent') && 
          !currentCustomFields.underContractAt) {
        dateFieldsToAdd.underContractAt = new Date().toISOString();
      }
      
      // Update customFields BEFORE stage change to avoid race condition
      // CRITICAL: Send ONLY the new date fields - leadRepository.update will merge with existing data
      if (Object.keys(dateFieldsToAdd).length > 0) {
        await leadRepository.update(leadId, { 
          customFields: dateFieldsToAdd  // Only the new date fields - merge will preserve rest
        });
      }
    }
    
    // EXISTING LOGIC - Change the stage
    const updated = await leadRepository.changeStage(leadId, toStageId, userId);
    
    // Deal timestamps based on stage names
    const stage = updated?.pipelineStage;
    const name = (stage?.name || '').toLowerCase();
    
    if (name.includes('contract') && !name.includes('offer')) {
      await dealRepository.upsertByLeadId(leadId, { contractedAt: new Date() });
    }
    
    if (name.includes('closed')) {
      await dealRepository.upsertByLeadId(leadId, { closedAt: new Date() });
    }
    
    // NEW: Auto-update lead status to "Closed" when moving to Closed stage
    if (name.includes('closed')) {
      const closedStatus = await prisma.leadStatus.findFirst({
        where: { name: { equals: 'Closed', mode: 'insensitive' } }
      });
      
      if (closedStatus) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { leadStatusId: closedStatus.id }
        });
      }
    }
    
    // NEW: Execute post-transition actions (task creation)
    if (userId) {
      await stageTransitionService.executePostTransitionActions(leadId, toStageId, userId);
    }
    
    return updated;
  },

  getStageHistory: async (leadId: string) => {
    return await prisma.stageHistory.findMany({
      where: { leadId },
      include: {
        fromStage: {
          select: {
            id: true,
            name: true
          }
        },
        toStage: {
          select: {
            id: true,
            name: true
          }
        },
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        changedAt: 'desc'
      }
    });
  },

  listTasks: (leadId: string) => taskRepository.listByLead(leadId),
  createTask: (leadId: string, input: { title: string; description?: string; dueAt: string; assignedToId?: string; createdById?: string }) =>
    taskRepository.create(leadId, { title: input.title, description: input.description, dueAt: new Date(input.dueAt), assignedToId: input.assignedToId, createdById: input.createdById }),
  updateTask: (taskId: string, input: any) => taskRepository.update(taskId, input),
  deleteTask: (taskId: string) => taskRepository.delete(taskId),

  suggestions: (q: string) => leadRepository.suggestions(q),

  async findByPhoneNumber(phoneNumber: string): Promise<any> {
    try {
      // Search in lead detail tables (seller, buyer, vendor) for phone numbers
      const lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { seller: { phone: phoneNumber } },
            { seller: { phone: phoneNumber.replace(/\D/g, '') } },
            { seller: { phone: phoneNumber.replace(/^\+1/, '') } },
            { buyer: { phone: phoneNumber } },
            { buyer: { phone: phoneNumber.replace(/\D/g, '') } },
            { buyer: { phone: phoneNumber.replace(/^\+1/, '') } },
            { vendor: { phone: phoneNumber } },
            { vendor: { phone: phoneNumber.replace(/\D/g, '') } },
            { vendor: { phone: phoneNumber.replace(/^\+1/, '') } },
          ]
        },
        include: {
          seller: true,
          buyer: true,
          vendor: true,
          address: true,
        }
      });
      
      return lead;
    } catch (error: any) {
      console.error('Error finding lead by phone number', { error: error.message, phoneNumber });
      return null;
    }
  },
};

