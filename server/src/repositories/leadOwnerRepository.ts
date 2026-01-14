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
   * Find owner by ID
   */
  async findById(id: string) {
    return prisma.leadOwner.findUnique({
      where: { id }
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
    const owner = await prisma.leadOwner.findUnique({ 
      where: { id },
      include: {
        lead: {
          include: {
            seller: true,
            buyer: true,
            vendor: true
          }
        }
      }
    });
    if (!owner) throw new Error('Owner not found');

    // If setting as primary, unset other primary owners
    if (data.isPrimary) {
      await prisma.leadOwner.updateMany({
        where: { leadId: owner.leadId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false }
      });
    }

    // Update the owner
    const updatedOwner = await prisma.leadOwner.update({
      where: { id },
      data
    });

    // BIDIRECTIONAL SYNC: If this is the primary owner, sync back to seller/buyer/vendor
    const isPrimary = data.isPrimary !== undefined ? data.isPrimary : owner.isPrimary;
    if (isPrimary && (data.firstName || data.lastName || data.phone || data.email)) {
      const lead = owner.lead;
      const syncData: any = {};
      
      if (data.firstName !== undefined) syncData.firstName = data.firstName;
      if (data.lastName !== undefined) syncData.lastName = data.lastName;
      if (data.phone !== undefined) syncData.phone = data.phone;
      if (data.email !== undefined) syncData.email = data.email;

      // Sync to appropriate lead type
      if (lead.leadType === 'SELLER' && lead.seller) {
        await prisma.sellerDetail.update({
          where: { leadId: owner.leadId },
          data: syncData
        });
      } else if (lead.leadType === 'BUYER' && lead.buyer) {
        await prisma.buyerDetail.update({
          where: { leadId: owner.leadId },
          data: syncData
        });
      } else if (lead.leadType === 'VENDOR' && lead.vendor) {
        await prisma.vendorDetail.update({
          where: { leadId: owner.leadId },
          data: syncData
        });
      }
    }

    return updatedOwner;
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
    const owner = await prisma.leadOwner.findUnique({ 
      where: { id },
      include: {
        lead: {
          include: {
            seller: true,
            buyer: true,
            vendor: true
          }
        }
      }
    });
    if (!owner) throw new Error('Owner not found');

    // Unset other primary owners
    await prisma.leadOwner.updateMany({
      where: { leadId: owner.leadId, isPrimary: true },
      data: { isPrimary: false }
    });

    // Set this one as primary
    const updatedOwner = await prisma.leadOwner.update({
      where: { id },
      data: { isPrimary: true }
    });

    // BIDIRECTIONAL SYNC: When setting a new primary owner, sync their info to seller/buyer/vendor
    const lead = owner.lead;
    const syncData = {
      firstName: owner.firstName,
      lastName: owner.lastName,
      phone: owner.phone,
      email: owner.email
    };

    if (lead.leadType === 'SELLER' && lead.seller) {
      await prisma.sellerDetail.update({
        where: { leadId: owner.leadId },
        data: syncData
      });
    } else if (lead.leadType === 'BUYER' && lead.buyer) {
      await prisma.buyerDetail.update({
        where: { leadId: owner.leadId },
        data: syncData
      });
    } else if (lead.leadType === 'VENDOR' && lead.vendor) {
      await prisma.vendorDetail.update({
        where: { leadId: owner.leadId },
        data: syncData
      });
    }

    return updatedOwner;
  }
};

