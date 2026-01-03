import { prisma } from '../config/db.js';

export const inboxRepository = {
  listAssignedTasks: (userId: string) =>
    prisma.task.findMany({
      where: { assignedToId: userId, status: 'OPEN' as any },
      orderBy: { dueAt: 'asc' },
      include: { lead: true },
    }),

  listCommunications: (filters: { userId?: string; from?: Date; to?: Date; type?: 'EMAIL'|'SMS'|'CALL' }) => {
    const timeFilter =
      filters.from || filters.to
        ? { occurredAt: { gte: filters.from || undefined, lte: filters.to || undefined } }
        : {};

    const typeFilter = filters.type ? { type: filters.type as any } : {};

    // For CALLs, show items scoped to "me" if I'm either the creator OR the lead is mine.
    // This matches how call history is scoped elsewhere and ensures missed inbound calls show up.
    const userFilter =
      filters.userId && filters.type === 'CALL'
        ? {
            OR: [
              { createdById: filters.userId },
              { lead: { assignedUserId: filters.userId } },
              { lead: { createdById: filters.userId } },
            ],
          }
        : filters.userId
          ? { createdById: filters.userId }
          : {};

    return prisma.communication.findMany({
      where: {
        ...userFilter,
        ...timeFilter,
        ...typeFilter,
      },
      orderBy: { occurredAt: 'desc' },
      include: { lead: true },
    });
  },
};


