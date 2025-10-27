import { Request, Response } from 'express';
import { buyerService } from '../services/buyerService.js';
import { logger } from '../config/logger.js';

export const buyerController = {
  async listAll(req: Request, res: Response): Promise<void> {
    try {
      const buyers = await buyerService.getAllBuyers();
      res.json({ data: buyers });
    } catch (error) {
      logger.error('Error listing buyers: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to list buyers' });
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, phone, email, segmentation, criteria } = req.body;

      if (!firstName || !lastName || !phone || !email) {
        res.status(400).json({ error: 'First name, last name, phone, and email are required' });
        return;
      }

      const buyer = await buyerService.createBuyer({
        firstName,
        lastName,
        phone,
        email,
        segmentation,
        criteria
      });

      res.status(201).json({ data: buyer });
    } catch (error) {
      logger.error('Error creating buyer: ' + (error as Error).message);
      res.status(500).json({ error: 'Failed to create buyer' });
    }
  }
};

