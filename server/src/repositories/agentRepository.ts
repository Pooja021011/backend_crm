import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const agentRepository = {
  // List all users with their roles (used for task assignment, reassign dropdown, etc.)
  listAgents: async () => {
    return prisma.user.findMany({
      where: {},
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

  // Reassign all leads and all their tasks to another agent
  reassignLeads: async (fromAgentId: string, toAgentId: string) => {
    await prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: { assignedUserId: fromAgentId },
        data: { assignedUserId: toAgentId },
      });
      // Reassign all tasks on those leads to the new agent so they have full ownership
      await tx.task.updateMany({
        where: { lead: { assignedUserId: toAgentId } },
        data: { assignedToId: toAgentId },
      });
    });
  },

  // Delete agent
  deleteAgent: async (id: string, options?: { reassignToAgentId?: string | null }) => {
    const hasAssignedLeads = await prisma.lead.count({
      where: { assignedUserId: id },
    });
    if (hasAssignedLeads && options?.reassignToAgentId === undefined) {
      throw new Error('Cannot delete agent who has assigned leads. Please reassign leads first.');
    }
    if (typeof options?.reassignToAgentId === 'string') {
      await agentRepository.reassignLeads(id, options.reassignToAgentId);
    }
    // Clear all references to this user so delete can succeed (reassign null = unassign, or no leads)
    await prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: { assignedUserId: id },
        data: { assignedUserId: null },
      });
      await tx.lead.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });
      await tx.lead.updateMany({
        where: { dispAgentId: id },
        data: { dispAgentId: null },
      });
      await tx.task.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      });
      await tx.task.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });
      await tx.auditLog.updateMany({
        where: { changedById: id },
        data: { changedById: null },
      });
      await tx.file.updateMany({
        where: { uploadedById: id },
        data: { uploadedById: null },
      });
      await tx.fileVersion.updateMany({
        where: { uploadedById: id },
        data: { uploadedById: null },
      });
      await tx.priceHistory.updateMany({
        where: { changedById: id },
        data: { changedById: null },
      });
      await tx.underwritingCalculation.updateMany({
        where: { calculatedBy: id },
        data: { calculatedBy: null },
      });
      await tx.communication.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });
      await tx.marketingLink.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });
      await tx.underwritingScenario.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });
      await tx.notification.updateMany({
        where: { targetUserId: id },
        data: { targetUserId: null },
      });
      await tx.notification.updateMany({
        where: { triggeredBy: id },
        data: { triggeredBy: null },
      });
      await tx.userEmailSettings.deleteMany({ where: { userId: id } });
      await tx.userSmsSettings.deleteMany({ where: { userId: id } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
    return true;
  },

  // Check if agent has assigned leads
  hasAssignedLeads: async (id: string) => {
    const count = await prisma.lead.count({
      where: { assignedUserId: id }
    });
    return count > 0;
  },
};
