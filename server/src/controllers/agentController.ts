import type { Request, Response } from 'express';
import { agentService } from '../services/agentService.js';
import { createAgentSchema, updateAgentSchema } from '../validators/agentValidators.js';

export const agentController = {
  // List all agents (available to all authenticated users)
  listAgents: async (req: Request, res: Response) => {
    try {
      const agents = await agentService.listAgents();
      res.json({ data: agents });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  },

  // Get single agent by ID (admin only)
  getAgent: async (req: Request, res: Response) => {
    try {
      const agent = await agentService.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ data: agent });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  },

  // Create new agent (admin only)
  createAgent: async (req: Request, res: Response) => {
    try {
      const validatedData = createAgentSchema.parse(req.body);
      const agent = await agentService.createAgent(validatedData);
      res.status(201).json({ data: agent });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create agent' });
    }
  },

  // Update agent (admin only)
  updateAgent: async (req: Request, res: Response) => {
    try {
      const validatedData = updateAgentSchema.parse(req.body);
      const agent = await agentService.updateAgent(req.params.id, validatedData);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ data: agent });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update agent' });
    }
  },

  // Delete agent (admin/manager). Body may include { reassignToAgentId: string | null } to reassign or unassign leads.
  deleteAgent: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const body = (req as any).body ?? {};
      const query = (req as any).query ?? {};
      const raw = body.reassignToAgentId ?? query.reassignToAgentId;
      const reassignToAgentId =
        raw === undefined ? undefined : raw === null || raw === 'null' ? null : String(raw);
      const options =
        reassignToAgentId !== undefined ? { reassignToAgentId } : undefined;
      const deleted = await agentService.deleteAgent(id, options);
      if (!deleted) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.message?.includes('has assigned leads')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  },
};
