import { prisma } from '../config/db.js';

export const tokenRepository = {
  async create(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  },
  async revokeByTokenHash(tokenHash: string) {
    return prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
  },
  async revokeUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  },
  async findValid(tokenHash: string) {
    return prisma.refreshToken.findFirst({ where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } } });
  },
};

