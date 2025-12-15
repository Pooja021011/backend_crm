import { prisma } from '../config/db.js';
import { PipelineKey } from '@prisma/client';

export const dispositionsPipelineService = {
  /**
   * Get dispositions pipeline funnel data with stage counts
   */
  async getPipelineFunnel(period: string = 'This Month') {
    // Get dispositions pipeline stages
    const pipeline = await prisma.pipelineDefinition.findUnique({
      where: { key: PipelineKey.DISPOSITIONS },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!pipeline) {
      throw new Error('Dispositions pipeline not found');
    }

    // Calculate date range based on period
    const dateRange = this.getDateRange(period);

    // Get counts for each stage
    const stageCounts = await Promise.all(
      pipeline.stages.map(async (stage) => {
        const count = await prisma.lead.count({
          where: {
            pipelineStageId: stage.id,
            createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
          },
        });

        // Calculate conversion rate (percentage of leads that moved to next stage)
        const nextStageIndex = stage.orderIndex + 1;
        const nextStage = pipeline.stages.find((s) => s.orderIndex === nextStageIndex);
        
        let conversionRate = 0;
        if (nextStage) {
          const movedToNextStage = await prisma.stageHistory.count({
            where: {
              fromStageId: stage.id,
              toStageId: nextStage.id,
              changedAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
            },
          });
          
          conversionRate = count > 0 ? Math.round((movedToNextStage / count) * 100) : 0;
        } else {
          // Last stage - calculate based on sold leads
          const soldCount = await prisma.lead.count({
            where: {
              pipelineStageId: stage.id,
              sold: true,
              createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
            },
          });
          conversionRate = count > 0 ? Math.round((soldCount / count) * 100) : 0;
        }

        // Calculate average time in stage
        const avgTimeInStage = await this.calculateAvgTimeInStage(stage.id, dateRange);

        return {
          stageId: stage.id,
          stageName: stage.name,
          stageColor: stage.color || '#6B7280',
          orderIndex: stage.orderIndex,
          count,
          conversionRate,
          avgTimeInStage,
        };
      })
    );

    return {
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
      },
      stages: stageCounts,
      period,
      dateRange,
    };
  },

  /**
   * Get dispositions pipeline timeline metrics
   */
  async getPipelineTimeline(period: string = 'This Month') {
    const pipeline = await prisma.pipelineDefinition.findUnique({
      where: { key: PipelineKey.DISPOSITIONS },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!pipeline) {
      throw new Error('Dispositions pipeline not found');
    }

    const dateRange = this.getDateRange(period);

    // Calculate transition times between stages
    const transitions = [];

    for (let i = 0; i < pipeline.stages.length - 1; i++) {
      const fromStage = pipeline.stages[i];
      const toStage = pipeline.stages[i + 1];

      const transitionData = await this.calculateTransitionMetrics(
        fromStage.id,
        toStage.id,
        dateRange
      );

      transitions.push({
        fromStage: fromStage.name,
        toStage: toStage.name,
        ...transitionData,
      });
    }

    // Calculate total pipeline time (first stage to last stage)
    const firstStage = pipeline.stages[0];
    const lastStage = pipeline.stages[pipeline.stages.length - 1];
    const totalPipelineTime = await this.calculateTransitionMetrics(
      firstStage.id,
      lastStage.id,
      dateRange,
      true // includeAllIntermediateStages
    );

    return {
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
      },
      transitions,
      totalPipelineTime: {
        fromStage: firstStage.name,
        toStage: lastStage.name,
        ...totalPipelineTime,
      },
      period,
      dateRange,
    };
  },

  /**
   * Calculate average time spent in a specific stage
   */
  async calculateAvgTimeInStage(
    stageId: string,
    dateRange?: { start: Date; end: Date } | null
  ): Promise<number> {
    // Get all stage history records where leads entered this stage
    const entries = await prisma.stageHistory.findMany({
      where: {
        toStageId: stageId,
        changedAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
      },
      select: {
        leadId: true,
        changedAt: true,
      },
    });

    if (entries.length === 0) return 0;

    // For each entry, find when the lead left this stage
    const durations: number[] = [];

    for (const entry of entries) {
      const exit = await prisma.stageHistory.findFirst({
        where: {
          leadId: entry.leadId,
          fromStageId: stageId,
          changedAt: { gt: entry.changedAt },
        },
        orderBy: { changedAt: 'asc' },
      });

      if (exit) {
        const durationMs = exit.changedAt.getTime() - entry.changedAt.getTime();
        const durationDays = durationMs / (1000 * 60 * 60 * 24);
        durations.push(durationDays);
      }
    }

    if (durations.length === 0) return 0;

    const avgDays = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return Math.round(avgDays);
  },

  /**
   * Calculate transition metrics between two stages
   */
  async calculateTransitionMetrics(
    fromStageId: string,
    toStageId: string,
    dateRange?: { start: Date; end: Date } | null,
    includeAllIntermediateStages: boolean = false
  ): Promise<{
    avgTime: number;
    bestTime: number;
    worstTime: number;
    totalTransitions: number;
  }> {
    let transitions;

    if (includeAllIntermediateStages) {
      // For total pipeline time, find leads that went from first to last stage
      // Get all leads that entered the first stage
      const leadsEnteredFirst = await prisma.stageHistory.findMany({
        where: {
          toStageId: fromStageId,
          changedAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
        },
        select: {
          leadId: true,
          changedAt: true,
        },
      });

      const durations: number[] = [];

      for (const entry of leadsEnteredFirst) {
        // Find when this lead reached the last stage
        const exit = await prisma.stageHistory.findFirst({
          where: {
            leadId: entry.leadId,
            toStageId: toStageId,
            changedAt: { gt: entry.changedAt },
          },
          orderBy: { changedAt: 'asc' },
        });

        if (exit) {
          const durationMs = exit.changedAt.getTime() - entry.changedAt.getTime();
          const durationDays = durationMs / (1000 * 60 * 60 * 24);
          durations.push(durationDays);
        }
      }

      if (durations.length === 0) {
        return { avgTime: 0, bestTime: 0, worstTime: 0, totalTransitions: 0 };
      }

      return {
        avgTime: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
        bestTime: Math.round(Math.min(...durations)),
        worstTime: Math.round(Math.max(...durations)),
        totalTransitions: durations.length,
      };
    } else {
      // Direct transitions from one stage to another
      transitions = await prisma.stageHistory.findMany({
        where: {
          fromStageId,
          toStageId,
          changedAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
        },
        select: {
          leadId: true,
          changedAt: true,
        },
      });

      if (transitions.length === 0) {
        return { avgTime: 0, bestTime: 0, worstTime: 0, totalTransitions: 0 };
      }

      const durations: number[] = [];

      for (const transition of transitions) {
        // Find when this lead entered the fromStage
        const entry = await prisma.stageHistory.findFirst({
          where: {
            leadId: transition.leadId,
            toStageId: fromStageId,
            changedAt: { lt: transition.changedAt },
          },
          orderBy: { changedAt: 'desc' },
        });

        if (entry) {
          const durationMs = transition.changedAt.getTime() - entry.changedAt.getTime();
          const durationDays = durationMs / (1000 * 60 * 60 * 24);
          durations.push(durationDays);
        }
      }

      if (durations.length === 0) {
        return { avgTime: 0, bestTime: 0, worstTime: 0, totalTransitions: 0 };
      }

      return {
        avgTime: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
        bestTime: Math.round(Math.min(...durations)),
        worstTime: Math.round(Math.max(...durations)),
        totalTransitions: durations.length,
      };
    }
  },

  /**
   * Helper to calculate date range based on period string
   */
  getDateRange(period: string): { start: Date; end: Date } | null {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'This Month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'Last Month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth());
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'This Quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start.setMonth(currentQuarter * 3);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(currentQuarter * 3 + 3);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;

      default:
        return null;
    }

    return { start, end };
  },
};

