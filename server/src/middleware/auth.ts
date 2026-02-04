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
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    (req as any).user = { 
      id: decoded.id, 
      roles: decoded.roles,
      email: decoded.email  // Add email from JWT token
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Middleware that accepts token from query params (for img src tags)
export function authenticateWithQuery(req: Request, res: Response, next: NextFunction) {
  // Try header first
  const auth = req.headers.authorization;
  let token = auth?.startsWith('Bearer ') ? auth.substring(7) : undefined;
  
  // If no header token, try query param
  if (!token) {
    token = req.query.token as string;
    // Decode URL-encoded token if needed (JWT tokens may have special chars)
    if (token) {
      try {
        // Try decoding - JWT tokens might be URL encoded
        const decoded = decodeURIComponent(token);
        // Check if it looks like a valid JWT (has dots)
        if (decoded.includes('.')) {
          token = decoded;
        } else {
          // If decoded doesn't have dots, might be double-encoded or original is fine
          token = token;
        }
      } catch {
        // If decode fails, use original token
        token = token;
      }
    }
  }
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser & { iat: number; exp: number };
    (req as any).user = { id: decoded.id, roles: decoded.roles } satisfies AuthUser;
    return next();
  } catch (error: any) {
    // Log error for debugging (but don't expose details to client)
    console.error('Token verification failed:', error.message);
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

