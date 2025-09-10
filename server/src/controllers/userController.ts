import type { Request, Response } from 'express';
import { userService } from '../services/userService.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { createUserSchema, updateUserSchema } from '../validators/authValidators.js';

export const userController = {
  // GET /users
  async list(req: Request, res: Response) {
    const skip = Number(req.query.skip || 0);
    const take = Math.min(Number(req.query.take || 20), 100);
    const users = await userService.list(skip, take);
    res.json({ data: users.map(userSerializer), skip, take });
  },

  // POST /users
  async create(req: Request, res: Response) {
    const input = createUserSchema.parse(req.body);
    const user = await userService.create(input);
    res.status(201).json({ data: userSerializer(user) });
  },

  // GET /users/:id
  async get(req: Request, res: Response) {
    const user = await userService.get(req.params.id);
    res.json({ data: userSerializer(user) });
  },

  // PATCH /users/:id
  async update(req: Request, res: Response) {
    const input = updateUserSchema.parse(req.body);
    const user = await userService.update(req.params.id, input);
    res.json({ data: userSerializer(user) });
  },
};

function userSerializer(u: any) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    roles: u.roles?.map((r: any) => r.role.name) || [],
    status: u.status,
    createdAt: u.createdAt,
  };
}

