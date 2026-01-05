import { prisma } from '../config/db.js';

export const inboxRepository = {
  listAssignedTasks: (userId: string) =>
    prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: 'OPEN' as any,
        // Inbox behavior: hide tasks already opened (marked read) by this user
        reads: { none: { userId } },
      },
      orderBy: { dueAt: 'asc' },
      include: { lead: true },
    }),

  listCommunications: async (filters: { userId?: string; from?: Date; to?: Date; type?: 'EMAIL'|'SMS'|'CALL'; leadOnly?: boolean }) => {
    const timeFilter =
      filters.from || filters.to
        ? { occurredAt: { gte: filters.from || undefined, lte: filters.to || undefined } }
        : {};

    const typeFilter = filters.type ? { type: filters.type as any } : {};

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

    const items = await prisma.communication.findMany({
      where: {
        ...userFilter,
        ...timeFilter,
        ...typeFilter,
      },
      orderBy: { occurredAt: 'desc' },
      include: { lead: true },
    });

    // `leadOnly` means: return only items whose Lead still exists.
    // (Some DBs can contain orphaned communication rows due to missing FK cascades.)
    if (filters.leadOnly) {
      return items.filter((c: any) => Boolean(c?.lead));
    }
    return items;
  },
};


