import { prisma } from '../config/db.js';

export interface LeadDistributionData {
  userId: string;
  receiveLeads: boolean;
  distributionPercentage: number;
  isActive: boolean;
}

export const leadDistributionRepository = {
  // Get all distribution settings (for admin view)
  async getAllDistributionSettings() {
    return prisma.leadDistributionSettings.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            roles: {
              select: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });
  },

  // Get distribution settings for specific user
  async getDistributionSettingsByUserId(userId: string) {
    return prisma.leadDistributionSettings.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
    });
  },

  // Create or update distribution settings
  async upsertDistributionSettings(data: LeadDistributionData) {
    return prisma.leadDistributionSettings.upsert({
      where: { userId: data.userId },
      update: {
        receiveLeads: data.receiveLeads,
        distributionPercentage: data.distributionPercentage,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        receiveLeads: data.receiveLeads,
        distributionPercentage: data.distributionPercentage,
        isActive: data.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  },

  // Batch update distribution settings
  async batchUpdateDistributionSettings(dataArray: LeadDistributionData[]) {
    const updates = dataArray.map((data) =>
      prisma.leadDistributionSettings.upsert({
        where: { userId: data.userId },
        update: {
          receiveLeads: data.receiveLeads,
          distributionPercentage: data.distributionPercentage,
          isActive: data.isActive,
          updatedAt: new Date(),
        },
        create: {
          userId: data.userId,
          receiveLeads: data.receiveLeads,
          distributionPercentage: data.distributionPercentage,
          isActive: data.isActive,
        },
      })
    );

    return prisma.$transaction(updates);
  },

  // Get all ACQ agents (acquisitions agents)
  async getAcquisitionsAgents() {
    return prisma.user.findMany({
      where: {
        status: 'active',
        roles: {
          some: {
            role: {
              name: 'ACQ',
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        leadDistributionSettings: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  },

  // Delete distribution settings for a user
  async deleteDistributionSettings(userId: string) {
    return prisma.leadDistributionSettings.delete({
      where: { userId },
    });
  },
};
