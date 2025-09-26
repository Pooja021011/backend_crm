import { prisma } from '../config/db.js';

export const inboxRepository = {
  listAssignedTasks: (userId: string) =>
    prisma.task.findMany({
      where: { assignedToId: userId, status: 'OPEN' as any },
      orderBy: { dueAt: 'asc' },
      include: { lead: true },
    }),

  listCommunications: (filters: { userId?: string; from?: Date; to?: Date; type?: 'EMAIL'|'SMS'|'CALL' }) =>
    prisma.communication.findMany({
      where: {
        ...(filters.userId ? { createdById: filters.userId } : {}),
        ...(filters.from || filters.to ? { occurredAt: { gte: filters.from || undefined, lte: filters.to || undefined } } : {}),
        ...(filters.type ? { type: filters.type as any } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      include: { lead: true },
    }),
};


