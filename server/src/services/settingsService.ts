import { settingsRepository } from '../repositories/settingsRepository.js';

export const settingsService = {
  // Catalogs
  listMarkets: () => settingsRepository.listMarkets(),
  createMarket: (name: string) => settingsRepository.createMarket(name),
  updateMarket: (id: string, name: string) => settingsRepository.updateMarket(id, name),
  deleteMarket: (id: string) => settingsRepository.deleteMarket(id),

  listCounties: (marketId?: string) => settingsRepository.listCounties(marketId),
  createCounty: (marketId: string, name: string) => settingsRepository.createCounty(marketId, name),
  updateCounty: (id: string, name: string, marketId?: string) => settingsRepository.updateCounty(id, name, marketId),
  deleteCounty: (id: string) => settingsRepository.deleteCounty(id),

  listLeadSources: () => settingsRepository.listLeadSources(),
  createLeadSource: (name: string, active = true) => settingsRepository.createLeadSource(name, active),
  updateLeadSource: (id: string, name?: string, active?: boolean) => settingsRepository.updateLeadSource(id, name, active),
  deleteLeadSource: (id: string) => settingsRepository.deleteLeadSource(id),

  listAssetClasses: () => settingsRepository.listAssetClasses(),
  createAssetClass: (name: string, active = true) => settingsRepository.createAssetClass(name, active),
  updateAssetClass: (id: string, name?: string, active?: boolean) => settingsRepository.updateAssetClass(id, name, active),
  deleteAssetClass: (id: string) => settingsRepository.deleteAssetClass(id),

  listPriceRanges: () => settingsRepository.listPriceRanges(),
  createPriceRange: (label: string, min?: number, max?: number) => settingsRepository.createPriceRange(label, min, max),
  updatePriceRange: (id: string, label?: string, min?: number, max?: number) => settingsRepository.updatePriceRange(id, label, min, max),
  deletePriceRange: (id: string) => settingsRepository.deletePriceRange(id),

  listDocCategories: () => settingsRepository.listDocCategories(),
  createDocCategory: (name: string) => settingsRepository.createDocCategory(name),
  updateDocCategory: (id: string, name: string) => settingsRepository.updateDocCategory(id, name),
  deleteDocCategory: (id: string) => settingsRepository.deleteDocCategory(id),

  getAppSettings: () => settingsRepository.getAppSettings(),
  setAppSettings: (data: any) => settingsRepository.setAppSettings(data),

  // Pipelines
  listPipelines: () => settingsRepository.listPipelines(),
  createStage: (pipelineId: string, name: string, orderIndex: number, color?: string) => settingsRepository.createStage(pipelineId, name, orderIndex, color),
  updateStage: (id: string, data: { name?: string; orderIndex?: number; color?: string }) => settingsRepository.updateStage(id, data),
  deleteStage: (id: string) => settingsRepository.deleteStage(id),
  reorderStages: (pipelineId: string, items: { id: string; orderIndex: number }[]) => settingsRepository.reorderStages(pipelineId, items),
};

