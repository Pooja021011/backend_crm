import { leadOwnerRepository } from '../repositories/leadOwnerRepository.js';
import { logger } from '../config/logger.js';

export const leadOwnerService = {
  /**
   * Get all owners for a lead
   */
  async getOwners(leadId: string) {
    try {
      return await leadOwnerRepository.getByLeadId(leadId);
    } catch (error: any) {
      logger.error('Error getting lead owners', { error: error.message, leadId });
      throw error;
    }
  },

  /**
   * Add a new owner
   */
  async addOwner(leadId: string, ownerData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    isPrimary?: boolean;
  }) {
    try {
      const normalized = {
        firstName: String(ownerData.firstName || '').trim(),
        lastName: String(ownerData.lastName || '').trim(),
        phone: String(ownerData.phone || '').trim(),
        email: String(ownerData.email || '').trim(),
        isPrimary: ownerData.isPrimary,
      };

      // All fields optional, but don't create a completely blank owner row
      if (!normalized.firstName && !normalized.lastName && !normalized.phone && !normalized.email) {
        throw new Error('At least one owner field is required');
      }

      // Validate email format only if provided
      if (normalized.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalized.email)) {
          throw new Error('Invalid email format');
        }
      }

      // Get current owners count for order
      const existingOwners = await leadOwnerRepository.getByLeadId(leadId);
      const order = existingOwners.length;

      // If no owners exist, make this one primary
      const isPrimary = existingOwners.length === 0 ? true : (normalized.isPrimary || false);

      return await leadOwnerRepository.create({
        leadId,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        phone: normalized.phone,
        email: normalized.email,
        isPrimary,
        order
      });
    } catch (error: any) {
      logger.error('Error adding owner', { error: error.message, leadId });
      throw error;
    }
  },

  /**
   * Update an owner
   */
  async updateOwner(ownerId: string, ownerData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }) {
    try {
      // Validate email if provided
      if (ownerData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ownerData.email)) {
          throw new Error('Invalid email format');
        }
      }

      return await leadOwnerRepository.update(ownerId, ownerData);
    } catch (error: any) {
      logger.error('Error updating owner', { error: error.message, ownerId });
      throw error;
    }
  },

  /**
   * Delete an owner
   */
  async deleteOwner(ownerId: string) {
    try {
      // Get the owner being deleted
      const ownerToDelete = await leadOwnerRepository.findById(ownerId);
      if (!ownerToDelete) {
        throw new Error('Owner not found');
      }

      // Delete the owner
      await leadOwnerRepository.delete(ownerId);

      // If we deleted the primary owner, promote the next owner to primary
      if (ownerToDelete.isPrimary) {
        const remainingOwners = await leadOwnerRepository.getByLeadId(ownerToDelete.leadId);
        if (remainingOwners.length > 0) {
          // Promote the first remaining owner to primary
          await leadOwnerRepository.setPrimary(remainingOwners[0].id);
        }
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Error deleting owner', { error: error.message, ownerId });
      throw error;
    }
  },

  /**
   * Set an owner as primary
   */
  async setPrimaryOwner(ownerId: string) {
    try {
      return await leadOwnerRepository.setPrimary(ownerId);
    } catch (error: any) {
      logger.error('Error setting primary owner', { error: error.message, ownerId });
      throw error;
    }
  }
};

