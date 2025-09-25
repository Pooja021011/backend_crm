import { dealRepository } from '../repositories/dealRepository.js';

export const dealService = {
  getByLeadId: (leadId: string) => dealRepository.findByLeadId(leadId),
  upsertByLeadId: (
    leadId: string,
    data: {
      contractPrice?: number | null;
      soldPrice?: number | null;
      netProfit?: number | null;
      contractedAt?: string | Date | null;
      closedAt?: string | Date | null;
    }
  ) => dealRepository.upsertByLeadId(leadId, {
    contractPrice: data.contractPrice ?? null,
    soldPrice: data.soldPrice ?? null,
    netProfit: data.netProfit ?? null,
    contractedAt: data.contractedAt ? new Date(data.contractedAt) : null,
    closedAt: data.closedAt ? new Date(data.closedAt) : null,
  }),
};


