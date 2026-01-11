import { prisma } from '../config/db.js';

export const compsPdfRepository = {
  async listByLeadId(leadId: string) {
    return prisma.leadCompPdf.findMany({
      where: { leadId },
      include: {
        file: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            uploadedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(leadId: string, fileId: string, uploadedById?: string | null) {
    return prisma.leadCompPdf.create({
      data: {
        leadId,
        fileId,
        uploadedById: uploadedById || null,
      },
    });
  },

  async deleteById(id: string) {
    return prisma.leadCompPdf.delete({
      where: { id },
    });
  },

  async findById(id: string) {
    return prisma.leadCompPdf.findUnique({
      where: { id },
      include: { file: true },
    });
  },
};


