import { prisma } from '../config/db.js';

// Types for scenario operations
export interface UnderwritingCalculationInputs {
  purchasePrice?: number;
  repairCosts?: number;
  arv?: number;
  holdingCosts?: number;
  closingCosts?: number;
  realtorFees?: number;
  otherCosts?: number;
}

export interface CreateUnderwritingScenarioData {
  leadId: string;
  name: string;
  isPrimary?: boolean;
  inputs: UnderwritingCalculationInputs;
  outputs?: any;
  createdById?: string;
}

export interface UpdateUnderwritingScenarioData {
  name?: string;
  isPrimary?: boolean;
  inputs?: UnderwritingCalculationInputs;
  outputs?: any;
}

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
  },

  // ========== SCENARIO METHODS ==========

  /**
   * Get all scenarios for a lead
   */
  async getScenariosByLeadId(leadId: string) {
    return prisma.underwritingScenario.findMany({
      where: { leadId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  },

  /**
   * Get a scenario by ID
   */
  async getScenarioById(id: string) {
    return prisma.underwritingScenario.findUnique({
      where: { id },
      include: {
        createdBy: {
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
   * Create a new scenario
   */
  async createScenario(data: CreateUnderwritingScenarioData) {
    // If this is set as primary, unset other primary scenarios for this lead
    if (data.isPrimary) {
      await prisma.underwritingScenario.updateMany({
        where: {
          leadId: data.leadId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      });
    }

    // Calculate outputs if inputs provided
    const outputs = data.outputs || this.calculateOutputs(data.inputs);

    return prisma.underwritingScenario.create({
      data: {
        leadId: data.leadId,
        name: data.name,
        isPrimary: data.isPrimary || false,
        inputs: data.inputs as any,
        outputs: outputs as any,
        createdById: data.createdById
      },
      include: {
        createdBy: {
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
   * Update a scenario
   */
  async updateScenario(id: string, data: UpdateUnderwritingScenarioData) {
    const scenario = await prisma.underwritingScenario.findUnique({
      where: { id }
    });

    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // If setting as primary, unset other primary scenarios for this lead
    if (data.isPrimary) {
      await prisma.underwritingScenario.updateMany({
        where: {
          leadId: scenario.leadId,
          isPrimary: true,
          id: { not: id }
        },
        data: {
          isPrimary: false
        }
      });
    }

    // Calculate outputs if inputs are being updated
    let outputs = data.outputs;
    if (data.inputs && !outputs) {
      outputs = this.calculateOutputs(data.inputs);
    }

    return prisma.underwritingScenario.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.inputs && { inputs: data.inputs as any }),
        ...(outputs && { outputs: outputs as any })
      },
      include: {
        createdBy: {
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
   * Delete a scenario
   */
  async deleteScenario(id: string) {
    return prisma.underwritingScenario.delete({
      where: { id }
    });
  },

  /**
   * Calculate outputs from inputs
   */
  calculateOutputs(inputs: UnderwritingCalculationInputs): any {
    const purchasePrice = inputs.purchasePrice || 0;
    const repairCosts = inputs.repairCosts || 0;
    const arv = inputs.arv || 0;
    const holdingCosts = inputs.holdingCosts || 0;
    const closingCosts = inputs.closingCosts || 0;
    const realtorFees = inputs.realtorFees || 0;
    const otherCosts = inputs.otherCosts || 0;

    const totalCosts = purchasePrice + repairCosts + holdingCosts + closingCosts + realtorFees + otherCosts;
    const profit = arv - totalCosts;
    const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
    const cashOnCash = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;
    const profitMargin = arv > 0 ? (profit / arv) * 100 : 0;

    return {
      totalCosts: Math.round(totalCosts * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      cashOnCash: Math.round(cashOnCash * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100
    };
  }
};
