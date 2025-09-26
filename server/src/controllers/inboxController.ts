import type { Request, Response } from 'express';
import { inboxService } from '../services/inboxService.js';

export const inboxController = {
  myTasks: async (req: Request, res: Response) => {
    const userId = (req as any).user.id as string;
    const data = await inboxService.getTasks(userId);
    res.json({ data });
  },
  communications: async (req: Request, res: Response) => {
    const userId = (req.query.userScope === 'me') ? (req as any).user.id as string : undefined;
    const type = req.query.type as 'EMAIL'|'SMS'|'CALL' | undefined;
    const timeframe = (req.query.timeframe as any) || 'This Month';
    const data = await inboxService.getCommunications({ userId, type, timeframe });
    res.json({ data });
  },
};


