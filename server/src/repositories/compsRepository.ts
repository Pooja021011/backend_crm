import { prisma } from '../config/db.js';

export const compsRepository = {
  search: async (filters: { city?: string; zip?: string; beds?: number; baths?: number; sqftMin?: number; sqftMax?: number; from?: Date; to?: Date }) => {
    return prisma.comparable.findMany({
      where: {
        ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {}),
        ...(filters.zip ? { zip: filters.zip } : {}),
        ...(filters.beds ? { beds: { gte: filters.beds } } : {}),
        ...(filters.baths ? { baths: { gte: filters.baths } } : {}),
        ...(filters.sqftMin || filters.sqftMax ? { sqft: { gte: filters.sqftMin || undefined, lte: filters.sqftMax || undefined } } : {}),
        ...(filters.from || filters.to ? { dateSold: { gte: filters.from || undefined, lte: filters.to || undefined } } : {}),
      },
      orderBy: { dateSold: 'desc' },
      take: 50,
    });
  }
};

