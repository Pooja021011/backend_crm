import type { Request, Response } from 'express';
import { communicationRepository } from '../repositories/communicationRepository.js';
import { prisma } from '../config/db.js';

export const communicationController = {
  list: async (req: Request, res: Response) => {
    const { type, from, to } = req.query as any;
    const data = await communicationRepository.list(req.params.id, { type, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined });
    res.json({ data });
  },
  create: async (req: Request, res: Response) => {
    const { type, direction, subject, body, occurredAt, attachmentFileIds, metadata } = req.body;
    const created = await communicationRepository.create(req.params.id, {
      type,
      direction,
      subject,
      body,
      occurredAt: new Date(occurredAt),
      createdById: (req as any).user?.id,
      attachmentFileIds,
      metadata: metadata || null,
    });
    
    // If this is a NOTE with @mentions, create tasks for mentioned users
    if (type === 'NOTE' && body) {
      console.log('📝 CREATE NOTE - Processing mentions...');
      const mentionedUserIds = await createTasksForMentions(req.params.id, body, (req as any).user?.id);

      // Store mention recipients for inbox notification targeting
      if (mentionedUserIds.length > 0) {
        console.log('✅ CREATE NOTE - Found mentions, updating communication with metadata');
        const mergedMetadata = {
          ...(typeof created?.metadata === 'object' && created?.metadata ? created.metadata : {}),
          mentionedUserIds,
        };

        // Treat tagged notes as "inbound to mentioned users" for inbox purposes
        await prisma.communication.update({
          where: { id: created.id },
          data: {
            direction: 'INBOUND' as any,
            metadata: mergedMetadata,
          },
        });
        console.log('✅ CREATE NOTE - Communication updated with mentionedUserIds:', mentionedUserIds);
      } else {
        console.log('⚠️ CREATE NOTE - No mentions found or no users matched');
      }
    }
    
    res.status(201).json({ data: created });
  },

  update: async (req: Request, res: Response) => {
    const { commId } = req.params as any;
    const { body } = req.body as any;

    if (!commId) return res.status(400).json({ error: 'Missing commId' });
    if (typeof body !== 'string') return res.status(400).json({ error: 'body is required' });

    const user = (req as any).user;
    const userId = user?.id as string | undefined;
    const roles: string[] = user?.roles || [];

    const comm = await communicationRepository.findById(commId);
    if (!comm) return res.status(404).json({ error: 'Not found' });

    // Only allow editing NOTE communications
    if ((comm as any).type !== 'NOTE') return res.status(400).json({ error: 'Only NOTE can be edited' });

    const lead = (comm as any).lead;
    const isPrivileged = roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('TC');
    const isAuthor = !!userId && (comm as any).createdById === userId;
    const isLeadEditor =
      !!userId &&
      (lead?.assignedUserId === userId || lead?.dispAgentId === userId || lead?.createdById === userId);

    if (!isPrivileged && !isAuthor && !isLeadEditor) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const trimmed = body.trim();

    console.log('✏️ EDIT NOTE - Processing mentions...');
    // Re-run mention parsing and create mention tasks for newly mentioned users (add-only for safety)
    const mentionedUserIds = trimmed ? await createTasksForMentions(req.params.id, trimmed, userId) : [];

    if (mentionedUserIds.length > 0) {
      console.log('✅ EDIT NOTE - Found mentions:', mentionedUserIds);
    } else {
      console.log('⚠️ EDIT NOTE - No mentions found or no users matched');
    }

    const mergedMetadata = {
      ...(typeof (comm as any)?.metadata === 'object' && (comm as any)?.metadata ? (comm as any).metadata : {}),
      mentionedUserIds,
    };

    const direction = mentionedUserIds.length > 0 ? 'INBOUND' : ((comm as any).direction || 'OUTBOUND');

    const updated = await communicationRepository.updateNote({
      id: commId,
      body: trimmed,
      direction,
      metadata: mergedMetadata,
    });

    console.log('✅ EDIT NOTE - Note updated with direction:', direction);
    res.json({ data: updated });
  },
};

// Helper function to parse @mentions and create tasks
async function createTasksForMentions(leadId: string, noteBody: string, createdById?: string): Promise<string[]> {
  // NOTE: This function MUST return mentioned user IDs even if task creation fails,
  // because Inbox "Communications" relies on metadata.mentionedUserIds.
  try {
    // More tolerant mention parsing:
    // - allows lowercase/uppercase
    // - allows digits in names
    // - supports multiple spaces
    const mentionRegex = /@([A-Za-z0-9]+)\s+([A-Za-z0-9]+)\b/g;
    const mentions = Array.from(noteBody.matchAll(mentionRegex)).map(m => ({
      first: String(m[1] || ''),
      last: String(m[2] || ''),
    }));

    console.log('🔍 Parsing mentions from note:', noteBody);
    console.log('🔍 Found mentions:', mentions.map(m => `${m.first} ${m.last}`));

    if (mentions.length === 0) return [];

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        address: { select: { address1: true, city: true, state: true } },
        seller: { select: { firstName: true, lastName: true } },
        buyer: { select: { firstName: true, lastName: true } },
        vendor: { select: { firstName: true, lastName: true } },
      },
    });

    // Even if lead is missing (shouldn't happen), we can still resolve user IDs from mentions.

    const allUsers = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, status: true },
    });

    const normalize = (s: string) => s.trim().toLowerCase();

    const matchedUsers = allUsers.filter(u => {
      if (!u.firstName || !u.lastName) return false;
      if (String(u.status || '').toUpperCase() !== 'ACTIVE') return false;

      const userFirst = normalize(u.firstName);
      const userLast = normalize(u.lastName);

      return mentions.some(m => {
        const mentionFirst = normalize(m.first);
        const mentionLast = normalize(m.last);

        // allow "Hardeep" vs "Hardeep1" and vice versa
        const firstOk =
          userFirst === mentionFirst ||
          userFirst.startsWith(mentionFirst) ||
          mentionFirst.startsWith(userFirst);

        const lastOk = userLast === mentionLast;
        return firstOk && lastOk;
      });
    });

    const uniqueMentionedUserIds = Array.from(
      new Set(
        matchedUsers
          .map(u => u.id)
          .filter(id => Boolean(id) && (!createdById || id !== createdById))
      )
    );

    console.log(
      '🔍 Matched users:',
      matchedUsers.map(u => `${u.firstName} ${u.lastName} (${u.id})`)
    );

    if (uniqueMentionedUserIds.length === 0) return [];

    // Best-effort task creation (do NOT affect returned mentioned IDs)
    try {
      const leadDescription = lead?.address?.address1
        ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}`
        : lead?.seller?.firstName
          ? `${lead.seller.firstName} ${lead.seller.lastName}`
          : lead?.buyer?.firstName
            ? `${lead.buyer.firstName} ${lead.buyer.lastName}`
            : 'Lead';

      await Promise.all(
        uniqueMentionedUserIds.map(mentionedUserId =>
          prisma.task.create({
            data: {
              leadId,
              title: `Review note on ${leadDescription}`,
              description: `You were mentioned in a note:\n\n${noteBody.substring(0, 500)}${noteBody.length > 500 ? '...' : ''}`,
              dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
              status: 'OPEN' as any,
              assignedToId: mentionedUserId,
              createdById: createdById || null,
            },
          })
        )
      );
      console.log(`✅ Created ${uniqueMentionedUserIds.length} tasks for @mentions in note`);
    } catch (taskError) {
      console.error('❌ Task creation failed for mentions (continuing):', taskError);
    }

    return uniqueMentionedUserIds;
  } catch (error) {
    console.error('❌ Error parsing mentions:', error);
    return [];
  }
}

