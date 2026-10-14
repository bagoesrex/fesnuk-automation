import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.ts';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  logger.error(`${code}: ${err.message}`, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    error: err.message ?? 'An unexpected error occurred',
    code,
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
}
