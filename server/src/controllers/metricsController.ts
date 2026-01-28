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
  marketingBreakdown: async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, sources } = req.query;
      const data = await metricsService.getMarketingBreakdown({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        sources: sources ? (sources as string).split(',') : undefined
      });
      return res.json({ data });
    } catch (error) {
      console.error('❌ Error in marketingBreakdown:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  },
  pipelineAnalysis: async (req: Request, res: Response) => {
    try {
      const { timeframe, dateFrom, dateTo, sources } = req.query;
      const data = await metricsService.getPipelineAnalysis({
        timeframe: timeframe as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        sources: sources ? (sources as string).split(',') : undefined
      });
      return res.json({ data });
    } catch (error) {
      console.error('❌ Error in pipelineAnalysis:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  },
  pipelineOverview: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const pipeline = (req.query.pipeline as 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION') || 'ACQUISITIONS';
    const data = await metricsService.getPipelineOverview(timeframe, pipeline);
    return res.json({ data });
  },
  communicationsOverview: async (req: Request, res: Response) => {
    const { timeframe, dateFrom, dateTo, userId } = req.query;
    
    const data = await metricsService.getCommunicationsOverview({
      timeframe: timeframe as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      userId: userId as string
    });
    
    return res.json({ data });
  },
  acquisitionsOverview: async (req: Request, res: Response) => {
    const { timeframe, dateFrom, dateTo, sources, userId, scope } = req.query;
    
    const data = await metricsService.getAcquisitionsOverview({
      timeframe: timeframe as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      sources: sources ? (sources as string).split(',') : undefined,
      userId: userId as string,
      scope: scope as 'personal' | 'team'
    });
    
    return res.json({ data });
  },
  dispositionsOverview: async (req: Request, res: Response) => {
    const { timeframe, dateFrom, dateTo, sources, userId, scope } = req.query;
    
    const data = await metricsService.getDispositionsOverview({
      timeframe: timeframe as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      sources: sources ? (sources as string).split(',') : undefined,
      userId: userId as string,
      scope: scope as 'personal' | 'team'
    });
    
    return res.json({ data });
  },
  transactionsOverview: async (req: Request, res: Response) => {
    const { timeframe, dateFrom, dateTo, sources, userId, scope } = req.query;
    
    const data = await metricsService.getTransactionsOverview({
      timeframe: timeframe as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      sources: sources ? (sources as string).split(',') : undefined,
      userId: userId as string,
      scope: scope as 'personal' | 'overview'
    });
    
    return res.json({ data });
  },
  acquisitionsLeaderboard: async (req: Request, res: Response) => {
    const { period } = req.query;
    
    const data = await metricsService.getAcquisitionsLeaderboard({
      period: period as string
    });
    
    return res.json({ data });
  },
  dispositionsLeaderboard: async (req: Request, res: Response) => {
    const { period } = req.query;
    
    const data = await metricsService.getDispositionsLeaderboard({
      period: period as string
    });
    
    return res.json({ data });
  },
  teamKpis: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const data = await metricsService.getTeamKpis(timeframe);
    return res.json({ data });
  },
  majorKpis: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const user = (req as any).user as { id: string; roles: string[] } | undefined;
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const data = await metricsService.getMajorKpis(timeframe, user);
    return res.json({ data });
  },
  pipelineTimelineMetrics: async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as 'This Month'|'Last Month'|'This Quarter') || 'This Month';
    const pipeline = (req.query.pipeline as 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION') || 'ACQUISITIONS';
    const data = await metricsService.getPipelineTimelineMetrics(timeframe, pipeline);
    return res.json({ data });
  },
};


