import { underwritingRepository } from '../repositories/underwritingRepository.js';

function computeOutputs(inputs: { purchasePrice: number; repairCosts: number; arv: number; closingCosts: number; holdingCosts: number }) {
  const totalCost = inputs.purchasePrice + inputs.repairCosts + inputs.closingCosts + inputs.holdingCosts;
  const projectedProfit = inputs.arv - totalCost;
  const roi = totalCost > 0 ? projectedProfit / totalCost : 0;
  const cashOnCash = roi; // placeholder, refine later
  return { projectedProfit, roi, cashOnCash };
}

export const underwritingService = {
  list: (leadId: string) => underwritingRepository.list(leadId),
  create: async (leadId: string, input: { name: string; inputs: any; isPrimary?: boolean; createdById?: string }) => {
    const outputs = computeOutputs({
      purchasePrice: Number(input.inputs.purchasePrice || 0),
      repairCosts: Number(input.inputs.repairCosts || 0),
      arv: Number(input.inputs.arv || 0),
      closingCosts: Number(input.inputs.closingCosts || 0),
      holdingCosts: Number(input.inputs.holdingCosts || 0),
    });
    if (input.isPrimary) await underwritingRepository.clearPrimary(leadId);
    return underwritingRepository.create(leadId, { name: input.name, inputs: input.inputs, outputs, isPrimary: !!input.isPrimary, createdById: input.createdById });
  },
  update: async (id: string, leadId: string, input: Partial<{ name: string; inputs: any; isPrimary: boolean }>) => {
    let outputs: any | undefined;
    if (input.inputs) {
      outputs = computeOutputs({
        purchasePrice: Number(input.inputs.purchasePrice || 0),
        repairCosts: Number(input.inputs.repairCosts || 0),
        arv: Number(input.inputs.arv || 0),
        closingCosts: Number(input.inputs.closingCosts || 0),
        holdingCosts: Number(input.inputs.holdingCosts || 0),
      });
    }
    if (input.isPrimary) await underwritingRepository.clearPrimary(leadId);
    return underwritingRepository.update(id, { name: input.name, inputs: input.inputs, outputs, isPrimary: input.isPrimary });
  },
  delete: (id: string) => underwritingRepository.delete(id),
};

