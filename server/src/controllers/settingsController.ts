import type { Request, Response } from 'express';
import { settingsService } from '../services/settingsService.js';

export const settingsController = {
  // Markets
  listMarkets: async (_req: Request, res: Response) => res.json({ data: await settingsService.listMarkets() }),
  createMarket: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createMarket(req.body.name) }),
  updateMarket: async (req: Request, res: Response) => res.json({ data: await settingsService.updateMarket(req.params.id, req.body.name) }),
  deleteMarket: async (req: Request, res: Response) => { await settingsService.deleteMarket(req.params.id); res.json({ success: true }); },

  // Counties
  listCounties: async (req: Request, res: Response) => res.json({ data: await settingsService.listCounties(req.query.marketId as string|undefined) }),
  createCounty: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createCounty(req.body.marketId, req.body.name) }),
  updateCounty: async (req: Request, res: Response) => res.json({ data: await settingsService.updateCounty(req.params.id, req.body.name, req.body.marketId) }),
  deleteCounty: async (req: Request, res: Response) => { await settingsService.deleteCounty(req.params.id); res.json({ success: true }); },

  // Lead Sources
  listLeadSources: async (_req: Request, res: Response) => res.json({ data: await settingsService.listLeadSources() }),
  createLeadSource: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createLeadSource(req.body.name, req.body.active) }),
  updateLeadSource: async (req: Request, res: Response) => res.json({ data: await settingsService.updateLeadSource(req.params.id, req.body.name, req.body.active) }),
  deleteLeadSource: async (req: Request, res: Response) => { await settingsService.deleteLeadSource(req.params.id); res.json({ success: true }); },

  // Asset Classes
  listAssetClasses: async (_req: Request, res: Response) => res.json({ data: await settingsService.listAssetClasses() }),
  createAssetClass: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createAssetClass(req.body.name, req.body.active) }),
  updateAssetClass: async (req: Request, res: Response) => res.json({ data: await settingsService.updateAssetClass(req.params.id, req.body.name, req.body.active) }),
  deleteAssetClass: async (req: Request, res: Response) => { await settingsService.deleteAssetClass(req.params.id); res.json({ success: true }); },

  // Price Ranges
  listPriceRanges: async (_req: Request, res: Response) => res.json({ data: await settingsService.listPriceRanges() }),
  createPriceRange: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createPriceRange(req.body.label, req.body.min, req.body.max) }),
  updatePriceRange: async (req: Request, res: Response) => res.json({ data: await settingsService.updatePriceRange(req.params.id, req.body.label, req.body.min, req.body.max) }),
  deletePriceRange: async (req: Request, res: Response) => { await settingsService.deletePriceRange(req.params.id); res.json({ success: true }); },

  // Doc Categories
  listDocCategories: async (_req: Request, res: Response) => res.json({ data: await settingsService.listDocCategories() }),
  createDocCategory: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createDocCategory(req.body.name) }),
  updateDocCategory: async (req: Request, res: Response) => res.json({ data: await settingsService.updateDocCategory(req.params.id, req.body.name) }),
  deleteDocCategory: async (req: Request, res: Response) => { await settingsService.deleteDocCategory(req.params.id); res.json({ success: true }); },

  // App Settings
  getAppSettings: async (_req: Request, res: Response) => res.json({ data: await settingsService.getAppSettings() }),
  setAppSettings: async (req: Request, res: Response) => res.json({ data: await settingsService.setAppSettings(req.body) }),

  // Pipelines
  listPipelines: async (_req: Request, res: Response) => res.json({ data: await settingsService.listPipelines() }),
  createStage: async (req: Request, res: Response) => res.status(201).json({ data: await settingsService.createStage(req.params.pipelineId, req.body.name, req.body.orderIndex, req.body.color) }),
  updateStage: async (req: Request, res: Response) => res.json({ data: await settingsService.updateStage(req.params.stageId, { name: req.body.name, orderIndex: req.body.orderIndex, color: req.body.color }) }),
  deleteStage: async (req: Request, res: Response) => { await settingsService.deleteStage(req.params.stageId); res.json({ success: true }); },
  reorderStages: async (req: Request, res: Response) => res.json({ data: await settingsService.reorderStages(req.params.pipelineId, req.body.items) }),
};

