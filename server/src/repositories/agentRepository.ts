import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const agentRepository = {
  // List all active users with their roles (used for task assignment, mentions, etc.)
  listAgents: async () => {
    return prisma.user.findMany({
      where: {
        status: 'active',
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

        // Create UserSmsSettings with phone number as Twilio number
        if (agent.phone) {
          await tx.userSmsSettings.create({
            data: {
              userId: agent.id,
              phoneNumber: agent.phone,
              active: true
            }
          });
        }

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

      // Update or create UserSmsSettings if phone number is provided
      if (data.phone !== undefined) {
        if (data.phone) {
          // Update or create SMS settings with phone as Twilio number
          await tx.userSmsSettings.upsert({
            where: { userId: id },
            update: { phoneNumber: data.phone },
            create: {
              userId: id,
              phoneNumber: data.phone,
              active: true
            }
          });
        } else {
          // If phone is removed, remove from SMS settings too
          await tx.userSmsSettings.updateMany({
            where: { userId: id },
            data: { phoneNumber: null }
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

  // Reassign all leads (and their open tasks) from one agent to another
  reassignLeads: async (fromAgentId: string, toAgentId: string) => {
    await prisma.lead.updateMany({
      where: { assignedUserId: fromAgentId },
      data: { assignedUserId: toAgentId },
    });
    // Reassign OPEN tasks on those leads: either assigned to old agent or unassigned
    await prisma.task.updateMany({
      where: {
        status: 'OPEN',
        lead: { assignedUserId: toAgentId },
        OR: [{ assignedToId: fromAgentId }, { assignedToId: null }],
      },
      data: { assignedToId: toAgentId },
    });
  },
};
