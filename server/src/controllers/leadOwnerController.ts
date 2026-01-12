import type { Request, Response } from 'express';
import { leadOwnerService } from '../services/leadOwnerService.js';
import { logger } from '../config/logger.js';

export const leadOwnerController = {
  /**
   * Get all owners for a lead
   */
  async getOwners(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const owners = await leadOwnerService.getOwners(leadId);
      
      res.json({
        success: true,
        data: owners
      });
    } catch (error: any) {
      logger.error('Error in getOwners controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get owners'
      });
    }
  },

  /**
   * Add a new owner
   */
  async addOwner(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { firstName, lastName, phone, email, isPrimary } = req.body;

      const payload = {
        firstName: String(firstName || '').trim(),
        lastName: String(lastName || '').trim(),
        phone: String(phone || '').trim(),
        email: String(email || '').trim(),
        isPrimary: Boolean(isPrimary),
      };

      // All fields optional, but don't create a completely blank owner row
      if (!payload.firstName && !payload.lastName && !payload.phone && !payload.email) {
        return res.status(400).json({
          success: false,
          error: 'At least one field is required (firstName, lastName, phone, email)'
        });
      }

      const owner = await leadOwnerService.addOwner(leadId, {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email,
        isPrimary: payload.isPrimary
      });

      res.status(201).json({
        success: true,
        data: owner
      });
    } catch (error: any) {
      logger.error('Error in addOwner controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add owner'
      });
    }
  },

  /**
   * Update an owner
   */
  async updateOwner(req: Request, res: Response) {
    try {
      const { ownerId } = req.params;
      const { firstName, lastName, phone, email } = req.body;

      const owner = await leadOwnerService.updateOwner(ownerId, {
        firstName,
        lastName,
        phone,
        email
      });

      res.json({
        success: true,
        data: owner
      });
    } catch (error: any) {
      logger.error('Error in updateOwner controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update owner'
      });
    }
  },

  /**
   * Delete an owner
   */
  async deleteOwner(req: Request, res: Response) {
    try {
      const { ownerId } = req.params;
      await leadOwnerService.deleteOwner(ownerId);

      res.json({
        success: true,
        message: 'Owner deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error in deleteOwner controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete owner'
      });
    }
  },

  /**
   * Set an owner as primary
   */
  async setPrimaryOwner(req: Request, res: Response) {
    try {
      const { ownerId } = req.params;
      const owner = await leadOwnerService.setPrimaryOwner(ownerId);

      res.json({
        success: true,
        data: owner
      });
    } catch (error: any) {
      logger.error('Error in setPrimaryOwner controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to set primary owner'
      });
    }
  }
};

