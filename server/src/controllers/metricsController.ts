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
  pipelineOverview: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const pipeline = (req.query.pipeline as 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION') || 'ACQUISITIONS';
    const data = await metricsService.getPipelineOverview(timeframe, pipeline);
    return res.json({ data });
  },
  communicationsOverview: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const userId = req.query.userId as string | undefined;
    const data = await metricsService.getCommunicationsOverview(timeframe, userId);
    return res.json({ data });
  },
  teamKpis: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const data = await metricsService.getTeamKpis(timeframe);
    return res.json({ data });
  },
};


