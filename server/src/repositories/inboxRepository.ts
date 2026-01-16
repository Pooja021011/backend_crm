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
    // - Tagged: metadata.mentionedUserIds contains userId (only notes where user was @mentioned by others)
    // Note: We'll filter in-memory after fetching since Prisma's JSON array filtering is unreliable
    const internalNoteFilter = isNoteInternal
      ? {
          type: 'NOTE' as any,
        }
      : {};

    // For EMAIL/SMS/CALL inbox:
    // Build scope filter that checks if user's email/phone is in metadata
    const hasScopeConditions = 
      filters.userId && 
      (filters.type === 'EMAIL' || filters.type === 'SMS' || filters.type === 'CALL') &&
      ((filters.type === 'EMAIL' && filters.scope?.email) || 
       (filters.type !== 'EMAIL' && filters.scope?.phone));

    const commScopeConditions = hasScopeConditions
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
      : null;

    // Default user scoping (non-internal): items I created OR items tied to leads I own.
    // For EMAIL/SMS/CALL, we ALSO require the user's email/phone to be in metadata (AND condition)
    const userFilter =
      !isNoteInternal && filters.userId
        ? {
            AND: [
              // Lead ownership filter
              {
                OR: [
                  { createdById: filters.userId },
                  { lead: { assignedUserId: filters.userId } },
                  { lead: { createdById: filters.userId } },
                ],
              },
              // For EMAIL/SMS/CALL, additionally require user's email/phone in metadata
              ...(commScopeConditions ? [commScopeConditions] : []),
            ],
          }
        : {};

    // Debug: Log the filter being used
    if (isNoteInternal) {
      console.log('🔍 Internal NOTE filter:', JSON.stringify(internalNoteFilter, null, 2));
      console.log('🔍 Looking for userId:', filters.userId);
    }

    const items = await prisma.communication.findMany({
      where: {
        ...(isNoteInternal ? internalNoteFilter : userFilter),
        ...timeFilter,
        ...typeFilter,
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

    // Debug: Log results
    if (isNoteInternal) {
      console.log('🔍 Found communications (before filtering):', items.length);
      items.forEach((item: any) => {
        console.log('  - Communication:', item.id, 'metadata:', item.metadata);
      });
    }

    // For internal NOTE inbox, filter by mentionedUserIds in-memory
    let filteredItems = items;
    if (isNoteInternal && filters.userId) {
      filteredItems = items.filter((item: any) => {
        // Requirement: show ONLY notes where logged-in user was tagged by someone else
        if (item.createdById === filters.userId) return false;
        const metadata = item.metadata as any;
        const mentionedUserIds = metadata?.mentionedUserIds;
        const isMentioned = Array.isArray(mentionedUserIds) && mentionedUserIds.includes(filters.userId);
        if (isMentioned) {
          console.log('✅ User IS mentioned in communication:', item.id);
        }
        return isMentioned;
      });
      console.log('🔍 After filtering by mentions:', filteredItems.length);
    }

    // `leadOnly` means: return only items whose Lead still exists.
    // (Some DBs can contain orphaned communication rows due to missing FK cascades.)
    if (filters.leadOnly) {
      return filteredItems.filter((c: any) => Boolean(c?.lead));
    }
    return filteredItems;
  },
};


