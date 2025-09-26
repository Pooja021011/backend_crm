import { underwritingRepository, CreateUnderwritingScenarioData, UpdateUnderwritingScenarioData } from '../repositories/underwritingRepository';
import { UnderwritingScenario } from '@prisma/client';

export interface UnderwritingCalculationInputs {
  purchasePrice?: number;
  repairCosts?: number;
  arv?: number;
  holdingCosts?: number;
  closingCosts?: number;
  realtorFees?: number;
  otherCosts?: number;
}

export interface UnderwritingCalculationOutputs {
  totalCosts: number;
  profit: number;
  roi: number;
  cashOnCash: number;
  profitMargin: number;
}

export const underwritingService = {
  async getScenariosByLeadId(leadId: string): Promise<UnderwritingScenario[]> {
    return underwritingRepository.getScenariosByLeadId(leadId);
  },

  async getScenarioById(id: string): Promise<UnderwritingScenario | null> {
    return underwritingRepository.getScenarioById(id);
  },

  async createScenario(data: CreateUnderwritingScenarioData): Promise<UnderwritingScenario> {
    // Validate inputs
    this.validateInputs(data.inputs);
    
    return underwritingRepository.createScenario(data);
  },

  async updateScenario(id: string, data: UpdateUnderwritingScenarioData): Promise<UnderwritingScenario> {
    if (data.inputs) {
      this.validateInputs(data.inputs);
    }
    
    return underwritingRepository.updateScenario(id, data);
  },

  async deleteScenario(id: string): Promise<void> {
    return underwritingRepository.deleteScenario(id);
  },

  async setPrimaryScenario(id: string): Promise<UnderwritingScenario> {
    return underwritingRepository.updateScenario(id, { isPrimary: true });
  },

  calculateScenario(inputs: UnderwritingCalculationInputs): UnderwritingCalculationOutputs {
    return underwritingRepository.calculateOutputs(inputs);
  },

  async duplicateScenario(id: string, newName: string, userId?: string): Promise<UnderwritingScenario> {
    const original = await underwritingRepository.getScenarioById(id);
    if (!original) {
      throw new Error('Scenario not found');
    }

    const duplicateData: CreateUnderwritingScenarioData = {
      leadId: original.leadId,
      name: newName,
      isPrimary: false,
      inputs: original.inputs as any,
      createdById: userId
    };

    return underwritingRepository.createScenario(duplicateData);
  },

  validateInputs(inputs: UnderwritingCalculationInputs): void {
    // Validate that numeric inputs are non-negative
    const numericFields = ['purchasePrice', 'repairCosts', 'arv', 'holdingCosts', 'closingCosts', 'realtorFees', 'otherCosts'];
    
    for (const field of numericFields) {
      const value = inputs[field as keyof UnderwritingCalculationInputs];
      if (value !== undefined && (typeof value !== 'number' || value < 0)) {
        throw new Error(`${field} must be a non-negative number`);
      }
    }

    // Business logic validations
    if (inputs.arv !== undefined && inputs.purchasePrice !== undefined && inputs.arv < inputs.purchasePrice) {
      console.warn('ARV is less than purchase price - this may indicate an issue with the deal');
    }
  },

  async exportToPDF(scenarioId: string): Promise<Buffer> {
    // TODO: Implement PDF export functionality
    // This would use a library like puppeteer or jsPDF to generate a PDF report
    throw new Error('PDF export not yet implemented');
  }
};