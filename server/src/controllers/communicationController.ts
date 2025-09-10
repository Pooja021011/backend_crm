import type { Request, Response } from 'express';
import { communicationRepository } from '../repositories/communicationRepository.js';

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
    res.status(201).json({ data: created });
  },
};

