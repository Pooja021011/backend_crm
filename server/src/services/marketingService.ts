import { marketingRepository, CreateMarketingResourceData, UpdateMarketingResourceData } from '../repositories/marketingRepository';
import { MarketingResource } from '@prisma/client';

export interface MarketingCampaignData {
  leadId: string;
  campaignName: string;
  resources: CreateMarketingResourceData[];
}

export const marketingService = {
  async getResourcesByLeadId(leadId: string): Promise<(MarketingResource & { file?: any })[]> {
    return marketingRepository.getResourcesByLeadId(leadId);
  },

  async getResourcesByType(leadId: string, type: string): Promise<MarketingResource[]> {
    return marketingRepository.getResourcesByType(leadId, type);
  },

  async getResourceById(id: string): Promise<(MarketingResource & { file?: any }) | null> {
    return marketingRepository.getResourceById(id);
  },

  async createResource(data: CreateMarketingResourceData): Promise<MarketingResource> {
    this.validateResourceData(data);
    return marketingRepository.createResource(data);
  },

  async updateResource(id: string, data: UpdateMarketingResourceData): Promise<MarketingResource> {
    if (Object.keys(data).length > 0) {
      this.validateResourceData(data as CreateMarketingResourceData);
    }
    return marketingRepository.updateResource(id, data);
  },

  async deleteResource(id: string): Promise<void> {
    return marketingRepository.deleteResource(id);
  },

  async toggleResourceStatus(id: string): Promise<MarketingResource> {
    return marketingRepository.toggleResourceStatus(id);
  },

  async getResourceStats(leadId: string) {
    return marketingRepository.getResourceStats(leadId);
  },

  async createMarketingCampaign(data: MarketingCampaignData): Promise<MarketingResource[]> {
    const resources: MarketingResource[] = [];

    for (const resourceData of data.resources) {
      // Add campaign name to the title if not already included
      const title = resourceData.title.includes(data.campaignName) 
        ? resourceData.title 
        : `${data.campaignName} - ${resourceData.title}`;

      const resource = await this.createResource({
        ...resourceData,
        title,
        description: resourceData.description || `Part of ${data.campaignName} campaign`
      });

      resources.push(resource);
    }

    return resources;
  },

  async duplicateResourcesForLead(sourceLeadId: string, targetLeadId: string): Promise<MarketingResource[]> {
    const sourceResources = await marketingRepository.getResourcesByLeadId(sourceLeadId);
    const duplicatedResources: MarketingResource[] = [];

    for (const resource of sourceResources) {
      if (resource.isActive) {
        const duplicateData: CreateMarketingResourceData = {
          leadId: targetLeadId,
          title: `${resource.title} (Copy)`,
          type: resource.type,
          url: resource.url || undefined,
          fileId: resource.fileId || undefined,
          description: resource.description || undefined,
          isActive: true
        };

        const duplicated = await marketingRepository.createResource(duplicateData);
        duplicatedResources.push(duplicated);
      }
    }

    return duplicatedResources;
  },

  async getMarketingOverview(leadId: string): Promise<{
    stats: any;
    recentResources: MarketingResource[];
    resourcesByType: { [key: string]: MarketingResource[] };
  }> {
    const [stats, allResources] = await Promise.all([
      marketingRepository.getResourceStats(leadId),
      marketingRepository.getResourcesByLeadId(leadId)
    ]);

    // Get recent resources (last 5)
    const recentResources = allResources
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Group by type
    const resourcesByType: { [key: string]: MarketingResource[] } = {};
    allResources.forEach(resource => {
      if (!resourcesByType[resource.type]) {
        resourcesByType[resource.type] = [];
      }
      resourcesByType[resource.type].push(resource);
    });

    return {
      stats,
      recentResources,
      resourcesByType
    };
  },

  async generatePublicLinks(leadId: string): Promise<{ [resourceId: string]: string }> {
    const resources = await marketingRepository.getResourcesByLeadId(leadId);
    const publicLinks: { [resourceId: string]: string } = {};

    for (const resource of resources) {
      if (resource.url) {
        publicLinks[resource.id] = resource.url;
      } else if (resource.file?.isPublic) {
        // Generate public access URL for file
        publicLinks[resource.id] = `/api/v1/files/public/${resource.file.storageKey}`;
      }
    }

    return publicLinks;
  },

  validateResourceData(data: Partial<CreateMarketingResourceData>): void {
    if (data.title && data.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    if (data.type && !this.isValidResourceType(data.type)) {
      throw new Error('Invalid resource type');
    }

    if (data.url && data.fileId) {
      throw new Error('Resource cannot have both URL and file - choose one');
    }

    if (!data.url && !data.fileId) {
      throw new Error('Resource must have either URL or file');
    }

    if (data.url && !this.isValidUrl(data.url)) {
      throw new Error('Invalid URL format');
    }
  },

  isValidResourceType(type: string): boolean {
    const validTypes = ['flyer', 'photo', 'video', 'listing_link', 'campaign_link', 'brochure', 'virtual_tour', 'other'];
    return validTypes.includes(type);
  },

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};
