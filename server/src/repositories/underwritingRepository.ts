import { prisma } from '../config/db.js';

export const underwritingRepository = {
  /**
   * Get all underwriting calculations for a lead
   */
  async getByLeadId(leadId: string) {
    return prisma.underwritingCalculation.findMany({
      where: { leadId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Get latest calculation for a lead
   */
  async getLatest(leadId: string) {
    return prisma.underwritingCalculation.findFirst({
      where: { leadId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Create a new calculation
   */
  async create(data: {
    leadId: string;
    arv: number;
    rehabCost: number;
    taxes?: number;
    timeline?: number;
    finalOffer: number;
    calculatedBy?: string;
    notes?: string;
  }) {
    return prisma.underwritingCalculation.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  },

  /**
   * Delete a calculation
   */
  async delete(id: string) {
    return prisma.underwritingCalculation.delete({
      where: { id }
    });
  }
};
