import { prisma } from '../config/db.js';
import type { RoleName } from '@prisma/client';

export const roleRepository = {
  async findByName(name: RoleName) {
    return prisma.role.findUnique({ where: { name } });
  },
  async list() {
    return prisma.role.findMany();
  },
};

