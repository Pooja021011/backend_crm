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
    const { type, direction, subject, body, occurredAt, attachmentFileIds } = req.body;
    const created = await communicationRepository.create(req.params.id, {
      type, direction, subject, body, occurredAt: new Date(occurredAt), createdById: (req as any).user?.id, attachmentFileIds
    });
    
    // If this is a NOTE with @mentions, create tasks for mentioned users
    if (type === 'NOTE' && body) {
      await createTasksForMentions(req.params.id, body, (req as any).user?.id);
    }
    
    res.status(201).json({ data: created });
  },
};

// Helper function to parse @mentions and create tasks
async function createTasksForMentions(leadId: string, noteBody: string, createdById?: string) {
  try {
    // Extract all @mentions from the note body
    // Pattern: @FirstName LastName
    const mentionRegex = /@([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
    const mentions = Array.from(noteBody.matchAll(mentionRegex));
    
    if (mentions.length === 0) return;
    
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
    
    if (!lead) return;
    
    // Get all users to match names
    const users = await prisma.user.findMany({
      where: {
        OR: mentions.map(match => ({
          AND: [
            { firstName: { equals: match[1], mode: 'insensitive' as any } },
            { lastName: { equals: match[2], mode: 'insensitive' as any } }
          ]
        }))
      },
      select: { id: true, firstName: true, lastName: true, roles: true }
    });
    
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
      return;
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
  } catch (error) {
    console.error('❌ Error creating tasks for mentions:', error);
    // Don't throw - note should still be created even if task creation fails
  }
}

