import { prisma } from '../config/db.js';

export const marketingRepository = {
  list: (leadId: string) => prisma.marketingLink.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' } }),
  create: (leadId: string, data: { title: string; url: string; type?: string; createdById?: string }) =>
    prisma.marketingLink.create({ data: { leadId, title: data.title, url: data.url, type: data.type || null, createdById: data.createdById || null } }),
  update: (id: string, data: { title?: string; url?: string; type?: string }) => prisma.marketingLink.update({ where: { id }, data }),
  delete: (id: string) => prisma.marketingLink.delete({ where: { id } }),
};

