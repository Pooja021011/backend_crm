import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AuthUser = {
  id: string;
  roles: string[];
};

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.substring(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser & { iat: number; exp: number };
    (req as any).user = { id: decoded.id, roles: decoded.roles } satisfies AuthUser;
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Alias for backward compatibility
export const authMiddleware = authenticate;

export function requireRoles(...allowed: string[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const ok = user.roles.some((r) => allowed.includes(r));
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

