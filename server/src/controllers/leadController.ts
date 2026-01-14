import type { Request, Response } from 'express';
import { leadService } from '../services/leadService.js';
import { listLeadsQuery, createSellerLeadSchema, createBuyerLeadSchema, createVendorLeadSchema, changeStageSchema, createTaskSchema } from '../validators/leadValidators.js';
import { logger } from '../config/logger.js';

export const leadController = {
  // Create lead by type
  async create(req: Request, res: Response) {
    const { type } = req.body;
    let parsed: any;
    if (type === 'SELLER') parsed = createSellerLeadSchema.parse(req.body);
    else if (type === 'BUYER') parsed = createBuyerLeadSchema.parse(req.body);
    else if (type === 'VENDOR') parsed = createVendorLeadSchema.parse(req.body);
    else return res.status(400).json({ error: 'Invalid type' });

    // DEBUG LOG: Manual lead creation (H7, H8)
    logger.info({
      event: 'LEAD_CREATE_MANUAL',
      leadType: type,
      hasAssignedUserId: !!parsed.assignedUserId,
      assignedUserId: parsed.assignedUserId || null,
      createdBy: (req as any).user?.id,
      source: 'manual'
    }, `Manual lead creation - type: ${type}, assignedUserId: ${parsed.assignedUserId ? 'provided' : 'not provided'}`);

    const created = await leadService.create(parsed, (req as any).user?.id);
    
    // DEBUG LOG: Lead created result
    logger.info({
      event: 'LEAD_CREATED_MANUAL',
      leadId: created.id,
      leadType: type,
      finalAssignedUserId: created.assignedUserId,
      wasAutoAssigned: !parsed.assignedUserId && !!created.assignedUserId
    }, `Manual lead created - ID: ${created.id}, assigned to: ${created.assignedUserId || 'none'}`);
    
    res.status(201).json({ data: created });
  },

  async update(req: Request, res: Response) {
    const updated = await leadService.update(req.params.id, req.body);
    res.json({ data: updated });
  },

  async get(req: Request, res: Response) {
    const lead = await leadService.get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Not found' });
    res.json({ data: lead });
  },

  async list(req: Request, res: Response) {
    const q = listLeadsQuery.parse(req.query);
    const user = (req as any).user;
    // Roles are already strings in the JWT token, no need to map
    const userRoles = user?.roles || [];
    const userId = user?.id;
    
    const params = {
      ...q,
      userRoles,
      userId
    };
    
    const leads = await leadService.list(params);
    res.json({ data: leads, skip: q.skip ?? 0, take: q.take ?? 10000 }); // Default to 10000 leads
  },

  async searchByPhone(req: Request, res: Response) {
    const { phone } = req.query;
    
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
      const lead = await leadService.findByPhoneNumber(phone);
      
      if (lead) {
        res.json({ lead });
      } else {
        res.json({ lead: null });
      }
    } catch (error: any) {
      console.error('Error searching lead by phone:', error);
      res.status(500).json({ error: 'Failed to search lead' });
    }
  },

  async delete(req: Request, res: Response) {
    const lead = await leadService.get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    await leadService.delete(req.params.id);
    res.json({ success: true });
  },

  async changeStage(req: Request, res: Response) {
    const body = changeStageSchema.parse(req.body);
    // Enforce special workflows based on simple rules
    // Long Term Follow Up or Dead require conditions for SELLER leads
    // VIP/Blacklisted for BUYER handled by separate updates typically
    const lead = await leadService.changeStage(req.params.id, body.toStageId, (req as any).user?.id);
    if (!lead) return res.status(404).json({ error: 'Not found' });
    res.json({ data: lead });
  },

  async getStageHistory(req: Request, res: Response) {
    const history = await leadService.getStageHistory(req.params.id);
    res.json({ data: history });
  },

  // Tasks
  async listTasks(req: Request, res: Response) {
    res.json({ data: await leadService.listTasks(req.params.id) });
  },
  async createTask(req: Request, res: Response) {
    const body = createTaskSchema.parse(req.body);
    const task = await leadService.createTask(req.params.id, { ...body, createdById: (req as any).user?.id });
    res.status(201).json({ data: task });
  },
  async updateTask(req: Request, res: Response) {
    const task = await leadService.updateTask(req.params.taskId, req.body);
    res.json({ data: task });
  },
  async deleteTask(req: Request, res: Response) {
    await leadService.deleteTask(req.params.taskId);
    res.json({ success: true });
  },
};

