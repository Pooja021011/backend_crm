import { prisma } from '../config/db.js';

export const leadStatusRepository = {
  /**
   * Get all lead statuses
   */
  async findAll() {
    return await prisma.leadStatus.findMany({
      orderBy: { orderIndex: 'asc' },
    });
  },

  /**
   * Get active lead statuses only
   */
  async findActive() {
    return await prisma.leadStatus.findMany({
      where: { active: true },
      orderBy: { orderIndex: 'asc' },
    });
  },

  /**
   * Get lead status by ID
   */
  async findById(id: string) {
    return await prisma.leadStatus.findUnique({
      where: { id },
    });
  },

  /**
   * Create a new lead status
   */
  async create(data: {
    name: string;
    description?: string;
    color?: string;
    orderIndex?: number;
    active?: boolean;
    isDefault?: boolean;
  }) {
    return await prisma.leadStatus.create({
      data,
    });
  },

  /**
   * Update a lead status
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
      orderIndex?: number;
      active?: boolean;
      isDefault?: boolean;
    }
  ) {
    return await prisma.leadStatus.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete a lead status
   */
  async delete(id: string) {
    return await prisma.leadStatus.delete({
      where: { id },
    });
  },

  /**
   * Check if status name exists
   */
  async existsByName(name: string, excludeId?: string) {
    const where: any = { name };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await prisma.leadStatus.count({ where });
    return count > 0;
  },

  /**
   * Reorder statuses
   */
  async reorder(statusOrders: { id: string; orderIndex: number }[]) {
    const updates = statusOrders.map(({ id, orderIndex }) =>
      prisma.leadStatus.update({
        where: { id },
        data: { orderIndex },
      })
    );
    return await prisma.$transaction(updates);
  },
};
