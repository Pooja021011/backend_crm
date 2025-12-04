import { prisma } from '../config/db.js';

// Price field names that can be tracked
export type PriceFieldName = 
  | 'estimatedValue'
  | 'askingPrice'
  | 'offerAmount'
  | 'contractPrice'
  | 'soldPrice'
  | 'rehabBudget'
  | 'netProfit';

interface CreatePriceHistoryInput {
  leadId: string;
  fieldName: PriceFieldName;
  oldValue?: number | null;
  newValue: number;
  changedById?: string;
  note?: string;
}

interface PriceHistoryFilters {
  fieldName?: PriceFieldName;
  startDate?: Date;
  endDate?: Date;
}

export const priceHistoryService = {
  /**
   * Create a new price history entry
   */
  async createPriceHistory(data: CreatePriceHistoryInput) {
    return prisma.priceHistory.create({
      data: {
        leadId: data.leadId,
        fieldName: data.fieldName,
        oldValue: data.oldValue ?? null,
        newValue: data.newValue,
        changedById: data.changedById,
        note: data.note,
      },
      include: {
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Get all price history for a lead
   */
  async getPriceHistoryByLeadId(leadId: string, filters?: PriceHistoryFilters) {
    const where: any = { leadId };

    if (filters?.fieldName) {
      where.fieldName = filters.fieldName;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return prisma.priceHistory.findMany({
      where,
      include: {
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get latest value for a specific price field
   */
  async getLatestPriceForField(leadId: string, fieldName: PriceFieldName) {
    return prisma.priceHistory.findFirst({
      where: {
        leadId,
        fieldName,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Get price history summary (latest value for each field)
   */
  async getPriceHistorySummary(leadId: string) {
    const fieldNames: PriceFieldName[] = [
      'estimatedValue',
      'askingPrice',
      'offerAmount',
      'contractPrice',
      'soldPrice',
      'rehabBudget',
      'netProfit',
    ];

    const summary: Record<string, any> = {};

    for (const fieldName of fieldNames) {
      const latest = await this.getLatestPriceForField(leadId, fieldName);
      if (latest) {
        summary[fieldName] = {
          currentValue: latest.newValue,
          lastUpdated: latest.createdAt,
          changedBy: latest.changedBy,
        };
      }
    }

    return summary;
  },

  /**
   * Track price change - only creates entry if value actually changed
   */
  async trackPriceChange(
    leadId: string,
    fieldName: PriceFieldName,
    oldValue: number | null | undefined,
    newValue: number | null | undefined,
    changedById?: string,
    note?: string
  ) {
    // Don't track if new value is null/undefined
    if (newValue === null || newValue === undefined) {
      return null;
    }

    // Don't track if value hasn't changed
    if (oldValue === newValue) {
      return null;
    }

    return this.createPriceHistory({
      leadId,
      fieldName,
      oldValue: oldValue ?? null,
      newValue,
      changedById,
      note,
    });
  },

  /**
   * Batch track multiple price changes
   */
  async trackMultiplePriceChanges(
    leadId: string,
    changes: Array<{
      fieldName: PriceFieldName;
      oldValue: number | null | undefined;
      newValue: number | null | undefined;
    }>,
    changedById?: string
  ) {
    const results = [];

    for (const change of changes) {
      const result = await this.trackPriceChange(
        leadId,
        change.fieldName,
        change.oldValue,
        change.newValue,
        changedById
      );
      if (result) {
        results.push(result);
      }
    }

    return results;
  },

  /**
   * Get timeline data for a lead (stages with price info)
   */
  async getLeadTimeline(leadId: string) {
    // Get lead with all related data
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        deal: true,
        tasks: {
          where: {
            title: {
              contains: 'Appointment',
              mode: 'insensitive',
            },
          },
          orderBy: { dueAt: 'asc' },
          take: 1,
        },
        stageHistory: {
          orderBy: { changedAt: 'asc' },
        },
        priceHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return null;
    }

    // Get latest prices from history
    const latestPrices: Record<string, number | null> = {};
    const priceFields: PriceFieldName[] = [
      'estimatedValue',
      'askingPrice',
      'offerAmount',
      'contractPrice',
      'soldPrice',
      'rehabBudget',
      'netProfit',
    ];

    for (const field of priceFields) {
      const latest = lead.priceHistory.find((h) => h.fieldName === field);
      latestPrices[field] = latest?.newValue ?? null;
    }

    // Build timeline stages
    const timeline = {
      leadCreated: {
        date: lead.createdAt,
        completed: true,
      },
      appointment: {
        date: lead.tasks[0]?.dueAt || null,
        completed: !!lead.tasks[0],
      },
      offerMade: {
        date: lead.priceHistory.find((h) => h.fieldName === 'offerAmount')?.createdAt || null,
        amount: latestPrices.offerAmount,
        completed: !!latestPrices.offerAmount,
      },
      underContract: {
        date: lead.deal?.contractedAt || null,
        amount: lead.deal?.contractPrice || latestPrices.contractPrice,
        completed: !!lead.deal?.contractedAt,
      },
      expectedProfit: {
        amount: lead.deal?.netProfit || latestPrices.netProfit,
        completed: !!(lead.deal?.netProfit || latestPrices.netProfit),
      },
    };

    return {
      lead,
      timeline,
      latestPrices,
      priceHistory: lead.priceHistory,
    };
  },

  /**
   * Delete price history entry
   */
  async deletePriceHistory(id: string) {
    return prisma.priceHistory.delete({
      where: { id },
    });
  },
};

