import { prisma } from '../config/db.js';

export const fileRepository = {
  listByLead: (leadId: string) =>
    prisma.leadFile.findMany({ where: { leadId }, include: { file: { include: { versions: true, categories: { include: { category: true } } } } }, orderBy: { file: { createdAt: 'desc' } } }),

  createForLead: async (leadId: string, meta: { filename: string; mimeType: string; size: number; storageKey: string; uploadedById?: string | null }, categoryIds?: string[]) => {
    const file = await prisma.file.create({
      data: {
        filename: meta.filename,
        mimeType: meta.mimeType,
        size: meta.size,
        storageKey: meta.storageKey,
        uploadedById: meta.uploadedById || null,
        versions: { create: { versionNo: 1, storageKey: meta.storageKey } },
        leadFiles: { create: { leadId } },
        categories: categoryIds?.length ? { create: categoryIds.map((id) => ({ docCategoryId: id })) } : undefined,
      },
      include: { versions: true }
    });
    return file;
  },

  addVersion: async (fileId: string, storageKey: string) => {
    const last = await prisma.fileVersion.findFirst({ where: { fileId }, orderBy: { versionNo: 'desc' } });
    const versionNo = (last?.versionNo || 0) + 1;
    return prisma.fileVersion.create({ data: { fileId, versionNo, storageKey } });
  },

  findById: (id: string) => prisma.file.findUnique({ where: { id }, include: { versions: true } }),
};

