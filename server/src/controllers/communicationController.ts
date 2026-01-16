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
  try {
    // Extract all @mentions from the note body
    // Pattern: @FirstName LastName (supports names with numbers like "Hardeep1")
    const mentionRegex = /@([A-Z][a-z0-9]+)\s+([A-Z][a-z]+)/g;
    const mentions = Array.from(noteBody.matchAll(mentionRegex));
    
    console.log('🔍 Parsing mentions from note:', noteBody);
    console.log('🔍 Found mentions:', mentions.map(m => `${m[1]} ${m[2]}`));
    
    if (mentions.length === 0) {
      console.log('⚠️ No mentions found in note');
      return [];
    }
    
    // Get lead info to check permissions
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        assignedUserId: true,
        dispAgentId: true,
        createdById: true,
        address: { select: { address1: true, city: true, state: true } },
        seller: { select: { firstName: true, lastName: true } },
        buyer: { select: { firstName: true, lastName: true } },
        vendor: { select: { firstName: true, lastName: true } },
        tasks: { select: { assignedToId: true, title: true } }
      }
    });
    
    if (!lead) return [];
    
    // Get all active users first
    const allUsers = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, roles: true, status: true }
    });
    
    // Match mentions against users (case-insensitive, flexible matching)
    // Supports: "@Hardeep Singh", "@Hardeep1 Singh" matching user "Hardeep Singh" or "Hardeep1 Singh"
    const users = allUsers.filter(user => {
      return mentions.some(match => {
        const mentionFirst = match[1].toLowerCase();
        const mentionLast = match[2].toLowerCase();
        const userFirst = user.firstName.toLowerCase();
        const userLast = user.lastName.toLowerCase();
        
        // Exact match OR user's name contains mention (handles both "Hardeep" and "Hardeep1")
        const firstNameMatches = 
          userFirst === mentionFirst || 
          userFirst.includes(mentionFirst) || 
          mentionFirst.includes(userFirst);
        const lastNameMatches = userLast === mentionLast;
        
        return firstNameMatches && lastNameMatches;
      });
    });
    
    console.log('🔍 All mentions found:', mentions.map(m => `@${m[1]} ${m[2]}`));
    console.log('🔍 Matched users:', users.map(u => `${u.firstName} ${u.lastName} (${u.id})`));
    
    // Filter users who have access to this lead
    const allowedUsers = users.filter(user => {
      // Always allow ADMIN, MANAGER, and Transaction Coordinator
      if (user.roles.includes('ADMIN') || user.roles.includes('MANAGER') || user.roles.includes('TC')) {
        return true;
      }
      
      // Allow if user is ACQ agent (assigned to the lead)
      if (lead.assignedUserId === user.id) {
        return true;
      }
      
      // Allow if user is DISP agent
      if (lead.dispAgentId === user.id) {
        return true;
      }
      
      // Allow if user created the lead
      if (lead.createdById === user.id) {
        return true;
      }
      
      // Allow if user has REAL tasks assigned on this lead (not auto-generated mention tasks)
      const realTasks = lead.tasks.filter((task: any) => !task.title?.startsWith('Review note on '));
      if (realTasks.some((task: any) => task.assignedToId === user.id)) {
        return true;
      }
      
      return false;
    });
    
    if (allowedUsers.length === 0) {
      console.log('⚠️ No users with lead access were mentioned');
      return [];
    }
    
    const leadDescription = lead?.address?.address1 
      ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}`
      : lead?.seller?.firstName 
      ? `${lead.seller.firstName} ${lead.seller.lastName}`
      : lead?.buyer?.firstName
      ? `${lead.buyer.firstName} ${lead.buyer.lastName}`
      : 'Lead';
    
    // Create tasks for each allowed mentioned user
    const taskPromises = allowedUsers.map(user =>
      prisma.task.create({
        data: {
          leadId,
          title: `Review note on ${leadDescription}`,
          description: `You were mentioned in a note:\n\n${noteBody.substring(0, 500)}${noteBody.length > 500 ? '...' : ''}`,
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
          status: 'OPEN' as any,
          assignedToId: user.id,
          createdById: createdById || null
        }
      })
    );
    
    await Promise.all(taskPromises);
    console.log(`✅ Created ${taskPromises.length} tasks for @mentions in note`);
    return allowedUsers.map(u => u.id);
  } catch (error) {
    console.error('❌ Error creating tasks for mentions:', error);
    // Don't throw - note should still be created even if task creation fails
    return [];
  }
}

