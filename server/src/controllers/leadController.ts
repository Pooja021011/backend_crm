import type { Request, Response } from 'express';
import { leadService } from '../services/leadService.js';
import { listLeadsQuery, createSellerLeadSchema, createBuyerLeadSchema, createVendorLeadSchema, changeStageSchema, createTaskSchema } from '../validators/leadValidators.js';

export const leadController = {
  // Create lead by type
  async create(req: Request, res: Response) {
    const { type } = req.body;
    let parsed: any;
    if (type === 'SELLER') parsed = createSellerLeadSchema.parse(req.body);
    else if (type === 'BUYER') parsed = createBuyerLeadSchema.parse(req.body);
    else if (type === 'VENDOR') parsed = createVendorLeadSchema.parse(req.body);
    else return res.status(400).json({ error: 'Invalid type' });

    const created = await leadService.create(parsed, (req as any).user?.id);
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
    res.json({ data: leads, skip: q.skip ?? 0, take: q.take ?? 20 });
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

