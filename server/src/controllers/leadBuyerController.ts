import type { Request, Response } from 'express';
import { buyerRepository } from '../repositories/buyerRepository.js';

export const leadBuyerController = {
  list: async (req: Request, res: Response) => {
    const data = await buyerRepository.listForLead(req.params.id);
    res.json({ data });
  },
  add: async (req: Request, res: Response) => {
    const { buyerId, buyerNew } = req.body;
    const linked = await buyerRepository.linkBuyer(req.params.id, { buyerId, buyerNew });
    res.status(201).json({ data: linked });
  },
  update: async (req: Request, res: Response) => {
    const { status, offerAmount, terms } = req.body;
    const updated = await buyerRepository.updateLeadBuyer(req.params.leadBuyerId, { status, offerAmount, terms });
    res.json({ data: updated });
  },
};

