import { prisma } from '../config/db.js';

export const smsSettingsRepository = {
  /**
   * Get user's SMS settings
   */
  async getUserSmsSettings(userId: string) {
    return await prisma.userSmsSettings.findUnique({
      where: { userId },
    });
  },

  /**
   * Create or update user's SMS settings
   */
  async upsertUserSmsSettings(userId: string, data: {
    phoneNumber?: string;
    displayName?: string;
    active?: boolean;
  }) {
    return await prisma.userSmsSettings.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...data,
      },
    });
  },

  /**
   * Delete user's SMS settings
   */
  async deleteUserSmsSettings(userId: string) {
    return await prisma.userSmsSettings.delete({
      where: { userId },
    });
  },

  /**
   * Get all active SMS settings (for admin purposes)
   */
  async getAllActiveSmsSettings() {
    return await prisma.userSmsSettings.findMany({
      where: { active: true },
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

  /**
   * Find SMS settings by phone number
   */
  async findByPhoneNumber(phoneNumber: string) {
    return await prisma.userSmsSettings.findFirst({
      where: { 
        phoneNumber,
        active: true,
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
};
