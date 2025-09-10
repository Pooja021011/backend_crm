import { prisma } from '../config/db.js';

export const userRepository = {
  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    status?: 'active' | 'disabled';
    roleNames: string[];
    createdBy?: string | null;
  }) {
    return prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash: data.passwordHash,
        status: (data.status || 'active') as any,
        roles: {
          create: data.roleNames.map((r) => ({
            role: { connect: { name: r as any } }
          }))
        },
        auditLogs: {
          create: {
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: 'self',
            diff: {}
          }
        }
      },
      include: { roles: { include: { role: true } } }
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { roles: { include: { role: true } } } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
  },

  async list(skip = 0, take = 20) {
    return prisma.user.findMany({ skip, take, orderBy: { createdAt: 'desc' }, include: { roles: { include: { role: true } } } });
  },

  async update(id: string, data: Partial<{ firstName: string; lastName: string; phone?: string; status: 'active' | 'disabled'; passwordHash: string; }>) {
    return prisma.user.update({ where: { id }, data });
  },

  async setRoles(id: string, roleNames: string[]) {
    // replace roles
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.user.update({
      where: { id },
      data: {
        roles: {
          create: roleNames.map((r) => ({ role: { connect: { name: r as any } } }))
        }
      }
    });
    return this.findById(id);
  }
};

