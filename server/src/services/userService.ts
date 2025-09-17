import { userRepository } from '../repositories/userRepository.js';
import { cryptoUtil } from '../utils/crypto.js';

export const userService = {
  async create(input: { firstName: string; lastName: string; email: string; phone?: string; password: string; roles: string[] }) {
    const passwordHash = await cryptoUtil.hashPassword(input.password);
    const user = await userRepository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      roleNames: input.roles,
    });
    return user;
  },

  async list(skip = 0, take = 20) {
    return userRepository.list(skip, take);
  },

  async get(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return user;
  },

  async update(id: string, input: { firstName?: string; lastName?: string; phone?: string; status?: 'active'|'disabled'; password?: string; roles?: string[] }) {
    if (input.password) {
      const passwordHash = await cryptoUtil.hashPassword(input.password);
      await userRepository.update(id, { passwordHash });
    }
    const { password, roles, ...rest } = input;
    if (Object.keys(rest).length) {
      await userRepository.update(id, rest as any);
    }
    if (roles) {
      await userRepository.setRoles(id, roles);
    }
    return this.get(id);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Get user with password hash
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await cryptoUtil.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password and update
    const newPasswordHash = await cryptoUtil.hashPassword(newPassword);
    await userRepository.update(userId, { passwordHash: newPasswordHash });
  }
};

