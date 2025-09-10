import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  roles: z.array(z.enum(['ADMIN', 'MANAGER', 'ACQ', 'DISP', 'TC'])).min(1),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  password: z.string().min(8).optional(),
  roles: z.array(z.enum(['ADMIN', 'MANAGER', 'ACQ', 'DISP', 'TC'])).optional(),
});

