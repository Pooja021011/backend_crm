import type { Request, Response } from 'express';
import { inboxService } from '../services/inboxService.js';

export const inboxController = {
  myTasks: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    const data = await inboxService.getTasks(userId);
    res.json({ data });
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


