import { prisma } from '../config/db.js';
import type { TaskStatus } from '@prisma/client';

export const taskRepository = {
  listByLead: (leadId: string) => prisma.task.findMany({ where: { leadId }, orderBy: { dueAt: 'asc' } }),
  create: (leadId: string, data: { title: string; description?: string; dueAt: Date; assignedToId?: string; createdById?: string }) =>
    prisma.task.create({ data: { leadId, title: data.title, description: data.description, dueAt: data.dueAt, assignedToId: data.assignedToId || null, createdById: data.createdById || null } }),
  update: (id: string, data: Partial<{ title: string; description?: string; dueAt: Date; status: TaskStatus; assignedToId?: string }>) =>
    prisma.task.update({ where: { id }, data }),
  delete: (id: string) => prisma.task.delete({ where: { id } }),
};

