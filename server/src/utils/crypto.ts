import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export const cryptoUtil = {
  hashPassword: (pwd: string) => argon2.hash(pwd),
  verifyPassword: (pwd: string, hash: string) => argon2.verify(hash, pwd),
  newId: () => randomUUID(),
};

export const tokenUtil = {
  signAccess(payload: { id: string; roles: string[] }, ttl = '7d') {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ttl });
  },
  signRefresh(payload: { id: string; roles: string[] }, ttl = '30d') {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: ttl });
  },
  verifyRefresh(token: string) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string; roles: string[]; iat: number; exp: number };
  }
};

