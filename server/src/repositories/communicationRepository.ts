import { prisma } from '../config/db.js';

export const communicationRepository = {
  list: (leadId: string, filters?: { type?: string; from?: Date; to?: Date }) =>
    prisma.communication.findMany({
      where: {
        leadId,
        ...(filters?.type ? { type: filters.type as any } : {}),
        ...(filters?.from || filters?.to ? { occurredAt: { gte: filters?.from || undefined, lte: filters?.to || undefined } } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            smsSettings: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
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

  updateNote: (params: { id: string; body: string; direction: string; metadata?: any }) =>
    prisma.communication.update({
      where: { id: params.id },
      data: {
        body: params.body,
        direction: params.direction as any,
        metadata: params.metadata || null,
      },
    }),

  findById: (id: string) =>
    prisma.communication.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            assignedUserId: true,
            dispAgentId: true,
            createdById: true,
            tasks: { select: { assignedToId: true, title: true } },
            address: { select: { address1: true, city: true, state: true } },
            seller: { select: { firstName: true, lastName: true } },
            buyer: { select: { firstName: true, lastName: true } },
            vendor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
};

