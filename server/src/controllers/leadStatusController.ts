import type { Request, Response } from 'express';
import { leadStatusService } from '../services/leadStatusService.js';

export const leadStatusController = {
  /**
   * GET /lead-statuses
   * Get all lead statuses
   */
  async getAll(req: Request, res: Response) {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const statuses = await leadStatusService.getAllStatuses(activeOnly);
      return res.json({ success: true, data: statuses });
    } catch (error: any) {
      console.error('Error fetching lead statuses:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch lead statuses',
      });
    }
  },

  /**
   * GET /lead-statuses/:id
   * Get a single lead status by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const status = await leadStatusService.getStatusById(id);
      return res.json({ success: true, data: status });
    } catch (error: any) {
      console.error('Error fetching lead status:', error);
      return res.status(error.message === 'Lead status not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to fetch lead status',
      });
    }
  },

  /**
   * POST /lead-statuses
   * Create a new lead status
   */
  async create(req: Request, res: Response) {
    try {
      const { name, description, color, orderIndex, active, isDefault } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name is required',
        });
      }

      const status = await leadStatusService.createStatus({
        name: name.trim(),
        description: description?.trim(),
        color,
        orderIndex,
        active,
        isDefault,
      });

      return res.status(201).json({ success: true, data: status });
    } catch (error: any) {
      console.error('Error creating lead status:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create lead status',
      });
    }
  },

  /**
   * PUT /lead-statuses/:id
   * Update a lead status
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, color, orderIndex, active, isDefault } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (color !== undefined) updateData.color = color;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      if (active !== undefined) updateData.active = active;
      if (isDefault !== undefined) updateData.isDefault = isDefault;

      const status = await leadStatusService.updateStatus(id, updateData);
      return res.json({ success: true, data: status });
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      const statusCode = error.message === 'Lead status not found' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update lead status',
      });
    }
  },

  /**
   * DELETE /lead-statuses/:id
   * Delete a lead status
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await leadStatusService.deleteStatus(id);
      return res.json({ success: true, message: 'Lead status deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting lead status:', error);
      const statusCode = error.message === 'Lead status not found' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete lead status',
      });
    }
  },

  /**
   * POST /lead-statuses/reorder
   * Reorder lead statuses
   */
  async reorder(req: Request, res: Response) {
    try {
      const { statusOrders } = req.body;

      if (!Array.isArray(statusOrders)) {
        return res.status(400).json({
          success: false,
          message: 'statusOrders must be an array',
        });
      }

      await leadStatusService.reorderStatuses(statusOrders);
      return res.json({ success: true, message: 'Lead statuses reordered successfully' });
    } catch (error: any) {
      console.error('Error reordering lead statuses:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to reorder lead statuses',
      });
    }
  },
};
