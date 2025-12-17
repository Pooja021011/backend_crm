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
      select: { pipelineStageId: true }
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
    
    // EXISTING LOGIC - UNCHANGED
    const updated = await leadRepository.changeStage(leadId, toStageId, userId);
    
    // EXISTING: Auto-create/update Deal timestamps based on stage names
    const stage = updated?.pipelineStage;
    const name = (stage?.name || '').toLowerCase();
    if (name.includes('contract')) {
      await dealRepository.upsertByLeadId(leadId, { contractedAt: new Date() });
    }
    if (name.includes('closed')) {
      await dealRepository.upsertByLeadId(leadId, { closedAt: new Date() });
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
};

