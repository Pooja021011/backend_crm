import { leadStatusRepository } from '../repositories/leadStatusRepository.js';

export const leadStatusService = {
  /**
   * Get all lead statuses
   */
  async getAllStatuses(activeOnly: boolean = false) {
    if (activeOnly) {
      return await leadStatusRepository.findActive();
    }
    return await leadStatusRepository.findAll();
  },

  /**
   * Get lead status by ID
   */
  async getStatusById(id: string) {
    const status = await leadStatusRepository.findById(id);
    if (!status) {
      throw new Error('Lead status not found');
    }
    return status;
  },

  /**
   * Create a new lead status
   */
  async createStatus(data: {
    name: string;
    description?: string;
    color?: string;
    orderIndex?: number;
    active?: boolean;
    isDefault?: boolean;
  }) {
    // Check if name already exists
    const exists = await leadStatusRepository.existsByName(data.name);
    if (exists) {
      throw new Error('A lead status with this name already exists');
    }

    // If orderIndex not provided, set it to the end
    if (data.orderIndex === undefined) {
      const allStatuses = await leadStatusRepository.findAll();
      data.orderIndex = allStatuses.length;
    }

    return await leadStatusRepository.create(data);
  },

  /**
   * Update a lead status
   */
  async updateStatus(
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
    // Check if status exists
    const status = await leadStatusRepository.findById(id);
    if (!status) {
      throw new Error('Lead status not found');
    }

    // If updating name, check if it already exists
    if (data.name && data.name !== status.name) {
      const exists = await leadStatusRepository.existsByName(data.name, id);
      if (exists) {
        throw new Error('A lead status with this name already exists');
      }
    }

    return await leadStatusRepository.update(id, data);
  },

  /**
   * Delete a lead status
   */
  async deleteStatus(id: string) {
    // Check if status exists
    const status = await leadStatusRepository.findById(id);
    if (!status) {
      throw new Error('Lead status not found');
    }

    // Prevent deleting default status
    if (status.isDefault) {
      throw new Error('Cannot delete default lead status');
    }

    return await leadStatusRepository.delete(id);
  },

  /**
   * Reorder lead statuses
   */
  async reorderStatuses(statusOrders: { id: string; orderIndex: number }[]) {
    return await leadStatusRepository.reorder(statusOrders);
  },
};
