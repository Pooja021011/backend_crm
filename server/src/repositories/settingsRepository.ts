import { prisma } from '../config/db.js';

export const settingsRepository = {
  // Markets
  listMarkets: () => prisma.market.findMany({ orderBy: { name: 'asc' } }),
  createMarket: (name: string) => prisma.market.create({ data: { name } }),
  updateMarket: (id: string, name: string) => prisma.market.update({ where: { id }, data: { name } }),
  deleteMarket: (id: string) => prisma.market.delete({ where: { id } }),

  // Counties
  listCounties: (marketId?: string) => prisma.county.findMany({ where: marketId ? { marketId } : undefined, orderBy: { name: 'asc' } }),
  createCounty: (marketId: string, name: string) => prisma.county.create({ data: { marketId, name } }),
  updateCounty: (id: string, name: string, marketId?: string) => prisma.county.update({ where: { id }, data: { name, ...(marketId ? { marketId } : {}) } }),
  deleteCounty: (id: string) => prisma.county.delete({ where: { id } }),

  // Lead Sources
  listLeadSources: () => prisma.leadSource.findMany({ orderBy: { name: 'asc' } }),
  createLeadSource: (name: string, active = true) => prisma.leadSource.create({ data: { name, active } }),
  updateLeadSource: (id: string, name?: string, active?: boolean) => prisma.leadSource.update({ where: { id }, data: { ...(name ? { name } : {}), ...(active === undefined ? {} : { active }) } }),
  deleteLeadSource: (id: string) => prisma.leadSource.delete({ where: { id } }),

  // Asset Classes
  listAssetClasses: () => prisma.assetClass.findMany({ orderBy: { name: 'asc' } }),
  createAssetClass: (name: string, active = true) => prisma.assetClass.create({ data: { name, active } }),
  updateAssetClass: (id: string, name?: string, active?: boolean) => prisma.assetClass.update({ where: { id }, data: { ...(name ? { name } : {}), ...(active === undefined ? {} : { active }) } }),
  deleteAssetClass: (id: string) => prisma.assetClass.delete({ where: { id } }),

  // Price Ranges
  listPriceRanges: () => prisma.priceRange.findMany({ orderBy: { min: 'asc' } }),
  createPriceRange: (label: string, min?: number, max?: number) => prisma.priceRange.create({ data: { label, min, max } }),
  updatePriceRange: (id: string, label?: string, min?: number, max?: number) => prisma.priceRange.update({ where: { id }, data: { ...(label ? { label } : {}), min, max } }),
  deletePriceRange: (id: string) => prisma.priceRange.delete({ where: { id } }),

  // Doc Categories
  listDocCategories: () => prisma.docCategory.findMany({ orderBy: { name: 'asc' } }),
  createDocCategory: (name: string) => prisma.docCategory.create({ data: { name } }),
  updateDocCategory: (id: string, name: string) => prisma.docCategory.update({ where: { id }, data: { name } }),
  deleteDocCategory: (id: string) => prisma.docCategory.delete({ where: { id } }),

  // App Settings
  getAppSettings: () => prisma.appSetting.findUnique({ where: { id: 'global' } }),
  setAppSettings: (data: any) => prisma.appSetting.upsert({ where: { id: 'global' }, update: { data }, create: { id: 'global', data } }),

  // Per-user Email Settings
  getUserEmailSettings: async (userId: string) => {
    try {
      console.log('🔍 Debug - prisma client:', typeof prisma, !!prisma);
      console.log('🔍 Debug - prisma.userEmailSettings:', typeof prisma?.userEmailSettings, !!prisma?.userEmailSettings);
      console.log('🔍 Debug - userId:', userId);
      
      if (!prisma) {
        throw new Error('Database client not initialized');
      }
      
      if (!prisma.userEmailSettings) {
        throw new Error('UserEmailSettings model not available on prisma client');
      }
      
      const result = await prisma.userEmailSettings.findUnique({ where: { userId } });
      console.log('🔍 Debug - query result:', !!result);
      return result;
    } catch (error: any) {
      console.error('❌ Error fetching user email settings:', error);
      console.error('❌ Stack trace:', error.stack);
      throw new Error(`Database error: ${error.message}`);
    }
  },
  upsertUserEmailSettings: (userId: string, data: {
    email?: string;
    provider?: string;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpSecure?: boolean | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    imapHost?: string | null;
    imapPort?: number | null;
    imapSecure?: boolean | null;
    imapUser?: string | null;
    imapPass?: string | null;
    gmailConnected?: boolean;
    gmailTokens?: any;
    syncEnabled?: boolean;
  }) =>
    prisma.userEmailSettings.upsert({
      where: { userId },
      update: { ...data },
      create: { userId, email: data.email ?? '', provider: data.provider ?? 'SMTP',
        smtpHost: data.smtpHost ?? null,
        smtpPort: data.smtpPort ?? null,
        smtpSecure: data.smtpSecure ?? null,
        smtpUser: data.smtpUser ?? null,
        smtpPass: data.smtpPass ?? null,
        imapHost: data.imapHost ?? null,
        imapPort: data.imapPort ?? null,
        imapSecure: data.imapSecure ?? null,
        imapUser: data.imapUser ?? null,
        imapPass: data.imapPass ?? null,
        gmailConnected: data.gmailConnected ?? false,
        gmailTokens: data.gmailTokens ?? undefined,
        syncEnabled: data.syncEnabled ?? false,
      },
    }),

  // Pipelines
  listPipelines: () => prisma.pipelineDefinition.findMany({ where: { active: true }, include: { stages: { include: { rolePermissions: true }, orderBy: { orderIndex: 'asc' } } }, orderBy: { key: 'asc' } }),
  findPipelineByKey: (key: string) => prisma.pipelineDefinition.findUnique({ where: { key: key as any }, include: { stages: { orderBy: { orderIndex: 'asc' } } } }),
  createStage: async (pipelineId: string, name: string, orderIndex: number, color?: string) => {
    // Get the pipeline to determine which role permission to assign
    const pipeline = await prisma.pipelineDefinition.findUnique({
      where: { id: pipelineId },
      select: { key: true }
    });

    // Map pipeline to role
    const pipelineRoleMap: Record<string, string> = {
      'ACQUISITIONS': 'ACQ',
      'DISPOSITIONS': 'DISP',
      'TRANSACTION': 'TC'
    };

    const roleName = pipeline ? pipelineRoleMap[pipeline.key] : undefined;

    // Create stage with automatic role permission
    const stage = await prisma.pipelineStage.create({ 
      data: { 
        pipelineId, 
        name, 
        orderIndex, 
        color,
        // Automatically add role permission based on pipeline
        rolePermissions: roleName ? {
          create: {
            roleName: roleName as any
          }
        } : undefined
      },
      include: {
        rolePermissions: true
      }
    });

    return stage;
  },
  updateStage: (id: string, data: { name?: string; orderIndex?: number; color?: string }) => prisma.pipelineStage.update({ where: { id }, data }),
  deleteStage: (id: string) => prisma.pipelineStage.delete({ where: { id } }),
  reorderStages: async (pipelineId: string, items: { id: string; orderIndex: number }[]) => {
    return prisma.$transaction(items.map(i => prisma.pipelineStage.update({ where: { id: i.id }, data: { orderIndex: i.orderIndex } })));
  }
};

