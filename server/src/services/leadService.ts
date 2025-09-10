import { leadRepository, type LeadCreateInput } from '../repositories/leadRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { prisma } from '../config/db.js';

export const leadService = {
  create: (input: LeadCreateInput, createdById?: string) => leadRepository.create(input, createdById),
  update: (id: string, data: any) => leadRepository.update(id, data),
  get: (id: string) => leadRepository.findById(id),
  list: (params: any) => leadRepository.list(params),
  changeStage: (leadId: string, toStageId: string, userId?: string) => leadRepository.changeStage(leadId, toStageId, userId),

  listTasks: (leadId: string) => taskRepository.listByLead(leadId),
  createTask: (leadId: string, input: { title: string; description?: string; dueAt: string; assignedToId?: string; createdById?: string }) =>
    taskRepository.create(leadId, { title: input.title, description: input.description, dueAt: new Date(input.dueAt), assignedToId: input.assignedToId, createdById: input.createdById }),
  updateTask: (taskId: string, input: any) => taskRepository.update(taskId, input),
  deleteTask: (taskId: string) => taskRepository.delete(taskId),

  suggestions: (q: string) => leadRepository.suggestions(q),
};

