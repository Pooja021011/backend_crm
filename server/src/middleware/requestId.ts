import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, _res: Response, next: NextFunction) {
  (req as any).id = (req.headers['x-request-id'] as string) || randomUUID();
  next();
}

