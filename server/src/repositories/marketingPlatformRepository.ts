import { prisma } from '../config/db.js';

export interface CreateMarketingPlatformData {
  name: string;
  type: string;
  baseUrl: string;
  description?: string;
  isActive?: boolean;
  apiEndpoint?: string;
  authRequired?: boolean;
  configFields?: any[];
}

export interface UpdateMarketingPlatformData {
  name?: string;
  type?: string;
  baseUrl?: string;
  description?: string;
  isActive?: boolean;
  apiEndpoint?: string;
  authRequired?: boolean;
  configFields?: any[];
}

export const marketingPlatformRepository = {
  async create(data: CreateMarketingPlatformData) {
    return await prisma.marketingPlatform.create({
      data: {
        name: data.name,
        type: data.type,
        baseUrl: data.baseUrl,
        description: data.description,
        isActive: data.isActive ?? true,
        apiEndpoint: data.apiEndpoint,
        authRequired: data.authRequired ?? false,
        configFields: data.configFields || []
      }
    });
  },

  async findById(id: string) {
    return await prisma.marketingPlatform.findUnique({
      where: { id }
    });
  },

  async findAll(filters: { type?: string; isActive?: boolean } = {}) {
    const where: any = {};
    
    if (filters.type) {
      where.type = filters.type;
    }
    
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await prisma.marketingPlatform.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });
  },

  async update(id: string, data: UpdateMarketingPlatformData) {
    return await prisma.marketingPlatform.update({
      where: { id },
      data
    });
  },

  async delete(id: string) {
    return await prisma.marketingPlatform.delete({
      where: { id }
    });
  },

  async getByType(type: string, activeOnly: boolean = true) {
    const where: any = { type };
    
    if (activeOnly) {
      where.isActive = true;
    }

    return await prisma.marketingPlatform.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  },

  async toggleStatus(id: string) {
    const platform = await prisma.marketingPlatform.findUnique({
      where: { id }
    });

    if (!platform) {
      throw new Error('Platform not found');
    }

    return await prisma.marketingPlatform.update({
      where: { id },
      data: {
        isActive: !platform.isActive
      }
    });
  }
};
