import { prisma } from '../config/db.js';

export const rehabBudgetRepository = {
  /**
   * Get rehab budget for a lead
   */
  async getByLeadId(leadId: string) {
    return prisma.rehabBudget.findUnique({
      where: { leadId }
    });
  },

  /**
   * Create or update rehab budget
   */
  async upsert(leadId: string, data: {
    finishLevel?: string;
    toggledItems: any;
    customValues?: any;
    subtotal: number;
    contingencyAmount: number;
    totalCost: number;
  }) {
    return prisma.rehabBudget.upsert({
      where: { leadId },
      create: {
        leadId,
        ...data
      },
      update: data
    });
  },

  /**
   * Delete rehab budget
   */
  async delete(leadId: string) {
    return prisma.rehabBudget.delete({
      where: { leadId }
    });
  }
};

