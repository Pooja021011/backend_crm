import { compsRepository, CreateComparableData, ComparableSearchFilters } from '../repositories/compsRepository';
import { Comparable, LeadComparable } from '@prisma/client';

export interface CompsAnalysis {
  averagePrice: number;
  medianPrice: number;
  pricePerSqftAverage: number;
  pricePerSqftMedian: number;
  averageDom: number;
  totalComps: number;
  priceRange: {
    min: number;
    max: number;
  };
  sqftRange: {
    min: number;
    max: number;
  };
}

export const compsService = {
  async getComparablesByLeadId(leadId: string): Promise<(LeadComparable & { comparable: Comparable })[]> {
    return compsRepository.getComparablesByLeadId(leadId);
  },

  async searchComparables(filters: ComparableSearchFilters, limit?: number): Promise<Comparable[]> {
    return compsRepository.searchComparables(filters, limit);
  },

  async createComparable(data: CreateComparableData): Promise<Comparable> {
    this.validateComparableData(data);
    return compsRepository.createComparable(data);
  },

  async addComparableToLead(leadId: string, comparableId: string): Promise<LeadComparable> {
    return compsRepository.addComparableToLead(leadId, comparableId);
  },

  async removeComparableFromLead(leadId: string, comparableId: string): Promise<void> {
    return compsRepository.removeComparableFromLead(leadId, comparableId);
  },

  async updateComparable(id: string, data: Partial<CreateComparableData>): Promise<Comparable> {
    if (Object.keys(data).length > 0) {
      this.validateComparableData(data);
    }
    return compsRepository.updateComparable(id, data);
  },

  async deleteComparable(id: string): Promise<void> {
    return compsRepository.deleteComparable(id);
  },

  async analyzeComps(leadId: string): Promise<CompsAnalysis> {
    const leadComps = await compsRepository.getComparablesByLeadId(leadId);
    const comparables = leadComps.map(lc => lc.comparable).filter(c => c.salePrice && c.salePrice > 0);

    if (comparables.length === 0) {
      throw new Error('No valid comparables found for analysis');
    }

    const prices = comparables.map(c => c.salePrice!);
    const pricesPerSqft = comparables
      .filter(c => c.pricePerSqft && c.pricePerSqft > 0)
      .map(c => c.pricePerSqft!);
    const doms = comparables
      .filter(c => c.dom !== null && c.dom !== undefined)
      .map(c => c.dom!);
    const sqfts = comparables
      .filter(c => c.sqft && c.sqft > 0)
      .map(c => c.sqft!);

    const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
    const medianPrice = this.calculateMedian(prices);
    
    const pricePerSqftAverage = pricesPerSqft.length > 0 
      ? Math.round(pricesPerSqft.reduce((sum, ppf) => sum + ppf, 0) / pricesPerSqft.length)
      : 0;
    const pricePerSqftMedian = pricesPerSqft.length > 0 ? this.calculateMedian(pricesPerSqft) : 0;

    const averageDom = doms.length > 0 
      ? Math.round(doms.reduce((sum, dom) => sum + dom, 0) / doms.length)
      : 0;

    return {
      averagePrice,
      medianPrice,
      pricePerSqftAverage,
      pricePerSqftMedian,
      averageDom,
      totalComps: comparables.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      sqftRange: sqfts.length > 0 ? {
        min: Math.min(...sqfts),
        max: Math.max(...sqfts)
      } : { min: 0, max: 0 }
    };
  },

  async autoFetchComps(leadId: string, searchRadius: number = 1): Promise<Comparable[]> {
    // TODO: Implement auto-fetch from external APIs (MLS, Zillow, etc.)
    // For now, this is a placeholder that would integrate with real estate data APIs
    throw new Error('Auto-fetch comparables not yet implemented - requires MLS/API integration');
  },

  async suggestComps(leadAddress: { city: string; state: string; zip?: string }, beds?: number, baths?: number, sqft?: number): Promise<Comparable[]> {
    const filters: ComparableSearchFilters = {
      city: leadAddress.city,
      state: leadAddress.state,
      zip: leadAddress.zip,
      soldAfter: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last 12 months
    };

    // Add bedroom/bathroom filters with some flexibility
    if (beds) {
      filters.minBeds = Math.max(1, beds - 1);
      filters.maxBeds = beds + 1;
    }
    if (baths) {
      filters.minBaths = Math.max(1, baths - 1);
      filters.maxBaths = baths + 1;
    }

    // Add sqft filter with 20% flexibility
    if (sqft && sqft > 0) {
      filters.minSqft = Math.round(sqft * 0.8);
      filters.maxSqft = Math.round(sqft * 1.2);
    }

    return compsRepository.searchComparables(filters, 20);
  },

  validateComparableData(data: Partial<CreateComparableData>): void {
    if (data.beds !== undefined && data.beds < 0) {
      throw new Error('Beds must be non-negative');
    }
    if (data.baths !== undefined && data.baths < 0) {
      throw new Error('Baths must be non-negative');
    }
    if (data.sqft !== undefined && data.sqft < 0) {
      throw new Error('Square footage must be non-negative');
    }
    if (data.salePrice !== undefined && data.salePrice < 0) {
      throw new Error('Sale price must be non-negative');
    }
    if (data.yearBuilt !== undefined && (data.yearBuilt < 1800 || data.yearBuilt > new Date().getFullYear())) {
      throw new Error('Year built must be reasonable');
    }
    if (data.dom !== undefined && data.dom < 0) {
      throw new Error('Days on market must be non-negative');
    }
  },

  calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    } else {
      return sorted[mid];
    }
  }
};
