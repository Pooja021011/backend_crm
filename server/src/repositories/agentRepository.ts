import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const agentRepository = {
  // List all agents with their roles (excluding admin-only users)
  listAgents: async () => {
    return prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: {
                in: ['ACQ', 'DISP', 'MANAGER', 'TC']
              }
            }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            assignedLeads: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
  },

  // Get single agent by ID
  getAgent: async (id: string) => {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            assignedLeads: true
          }
        }
      }
    });
  },

  // Find agent by email
  findByEmail: async (email: string) => {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true
      }
    });
  },

  // Create new agent with roles
  createAgent: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
    passwordHash: string;
    roles: string[];
  }) => {
    return prisma.$transaction(async (tx) => {
      // Create the user
      const agent = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          status: data.status,
          passwordHash: data.passwordHash
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Add roles if provided
      if (data.roles && data.roles.length > 0) {
        // Get role IDs
        const roles = await tx.role.findMany({
          where: {
            name: { in: data.roles }
          },
          select: { id: true, name: true }
        });

        // Create user-role associations
        await tx.userRole.createMany({
          data: roles.map(role => ({
            userId: agent.id,
            roleId: role.id
          }))
        });

        // Fetch the complete agent data with roles
        return tx.user.findUnique({
          where: { id: agent.id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            passwordHash: true,
            createdAt: true,
            updatedAt: true,
            roles: {
              select: {
                role: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });
      }

      return agent;
    });
  },

  // Update agent
  updateAgent: async (id: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    status?: string;
    passwordHash?: string;
    roles?: string[];
  }) => {
    return prisma.$transaction(async (tx) => {
      // Update user data
      const updateData: any = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;

      const agent = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Update roles if provided
      if (data.roles !== undefined) {
        // Remove existing roles
        await tx.userRole.deleteMany({
          where: { userId: id }
        });

        // Add new roles if any
        if (data.roles.length > 0) {
          const roles = await tx.role.findMany({
            where: {
              name: { in: data.roles }
            },
            select: { id: true }
          });

          await tx.userRole.createMany({
            data: roles.map(role => ({
              userId: id,
              roleId: role.id
            }))
          });
        }
      }

      // Return complete agent data with roles
      return tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });
    });
  },

  // Delete agent
  deleteAgent: async (id: string) => {
    return prisma.$transaction(async (tx) => {
      // Remove user roles first
      await tx.userRole.deleteMany({
        where: { userId: id }
      });

      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId: id }
      });

      // Delete the user
      await tx.user.delete({
        where: { id }
      });

      return true;
    });
  },

  // Check if agent has assigned leads
  hasAssignedLeads: async (id: string) => {
    const count = await prisma.lead.count({
      where: { assignedUserId: id }
    });
    return count > 0;
  },
};
