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
    
    // Get current and new stages with orderIndex and pipeline info
    const [currentStage, toStage] = await Promise.all([
      currentLead?.pipelineStageId 
        ? prisma.pipelineStage.findUnique({
            where: { id: currentLead.pipelineStageId },
            select: { 
              name: true, 
              orderIndex: true,
              pipeline: { select: { key: true } }
            }
          })
        : null,
      prisma.pipelineStage.findUnique({
        where: { id: toStageId },
        select: { 
          name: true, 
          orderIndex: true,
          pipeline: { select: { key: true } }
        }
      })
    ]);
    
    // CRITICAL: Re-fetch customFields to ensure we have latest data
    const freshLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customFields: true }
    });
    
    const currentCustomFields = (freshLead?.customFields as any) || {};
    const dateFieldsToUpdate: any = {};
    
    // Check if moving backwards and if it's ACQUISITIONS pipeline
    const isMovingBackwards = currentStage && toStage && 
      toStage.orderIndex < currentStage.orderIndex;
    // CRITICAL: Only clear data when BOTH stages are in ACQUISITIONS pipeline
    // Don't clear when moving to/from DISPOSITIONS or TRANSACTION pipelines
    const isAcquisitionsPipeline = currentStage?.pipeline?.key === 'ACQUISITIONS' && 
                                    toStage?.pipeline?.key === 'ACQUISITIONS';
    
    // BACKWARD MOVEMENT: Clear timeline dates in reverse order (ACQUISITIONS only)
    if (isMovingBackwards && isAcquisitionsPipeline && currentStage && toStage) {
      const currentOrderIndex = currentStage.orderIndex;
      const toOrderIndex = toStage.orderIndex;
      
      // Rule 1: Clear underContractAt if moving from Under Contract (orderIndex >= 8) to earlier stage
      if (currentOrderIndex >= 8 && toOrderIndex < 8) {
        dateFieldsToUpdate.underContractAt = null;
      }
      
      // Rule 2: Clear offerMadeAt if moving from Offer Made or later (orderIndex >= 6) to earlier stage
      if (currentOrderIndex >= 6 && toOrderIndex < 6) {
        dateFieldsToUpdate.offerMadeAt = null;
      }
      
      // Rule 3: Clear appointmentDate if moving from Appointment Set/Complete (orderIndex >= 3) to earlier stage
      if (currentOrderIndex >= 3 && toOrderIndex < 3) {
        dateFieldsToUpdate.appointmentDate = null;
      }
    }
    
    // FORWARD MOVEMENT: Set timeline dates when moving forward (ACQUISITIONS only)
    if (toStage) {
      const stageName = (toStage.name || '').toLowerCase();
      const isAcqPipeline = toStage.pipeline?.key === 'ACQUISITIONS';
      
      // Track "Appointment Set" stage transition (orderIndex 3)
      // Set appointmentDate when moving to Appointment Set (first time appointment is scheduled)
      if (isAcqPipeline && 
          stageName.includes('appointment') && 
          stageName.includes('set') &&
          !stageName.includes('complete') &&
          !currentCustomFields.appointmentDate) {
        dateFieldsToUpdate.appointmentDate = new Date().toISOString();
      }
      
      // Track "Appointment Complete" stage transition (orderIndex 4)
      // If appointmentDate doesn't exist, set it (in case someone moves directly to Appointment Complete)
      // Otherwise, keep the original appointmentDate from Appointment Set
      if (isAcqPipeline && 
          stageName.includes('appointment') && 
          stageName.includes('complete') &&
          !currentCustomFields.appointmentDate) {
        dateFieldsToUpdate.appointmentDate = new Date().toISOString();
      }
      
      // Track "Offer Made" stage transition (orderIndex 6)
      // Set offerMadeAt when moving to Offer Made stage
      if (isAcqPipeline &&
          stageName.includes('offer') && 
          stageName.includes('made') && 
          !currentCustomFields.offerMadeAt) {
        dateFieldsToUpdate.offerMadeAt = new Date().toISOString();
      }
      
      // Track "Under Contract" stage transition (orderIndex 8)
      // Set underContractAt when moving to Under Contract stage
      if (isAcqPipeline &&
          stageName.includes('contract') && 
          !stageName.includes('offer') && 
          !stageName.includes('sent') && 
          !currentCustomFields.underContractAt) {
        dateFieldsToUpdate.underContractAt = new Date().toISOString();
        
        // CRITICAL: If moving directly to "Under Contract" (skipping "Offer Made"),
        // also set offerMadeAt if it doesn't exist (logically, you can't be under contract without making an offer)
        if (!currentCustomFields.offerMadeAt) {
          dateFieldsToUpdate.offerMadeAt = new Date().toISOString();
        }
        
        // CRITICAL: If moving directly to "Under Contract" (skipping "Appointment Set/Complete"),
        // also set appointmentDate if it doesn't exist (logically, you need appointment before contract)
        if (!currentCustomFields.appointmentDate) {
          dateFieldsToUpdate.appointmentDate = new Date().toISOString();
        }
      }
    }
    
    // Update customFields BEFORE stage change to avoid race condition
    if (Object.keys(dateFieldsToUpdate).length > 0) {
      // Fetch current customFields to merge properly
      const currentLeadForUpdate = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { customFields: true }
      });
      
      const existingCustomFields = (currentLeadForUpdate?.customFields as any) || {};
      
      // Merge existing fields with updates
      // Explicitly set null values to clear fields (don't delete keys, set to null)
      const mergedCustomFields: any = { ...existingCustomFields };
      
      // Apply all updates (including null values to clear fields)
      Object.keys(dateFieldsToUpdate).forEach(key => {
        mergedCustomFields[key] = dateFieldsToUpdate[key];
      });
      
      // Update using Prisma directly to ensure JSON field is properly updated
      // This bypasses the repository merge logic to have full control
      await prisma.lead.update({
        where: { id: leadId },
        data: { customFields: mergedCustomFields }
      });
    }
    
    // EXISTING LOGIC - Change the stage
    const updated = await leadRepository.changeStage(leadId, toStageId, userId);
    
    // Deal timestamps based on stage names
    const stage = updated?.pipelineStage;
    const name = (stage?.name || '').toLowerCase();
    
    // Clear deal.contractedAt and contractPrice if underContractAt was cleared (backward movement in ACQUISITIONS only)
    // CRITICAL: Only clear when BOTH stages are in ACQUISITIONS pipeline
    if (isMovingBackwards && isAcquisitionsPipeline && currentStage && toStage) {
      const currentOrderIndex = currentStage.orderIndex;
      const toOrderIndex = toStage.orderIndex;
      
      if (currentOrderIndex >= 8 && toOrderIndex < 8) {
        // Clear both contractedAt and contractPrice when moving backwards from Under Contract
        await dealRepository.upsertByLeadId(leadId, { 
          contractedAt: null,
          contractPrice: null 
        });
      }
    } else if (name.includes('contract') && !name.includes('offer')) {
      // Set deal.contractedAt when moving forward to Under Contract
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

