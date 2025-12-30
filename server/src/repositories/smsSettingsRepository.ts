import { prisma } from '../config/db.js';

function normalizeToE164(input?: string): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Keep leading + if present, otherwise strip to digits and rebuild.
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // If already looks like E.164 with + and 10-15 digits, normalize separators only.
  if (trimmed.startsWith('+') && /^\+\d{10,15}$/.test(`+${digits}`)) {
    return `+${digits}`;
  }

  // Heuristic: US numbers
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  // Fallback: treat as E.164 digits
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

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
    const normalized = data.phoneNumber ? normalizeToE164(data.phoneNumber) : null;
    return await prisma.userSmsSettings.upsert({
      where: { userId },
      update: {
        ...data,
        ...(data.phoneNumber ? { phoneNumber: normalized || data.phoneNumber } : {}),
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...data,
        ...(data.phoneNumber ? { phoneNumber: normalized || data.phoneNumber } : {}),
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
    const normalized = normalizeToE164(phoneNumber);
    const rawDigits = phoneNumber?.replace(/\D/g, '');
    return await prisma.userSmsSettings.findFirst({
      where: { 
        active: true,
        OR: [
          { phoneNumber },
          ...(normalized ? [{ phoneNumber: normalized }] : []),
          ...(rawDigits ? [{ phoneNumber: rawDigits }, { phoneNumber: `+${rawDigits}` }] : []),
        ],
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
