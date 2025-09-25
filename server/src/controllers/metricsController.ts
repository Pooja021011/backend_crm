import type { Request, Response } from 'express';
import { metricsService } from '../services/metricsService.js';

export const metricsController = {
  leadDealFlowLast12Months: async (_req: Request, res: Response) => {
    const data = await metricsService.getLeadDealFlowLast12Months();
    return res.json({ data });
  },
  leadSourcesLast12Months: async (_req: Request, res: Response) => {
    const data = await metricsService.getLeadSourcesLast12Months();
    return res.json({ data });
  },
  companyKpis: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const data = await metricsService.getCompanyKpis(timeframe);
    return res.json({ data });
  },
};


