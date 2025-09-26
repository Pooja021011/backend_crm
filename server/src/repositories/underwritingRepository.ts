import { PrismaClient, UnderwritingScenario } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateUnderwritingScenarioData {
  leadId: string;
  name: string;
  isPrimary?: boolean;
  inputs: {
    purchasePrice?: number;
    repairCosts?: number;
    arv?: number; // After Repair Value
    holdingCosts?: number;
    closingCosts?: number;
    realtorFees?: number;
    otherCosts?: number;
  };
  createdById?: string;
}

export interface UpdateUnderwritingScenarioData {
  name?: string;
  isPrimary?: boolean;
  inputs?: {
    purchasePrice?: number;
    repairCosts?: number;
    arv?: number;
    holdingCosts?: number;
    closingCosts?: number;
    realtorFees?: number;
    otherCosts?: number;
  };
}

export const underwritingRepository = {
  async getScenariosByLeadId(leadId: string): Promise<UnderwritingScenario[]> {
    return prisma.underwritingScenario.findMany({
      where: { leadId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' }
      ],
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

  async getScenarioById(id: string): Promise<UnderwritingScenario | null> {
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

  async createScenario(data: CreateUnderwritingScenarioData): Promise<UnderwritingScenario> {
    // Calculate outputs from inputs
    const inputs = data.inputs;
    const outputs = this.calculateOutputs(inputs);

    // If this is marked as primary, unset other primary scenarios for this lead
    if (data.isPrimary) {
      await prisma.underwritingScenario.updateMany({
        where: { 
          leadId: data.leadId,
          isPrimary: true 
        },
        data: { isPrimary: false }
      });
    }

    return prisma.underwritingScenario.create({
      data: {
        leadId: data.leadId,
        name: data.name,
        isPrimary: data.isPrimary || false,
        inputs: inputs as any,
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

  async updateScenario(id: string, data: UpdateUnderwritingScenarioData): Promise<UnderwritingScenario> {
    const scenario = await prisma.underwritingScenario.findUnique({ where: { id } });
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // If this is being set as primary, unset other primary scenarios for this lead
    if (data.isPrimary) {
      await prisma.underwritingScenario.updateMany({
        where: { 
          leadId: scenario.leadId,
          isPrimary: true,
          id: { not: id }
        },
        data: { isPrimary: false }
      });
    }

    // Merge inputs and recalculate outputs
    const currentInputs = scenario.inputs as any;
    const newInputs = { ...currentInputs, ...data.inputs };
    const outputs = this.calculateOutputs(newInputs);

    return prisma.underwritingScenario.update({
      where: { id },
      data: {
        name: data.name,
        isPrimary: data.isPrimary,
        inputs: newInputs,
        outputs: outputs
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

  async deleteScenario(id: string): Promise<void> {
    await prisma.underwritingScenario.delete({
      where: { id }
    });
  },

  calculateOutputs(inputs: any) {
    const {
      purchasePrice = 0,
      repairCosts = 0,
      arv = 0,
      holdingCosts = 0,
      closingCosts = 0,
      realtorFees = 0,
      otherCosts = 0
    } = inputs;

    const totalCosts = purchasePrice + repairCosts + holdingCosts + closingCosts + realtorFees + otherCosts;
    const profit = arv - totalCosts;
    const roi = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;
    const cashOnCash = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;

    return {
      totalCosts,
      profit,
      roi: Math.round(roi * 100) / 100, // Round to 2 decimal places
      cashOnCash: Math.round(cashOnCash * 100) / 100,
      profitMargin: arv > 0 ? Math.round((profit / arv) * 10000) / 100 : 0
    };
  }
};