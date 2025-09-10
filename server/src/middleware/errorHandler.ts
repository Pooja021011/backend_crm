import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'ValidationError', details: err.flatten() });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  logger.error({ err }, message);
  return res.status(status).json({ error: message });
}

