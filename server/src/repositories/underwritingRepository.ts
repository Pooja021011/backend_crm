import { prisma } from '../config/db.js';

export const underwritingRepository = {
  list: (leadId: string) => prisma.underwritingScenario.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' } }),
  create: (leadId: string, data: { name: string; inputs: any; outputs: any; isPrimary?: boolean; createdById?: string }) =>
    prisma.underwritingScenario.create({ data: { leadId, name: data.name, inputs: data.inputs, outputs: data.outputs, isPrimary: !!data.isPrimary, createdById: data.createdById || null } }),
  update: (id: string, data: Partial<{ name: string; inputs: any; outputs: any; isPrimary: boolean }>) => prisma.underwritingScenario.update({ where: { id }, data }),
  delete: (id: string) => prisma.underwritingScenario.delete({ where: { id } }),
  clearPrimary: (leadId: string) => prisma.underwritingScenario.updateMany({ where: { leadId }, data: { isPrimary: false } }),
  findById: (id: string) => prisma.underwritingScenario.findUnique({ where: { id } }),
};

