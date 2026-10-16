import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.ts';
import { verifyToken } from '../utils/auth.ts';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // If no ADMIN_PASSWORD is set in environment, auth is not required
  if (!config.adminPassword) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token, config.jwtSecret);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // Attach token payload to request for downstream use if needed
  (req as Request & { user?: unknown }).user = payload;
  next();
}
