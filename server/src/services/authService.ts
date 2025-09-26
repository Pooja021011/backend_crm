import { prisma } from '../config/db.js';
import { cryptoUtil, tokenUtil } from '../utils/crypto.js';
import { tokenRepository } from '../repositories/tokenRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import type { RoleName } from '@prisma/client';
import { createHash } from 'node:crypto';

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || user.status !== 'active') throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const ok = await cryptoUtil.verifyPassword(user.passwordHash, password);
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const roles = user.roles.map((ur) => ur.role.name as RoleName);
    const accessToken = tokenUtil.signAccess({ id: user.id, roles });
    const refreshToken = tokenUtil.signRefresh({ id: user.id, roles });

    await tokenRepository.create(user.id, hashToken(refreshToken), new Date(Date.now() + 30 * 24 * 3600 * 1000));

    // Include roles in the user object for frontend
    const userWithRoles = {
      ...user,
      roles: roles
    };

    return { user: userWithRoles, accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const decoded = tokenUtil.verifyRefresh(refreshToken);
    const valid = await tokenRepository.findValid(hashToken(refreshToken));
    if (!valid) throw Object.assign(new Error('Invalid token'), { status: 401 });

    const user = await userRepository.findById(decoded.id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const roles = user.roles.map((ur) => ur.role.name as RoleName);
    const accessToken = tokenUtil.signAccess({ id: user.id, roles });
    
    // Include roles in the user object for frontend
    const userWithRoles = {
      ...user,
      roles: roles
    };
    
    return { user: userWithRoles, accessToken };
  },

  async logout(refreshToken: string) {
    await tokenRepository.revokeByTokenHash(hashToken(refreshToken));
  }
};

