import { marketingPlatformRepository, type CreateMarketingPlatformData, type UpdateMarketingPlatformData } from '../repositories/marketingPlatformRepository.js';

export const marketingPlatformService = {
  async createPlatform(data: CreateMarketingPlatformData) {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Platform name is required');
    }

    if (!data.baseUrl?.trim()) {
      throw new Error('Base URL is required');
    }

    // Validate URL format
    try {
      new URL(data.baseUrl);
    } catch {
      throw new Error('Invalid base URL format');
    }

    return await marketingPlatformRepository.create(data);
  },

  async getPlatformById(id: string) {
    const platform = await marketingPlatformRepository.findById(id);
    
    if (!platform) {
      throw new Error('Marketing platform not found');
    }

    return platform;
  },

  async getAllPlatforms(filters: { type?: string; isActive?: boolean } = {}) {
    return await marketingPlatformRepository.findAll(filters);
  },

  async updatePlatform(id: string, data: UpdateMarketingPlatformData) {
    // Validate URL if provided
    if (data.baseUrl) {
      try {
        new URL(data.baseUrl);
      } catch {
        throw new Error('Invalid base URL format');
      }
    }

    return await marketingPlatformRepository.update(id, data);
  },

  async deletePlatform(id: string) {
    // Check if platform exists
    await this.getPlatformById(id);
    
    return await marketingPlatformRepository.delete(id);
  },

  async getPlatformsByType(type: string, activeOnly: boolean = true) {
    return await marketingPlatformRepository.getByType(type, activeOnly);
  },

  async togglePlatformStatus(id: string) {
    return await marketingPlatformRepository.toggleStatus(id);
  },

  async getActivePlatforms() {
    return await marketingPlatformRepository.findAll({ isActive: true });
  },

  // Predefined platform templates
  getDefaultPlatforms() {
    return [
      {
        name: 'MLS Listings',
        type: 'listing',
        baseUrl: 'https://mls.example.com',
        description: 'Multiple Listing Service integration',
        authRequired: true,
        configFields: [
          { name: 'mls_id', type: 'text', required: true },
          { name: 'api_key', type: 'password', required: true },
          { name: 'region', type: 'select', required: true, options: ['North', 'South', 'East', 'West'] }
        ]
      },
      {
        name: 'Facebook Marketing',
        type: 'social',
        baseUrl: 'https://facebook.com',
        description: 'Facebook advertising and social media marketing',
        authRequired: true,
        configFields: [
          { name: 'page_id', type: 'text', required: true },
          { name: 'access_token', type: 'password', required: true }
        ]
      },
      {
        name: 'Google Ads',
        type: 'advertising',
        baseUrl: 'https://ads.google.com',
        description: 'Google Ads campaign management',
        authRequired: true,
        configFields: [
          { name: 'customer_id', type: 'text', required: true },
          { name: 'api_key', type: 'password', required: true }
        ]
      },
      {
        name: 'Mailchimp',
        type: 'email',
        baseUrl: 'https://mailchimp.com',
        description: 'Email marketing campaigns',
        authRequired: true,
        configFields: [
          { name: 'api_key', type: 'password', required: true },
          { name: 'list_id', type: 'text', required: true }
        ]
      }
    ];
  }
};
