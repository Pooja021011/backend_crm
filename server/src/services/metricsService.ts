import dayjs from 'dayjs';
import { metricsRepository } from '../repositories/metricsRepository.js';

type MonthlyFlow = { name: string; totalLeads: number; contractedLeads: number; soldLeads: number; closedLeads: number };

export const metricsService = {
  async getLeadDealFlowLast12Months(): Promise<MonthlyFlow[]> {
    const end = dayjs().endOf('month');
    const start = end.subtract(11, 'month').startOf('month');

    // Pre-build 12 months buckets
    const months: MonthlyFlow[] = [];
    for (let i = 0; i < 12; i++) {
      const m = start.add(i, 'month');
      months.push({ name: m.format('MMM'), totalLeads: 0, contractedLeads: 0, soldLeads: 0, closedLeads: 0 });
    }

    const leads = await metricsRepository.getLeadsCreatedBetween(start.toDate(), end.toDate());
    for (const lead of leads) {
      const idx = dayjs(lead.createdAt).startOf('month').diff(start, 'month');
      if (idx >= 0 && idx < months.length) months[idx].totalLeads += 1;
    }

    // Stage mapping assumptions:
    // contracted: when toStage.name contains 'contract' (case-insensitive)
    // sold: when toStage.name contains 'sold'
    // closed: when toStage.name contains 'closed'
    const history = await metricsRepository.getStageHistoryBetween(start.toDate(), end.toDate());
    for (const h of history) {
      const idx = dayjs(h.changedAt).startOf('month').diff(start, 'month');
      if (idx < 0 || idx >= months.length) continue;
      const name = (h.toStage?.name || '').toLowerCase();
      if (name.includes('contract')) months[idx].contractedLeads += 1;
      if (name.includes('sold')) months[idx].soldLeads += 1;
      if (name.includes('closed')) months[idx].closedLeads += 1;
    }

    return months;
  },

  async getLeadSourcesLast12Months(): Promise<{ name: string; sources: Record<string, number> }[]> {
    const end = dayjs().endOf('month');
    const start = end.subtract(11, 'month').startOf('month');

    const buckets: { name: string; sources: Record<string, number> }[] = [];
    for (let i = 0; i < 12; i++) {
      const m = start.add(i, 'month');
      buckets.push({ name: m.format('MMM'), sources: {} });
    }

    const leads = await metricsRepository.getLeadsWithSourceBetween(start.toDate(), end.toDate());
    for (const lead of leads) {
      const idx = dayjs(lead.createdAt).startOf('month').diff(start, 'month');
      if (idx < 0 || idx >= buckets.length) continue;
      const cf = (lead as any).customFields as any;
      const source = (cf?.leadSource || cf?.source || 'Other') as string;
      const key = String(source);
      buckets[idx].sources[key] = (buckets[idx].sources[key] || 0) + 1;
    }

    return buckets;
  },

  async getCompanyKpis(timeframe: 'This Month' | 'Last Month' | 'This Quarter') {
    const now = dayjs();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;
    if (timeframe === 'This Month') {
      start = now.startOf('month');
      end = now.endOf('month');
    } else if (timeframe === 'Last Month') {
      start = now.subtract(1, 'month').startOf('month');
      end = now.subtract(1, 'month').endOf('month');
    } else {
      start = now.startOf('quarter');
      end = now.endOf('quarter');
    }

    // Contracts Signed = count of stage changes into any stage containing 'Contract' in ACQUISITIONS pipeline
    // Contracts Sold = count of stage changes into 'Under Contract' or 'Closed' in DISPOSITIONS pipeline
    const history = await metricsRepository.getStageHistoryBetween(start.toDate(), end.toDate());
    let contractsSigned = 0;
    let contractsSold = 0;
    for (const h of history) {
      const stageName = (h.toStage?.name || '').toLowerCase();
      const pipeName = h.toStage?.pipeline?.key ?? '';
      if (stageName.includes('contract') && pipeName === 'ACQUISITIONS') contractsSigned++;
      if ((stageName.includes('under contract') || stageName.includes('closed')) && pipeName === 'DISPOSITIONS') contractsSold++;
    }

    // Averages using LeadBuyer.offerAmount as proxy for offer/contract/sold where available.
    // Note: precise contract/sold values need explicit fields; using offerAmount as approximation across statuses.
    const buyersInWindow = await metricsRepository.getLeadBuyersUpdatedBetween(start.toDate(), end.toDate());
    const offerValues = buyersInWindow.map(b => b.offerAmount!).filter(n => typeof n === 'number') as number[];
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const averageOfferPrice = avg(offerValues);
    const averageContractPrice = averageOfferPrice; // proxy
    const averageSoldPrice = averageOfferPrice; // proxy

    // Profit proxy: 12% of offerAmount as placeholder margin
    const profits = offerValues.map(v => Math.round(v * 0.12));
    const averageDealProfit = avg(profits);
    const projectedProfit = profits.length ? profits.reduce((a, b) => a + b, 0) : null;
    const closedProfit = projectedProfit; // proxy until explicit closed tracking exists
    return {
      contractsSigned,
      contractsSold,
      projectedProfit,
      closedProfit,
      averageOfferPrice,
      averageContractPrice,
      averageSoldPrice,
      averageDealProfit,
    };
  },
};


