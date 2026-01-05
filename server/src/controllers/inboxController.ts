import type { Request, Response } from 'express';
import { inboxService } from '../services/inboxService.js';
import { prisma } from '../config/db.js';

export const inboxController = {
  myTasks: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    const data = await inboxService.getTasks(userId);
    res.json({ data });
  },

  markTaskRead: async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    const taskId = String(req.params.taskId || '');
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!taskId) return res.status(400).json({ success: false, error: 'taskId required' });

    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, assignedToId: true } });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.assignedToId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    await prisma.taskRead.upsert({
      where: { taskId_userId: { taskId, userId } },
      update: { readAt: new Date() },
      create: { taskId, userId, readAt: new Date() },
    });

    return res.json({ success: true });
  },

  markCommunicationRead: async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    const roles = ((req as any).user?.roles as string[] | undefined) || [];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const communicationId = String(req.params.communicationId || '');
    if (!communicationId) return res.status(400).json({ success: false, error: 'communicationId required' });

    const isPrivileged = roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('TC') || roles.includes('EXECUTIVE');

    const comm = await prisma.communication.findUnique({
      where: { id: communicationId },
      include: { lead: { select: { assignedUserId: true, createdById: true } } },
    });
    if (!comm) return res.status(404).json({ success: false, error: 'Communication not found' });

    if (
      !isPrivileged &&
      comm.createdById !== userId &&
      comm.lead?.assignedUserId !== userId &&
      comm.lead?.createdById !== userId
    ) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.communicationRead.upsert({
      where: { communicationId_userId: { communicationId, userId } },
      update: { readAt: new Date() },
      create: { communicationId, userId, readAt: new Date() },
    });

    return res.json({ success: true });
  },

  markGmailEmailRead: async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    const emailId = String(req.params.emailId || '');
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!emailId) return res.status(400).json({ success: false, error: 'emailId required' });

    await prisma.gmailEmailRead.upsert({
      where: { emailId_userId: { emailId, userId } },
      update: { readAt: new Date() },
      create: { emailId, userId, readAt: new Date() },
    });

    return res.json({ success: true });
  },
  communications: async (req: Request, res: Response) => {
    const authUser = (req as any).user as { id: string; roles?: string[] } | undefined;
    const requestedScope = String(req.query.userScope || 'me').toLowerCase(); // default: me
    const isAdmin = Boolean(authUser?.roles?.includes('ADMIN'));

    // Default to returning only the logged-in user's communications.
    // Allow `userScope=all` only for ADMIN users.
    const userId =
      requestedScope === 'all' && isAdmin
        ? undefined
        : (authUser?.id as string);
    const type = req.query.type as 'EMAIL'|'SMS'|'CALL' | undefined;
    const timeframe = (req.query.timeframe as any) || 'This Month';
    const leadOnly = String(req.query.leadOnly || 'false').toLowerCase() === 'true';
    const data = await inboxService.getCommunications({ userId, type, timeframe, leadOnly });
    res.json({ data });
  },
};


