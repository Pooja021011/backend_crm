import type { Request, Response } from 'express';
import { marketingRepository } from '../repositories/marketingRepository.js';

export const marketingController = {
  list: async (req: Request, res: Response) => {
    const data = await marketingRepository.list(req.params.id);
    res.json({ data });
  },
  create: async (req: Request, res: Response) => {
    const { title, url, type } = req.body;
    const created = await marketingRepository.create(req.params.id, { title, url, type, createdById: (req as any).user?.id });
    res.status(201).json({ data: created });
  },
  update: async (req: Request, res: Response) => {
    const { title, url, type } = req.body;
    const updated = await marketingRepository.update(req.params.linkId, { title, url, type });
    res.json({ data: updated });
  },
  delete: async (req: Request, res: Response) => {
    await marketingRepository.delete(req.params.linkId);
    res.json({ success: true });
  },
};

