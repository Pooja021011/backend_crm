import { prisma } from '../config/db.js';

export const inboxRepository = {
  listAssignedTasks: (userId: string) =>
    prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: 'OPEN' as any,
        // Inbox behavior: only show tasks when they are due, and keep them until DONE
        dueAt: { lte: new Date() },
      },
      orderBy: { dueAt: 'asc' },
      include: { lead: { include: { address: true, seller: true, buyer: true, vendor: true } } },
    }),

  listCommunications: async (filters: {
    userId?: string;
    viewerUserId?: string;
    from?: Date;
    to?: Date;
    type?: 'EMAIL'|'SMS'|'CALL'|'NOTE';
    leadOnly?: boolean;
    internal?: boolean;
    scope?: { email?: string; phone?: string };
  }) => {
    const timeFilter =
      filters.from || filters.to
        ? { occurredAt: { gte: filters.from || undefined, lte: filters.to || undefined } }
        : {};

    const typeFilter = filters.type ? { type: filters.type as any } : {};

    const isNoteInternal = Boolean(filters.internal) && filters.type === 'NOTE' && Boolean(filters.userId);

    // For internal NOTE inbox:
    // - Tagged: metadata.mentionedUserIds contains userId
    // - Direct: createdById != userId and lead is assigned/created by userId
    const internalNoteFilter = isNoteInternal
      ? {
          AND: [
            { type: 'NOTE' as any },
            {
              OR: [
                {
                  metadata: {
                    path: ['mentionedUserIds'],
                    array_contains: [filters.userId as string],
                  },
                },
                {
                  AND: [
                    { createdById: { not: filters.userId as string } },
                    {
                      OR: [
                        { lead: { assignedUserId: filters.userId as string } },
                        { lead: { createdById: filters.userId as string } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }
      : {};

    // For EMAIL/SMS/CALL inbox:
    // Scope results to the user’s configured email/phone via Communication.metadata.{to,from}
    const commScopeFilter =
      filters.userId && (filters.type === 'EMAIL' || filters.type === 'SMS' || filters.type === 'CALL')
        ? {
            OR: [
              // Email scoping
              ...(filters.type === 'EMAIL' && filters.scope?.email
                ? ([
                    { metadata: { path: ['to'], equals: filters.scope.email } },
                    { metadata: { path: ['from'], equals: filters.scope.email } },
                  ] as any[])
                : []),
              // Phone scoping
              ...(filters.type !== 'EMAIL' && filters.scope?.phone
                ? ([
                    { metadata: { path: ['to'], equals: filters.scope.phone } },
                    { metadata: { path: ['from'], equals: filters.scope.phone } },
                  ] as any[])
                : []),
            ],
          }
        : {};

    // Default user scoping (non-internal): items I created OR items tied to leads I own.
    // NOTE: for EMAIL/SMS/CALL we additionally apply commScopeFilter above.
    const userFilter =
      !isNoteInternal && filters.userId
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
        ...(isNoteInternal ? internalNoteFilter : userFilter),
        ...timeFilter,
        ...typeFilter,
        ...(Object.keys(commScopeFilter).length ? commScopeFilter : {}),
      },
      orderBy: { occurredAt: 'desc' },
      include: {
        reads: filters.viewerUserId
          ? { where: { userId: filters.viewerUserId }, select: { userId: true, readAt: true } }
          : false,
        lead: { include: { address: true, seller: true, buyer: true, vendor: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // `leadOnly` means: return only items whose Lead still exists.
    // (Some DBs can contain orphaned communication rows due to missing FK cascades.)
    if (filters.leadOnly) {
      return items.filter((c: any) => Boolean(c?.lead));
    }
    return items;
  },
};


