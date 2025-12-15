import { prisma } from '../config/db.js';

export const leadOwnerRepository = {
  /**
   * Get all owners for a lead
   */
  async getByLeadId(leadId: string) {
    return prisma.leadOwner.findMany({
      where: { leadId },
      orderBy: [
        { isPrimary: 'desc' },
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });
  },

  /**
   * Get primary owner for a lead
   */
  async getPrimaryOwner(leadId: string) {
    return prisma.leadOwner.findFirst({
      where: { leadId, isPrimary: true }
    });
  },

  /**
   * Create a new owner
   */
  async create(data: {
    leadId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    isPrimary?: boolean;
    order?: number;
  }) {
    // If this is set as primary, unset other primary owners
    if (data.isPrimary) {
      await prisma.leadOwner.updateMany({
        where: { leadId: data.leadId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    return prisma.leadOwner.create({
      data
    });
  },

  /**
   * Update an owner
   */
  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    isPrimary?: boolean;
    order?: number;
  }) {
    const owner = await prisma.leadOwner.findUnique({ where: { id } });
    if (!owner) throw new Error('Owner not found');

    // If setting as primary, unset other primary owners
    if (data.isPrimary) {
      await prisma.leadOwner.updateMany({
        where: { leadId: owner.leadId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false }
      });
    }

    return prisma.leadOwner.update({
      where: { id },
      data
    });
  },

  /**
   * Delete an owner
   */
  async delete(id: string) {
    return prisma.leadOwner.delete({
      where: { id }
    });
  },

  /**
   * Set an owner as primary
   */
  async setPrimary(id: string) {
    const owner = await prisma.leadOwner.findUnique({ where: { id } });
    if (!owner) throw new Error('Owner not found');

    // Unset other primary owners
    await prisma.leadOwner.updateMany({
      where: { leadId: owner.leadId, isPrimary: true },
      data: { isPrimary: false }
    });

    // Set this one as primary
    return prisma.leadOwner.update({
      where: { id },
      data: { isPrimary: true }
    });
  }
};

