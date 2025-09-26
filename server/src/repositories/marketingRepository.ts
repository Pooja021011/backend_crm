import { PrismaClient, MarketingResource } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateMarketingResourceData {
  leadId: string;
  title: string;
  type: string; // flyer, photo, video, listing_link, campaign_link
  url?: string; // for external links
  fileId?: string; // for uploaded files
  description?: string;
  isActive?: boolean;
}

export interface UpdateMarketingResourceData {
  title?: string;
  type?: string;
  url?: string;
  fileId?: string;
  description?: string;
  isActive?: boolean;
}

export const marketingRepository = {
  async getResourcesByLeadId(leadId: string): Promise<(MarketingResource & { file?: any })[]> {
    return prisma.marketingResource.findMany({
      where: { leadId },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            storageKey: true,
            description: true,
            tags: true,
            isPublic: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { type: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  },

  async getResourcesByType(leadId: string, type: string): Promise<MarketingResource[]> {
    return prisma.marketingResource.findMany({
      where: { 
        leadId,
        type,
        isActive: true
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            storageKey: true,
            isPublic: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  async getResourceById(id: string): Promise<(MarketingResource & { file?: any }) | null> {
    return prisma.marketingResource.findUnique({
      where: { id },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            storageKey: true,
            description: true,
            tags: true,
            isPublic: true
          }
        }
      }
    });
  },

  async createResource(data: CreateMarketingResourceData): Promise<MarketingResource> {
    return prisma.marketingResource.create({
      data: {
        leadId: data.leadId,
        title: data.title,
        type: data.type,
        url: data.url,
        fileId: data.fileId,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  },

  async updateResource(id: string, data: UpdateMarketingResourceData): Promise<MarketingResource> {
    return prisma.marketingResource.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        url: data.url,
        fileId: data.fileId,
        description: data.description,
        isActive: data.isActive
      }
    });
  },

  async deleteResource(id: string): Promise<void> {
    await prisma.marketingResource.delete({
      where: { id }
    });
  },

  async toggleResourceStatus(id: string): Promise<MarketingResource> {
    const resource = await prisma.marketingResource.findUnique({ where: { id } });
    if (!resource) {
      throw new Error('Resource not found');
    }

    return prisma.marketingResource.update({
      where: { id },
      data: {
        isActive: !resource.isActive
      }
    });
  },

  async getResourceStats(leadId: string): Promise<{
    totalResources: number;
    activeResources: number;
    resourcesByType: { type: string; count: number }[];
  }> {
    const resources = await prisma.marketingResource.findMany({
      where: { leadId },
      select: {
        type: true,
        isActive: true
      }
    });

    const totalResources = resources.length;
    const activeResources = resources.filter(r => r.isActive).length;

    // Group by type
    const typeGroups = resources.reduce((acc: { [key: string]: number }, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + 1;
      return acc;
    }, {});

    const resourcesByType = Object.entries(typeGroups).map(([type, count]) => ({
      type,
      count
    }));

    return {
      totalResources,
      activeResources,
      resourcesByType
    };
  }
};