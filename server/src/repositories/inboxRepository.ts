import { prisma } from '../config/db.js';

export const inboxRepository = {
  listAssignedTasks: (userId: string) =>
    prisma.task.findMany({
      where: { assignedToId: userId, status: 'OPEN' as any },
      orderBy: { dueAt: 'asc' },
      include: { lead: true },
    }),

  listCommunications: (filters: { userId?: string; from?: Date; to?: Date; type?: 'EMAIL'|'SMS'|'CALL'; leadOnly?: boolean }) => {
    const timeFilter =
      filters.from || filters.to
        ? { occurredAt: { gte: filters.from || undefined, lte: filters.to || undefined } }
        : {};

    const typeFilter = filters.type ? { type: filters.type as any } : {};
    const leadOnlyFilter = filters.leadOnly ? { leadId: { not: null } } : {};

    // Scope "my communications" to items I created OR items tied to leads I own.
    // This is important for inbound comms (CALL/SMS/EMAIL) where createdById may not be the viewing user.
    const userFilter = filters.userId
      ? {
          OR: [
            { createdById: filters.userId },
            { lead: { assignedUserId: filters.userId } },
            { lead: { createdById: filters.userId } },
          ],
        }
      : {};

    return prisma.communication.findMany({
      where: {
        ...userFilter,
        ...timeFilter,
        ...typeFilter,
        ...leadOnlyFilter,
      },
      orderBy: { occurredAt: 'desc' },
      include: { lead: true },
    });
  },
};


