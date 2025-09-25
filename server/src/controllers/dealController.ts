import type { Request, Response } from 'express';
import { dealService } from '../services/dealService.js';

export const dealController = {
  getByLead: async (req: Request, res: Response) => {
    const { leadId } = req.params as any;
    const data = await dealService.getByLeadId(leadId);
    res.json({ data });
  },
  upsertByLead: async (req: Request, res: Response) => {
    const { leadId } = req.params as any;
    const data = await dealService.upsertByLeadId(leadId, req.body);
    res.json({ data });
  },
};


