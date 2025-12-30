import { prisma } from '../config/db.js';

export const communicationRepository = {
  list: (leadId: string, filters?: { type?: string; from?: Date; to?: Date }) =>
    prisma.communication.findMany({
      where: {
        leadId,
        ...(filters?.type ? { type: filters.type as any } : {}),
        ...(filters?.from || filters?.to ? { occurredAt: { gte: filters?.from || undefined, lte: filters?.to || undefined } } : {}),
      },
      orderBy: { occurredAt: 'desc' },
    }),
  create: (leadId: string, data: { type: string; direction: string; subject?: string; body?: string; occurredAt: Date; createdById?: string; attachmentFileIds?: string[]; metadata?: any }) =>
    prisma.communication.create({
      data: {
        leadId,
        type: data.type as any,
        direction: data.direction as any,
        subject: data.subject || null,
        body: data.body || null,
        occurredAt: data.occurredAt,
        createdById: data.createdById || null,
        metadata: data.metadata || null,
        attachments: data.attachmentFileIds?.length ? { create: data.attachmentFileIds.map((id) => ({ file: { connect: { id } } })) } : undefined,
      }
    }),
};

