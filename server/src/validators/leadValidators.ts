import { z } from 'zod';

export const listLeadsQuery = z.object({
  type: z.enum(['SELLER', 'BUYER', 'VENDOR']).optional(),
  marketId: z.string().uuid().optional(),
  pipelineStageId: z.string().uuid().optional(),
  status: z.string().optional(),
  countyId: z.string().uuid().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  updatedFrom: z.string().datetime().optional(),
  updatedTo: z.string().datetime().optional(),
  tasksDueBefore: z.string().datetime().optional(),
  priceRangeIds: z.array(z.string().uuid()).optional(),
  assetClassIds: z.array(z.string().uuid()).optional(),
  vipBuyer: z.coerce.boolean().optional(),
  blacklistedBuyer: z.coerce.boolean().optional(),
  vendorCompany: z.string().optional(),
  vendorIndustry: z.string().optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export const changeStageSchema = z.object({
  toStageId: z.string().uuid(),
  reason: z.string().optional(),
});

export const createSellerLeadSchema = z.object({
  type: z.literal('SELLER'),
  marketId: z.string().uuid().optional(),
  address: z.object({
    address1: z.string().min(3),
    city: z.string().min(1),
    state: z.string().min(2),
    zip: z.string().min(3),
    countyId: z.string().uuid().optional(),
  }),
  seller: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email(),
    motivation: z.string().optional(),
    notes: z.string().optional(),
  }),
  assignedUserId: z.string().uuid().optional(),
  pipelineStageId: z.string().uuid().optional(),
});

export const createBuyerLeadSchema = z.object({
  type: z.literal('BUYER'),
  marketId: z.string().uuid().optional(),
  buyer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email(),
    vip: z.boolean().optional(),
  }),
  criteria: z.object({
    marketIds: z.array(z.string().uuid()).optional(),
    assetClassIds: z.array(z.string().uuid()).optional(),
    priceRangeIds: z.array(z.string().uuid()).optional(),
  }).optional(),
  assignedUserId: z.string().uuid().optional(),
  pipelineStageId: z.string().uuid().optional(),
});

export const createVendorLeadSchema = z.object({
  type: z.literal('VENDOR'),
  marketId: z.string().uuid().optional(),
  vendor: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email(),
    company: z.string().min(1),
    industry: z.string().min(1),
    marketIds: z.array(z.string().uuid()).optional(),
  }),
  assignedUserId: z.string().uuid().optional(),
  pipelineStageId: z.string().uuid().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().min(1),
  assignedToId: z.string().uuid().optional(),
});

