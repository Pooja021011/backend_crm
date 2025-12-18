import { PrismaClient, LeadComparable } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateComparableData {
  leadId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  salePrice?: number;
  pricePerSqft?: number;
  dom?: number; // Days on Market
  dateSold?: Date;
  images?: string[];
}

export interface ComparableSearchFilters {
  city?: string;
  state?: string;
  zip?: string;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minPrice?: number;
  maxPrice?: number;
  soldAfter?: Date;
  soldBefore?: Date;
}

export const compsRepository = {
  async getComparablesByLeadId(leadId: string): Promise<LeadComparable[]> {
    return prisma.leadComparable.findMany({
      where: { leadId },
      orderBy: {
        addedAt: 'desc'
      }
    });
  },

  async searchComparables(filters: ComparableSearchFilters, limit: number = 50): Promise<LeadComparable[]> {
    const where: any = {};

    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.state) where.state = filters.state;
    if (filters.zip) where.zip = filters.zip;
    
    if (filters.minBeds !== undefined || filters.maxBeds !== undefined) {
      where.beds = {};
      if (filters.minBeds !== undefined) where.beds.gte = filters.minBeds;
      if (filters.maxBeds !== undefined) where.beds.lte = filters.maxBeds;
    }

    if (filters.minBaths !== undefined || filters.maxBaths !== undefined) {
      where.baths = {};
      if (filters.minBaths !== undefined) where.baths.gte = filters.minBaths;
      if (filters.maxBaths !== undefined) where.baths.lte = filters.maxBaths;
    }

    if (filters.minSqft !== undefined || filters.maxSqft !== undefined) {
      where.sqft = {};
      if (filters.minSqft !== undefined) where.sqft.gte = filters.minSqft;
      if (filters.maxSqft !== undefined) where.sqft.lte = filters.maxSqft;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.salePrice = {};
      if (filters.minPrice !== undefined) where.salePrice.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.salePrice.lte = filters.maxPrice;
    }

    if (filters.soldAfter || filters.soldBefore) {
      where.dateSold = {};
      if (filters.soldAfter) where.dateSold.gte = filters.soldAfter;
      if (filters.soldBefore) where.dateSold.lte = filters.soldBefore;
    }

    return prisma.leadComparable.findMany({
      where,
      orderBy: {
        dateSold: 'desc'
      },
      take: limit
    });
  },

  async createComparable(data: CreateComparableData): Promise<LeadComparable> {
    // Calculate price per sqft if not provided
    const pricePerSqft = data.pricePerSqft || 
      (data.salePrice && data.sqft && data.sqft > 0 ? Math.round(data.salePrice / data.sqft) : undefined);

    return prisma.leadComparable.create({
      data: {
        leadId: data.leadId,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        beds: data.beds,
        baths: data.baths,
        sqft: data.sqft,
        yearBuilt: data.yearBuilt,
        salePrice: data.salePrice,
        pricePerSqft,
        dom: data.dom,
        dateSold: data.dateSold,
        images: data.images || []
      }
    });
  },

  async getComparableById(id: string): Promise<LeadComparable | null> {
    return prisma.leadComparable.findUnique({
      where: { id }
    });
  },

  async updateComparable(id: string, data: Partial<CreateComparableData>): Promise<LeadComparable> {
    // Recalculate price per sqft if price or sqft changed
    const updates: any = { ...data };
    if ((data.salePrice !== undefined || data.sqft !== undefined) && !data.pricePerSqft) {
      const current = await prisma.leadComparable.findUnique({ where: { id } });
      if (current) {
        const newPrice = data.salePrice !== undefined ? data.salePrice : current.salePrice;
        const newSqft = data.sqft !== undefined ? data.sqft : current.sqft;
        if (newPrice && newSqft && newSqft > 0) {
          updates.pricePerSqft = Math.round(newPrice / newSqft);
        }
      }
    }

    return prisma.leadComparable.update({
      where: { id },
      data: updates
    });
  },

  async deleteComparable(id: string): Promise<void> {
    await prisma.leadComparable.delete({
      where: { id }
    });
  }
};