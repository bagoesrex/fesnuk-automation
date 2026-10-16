import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.ts';
import { signToken, verifyToken, checkLoginRateLimit, recordLoginFailure, clearLoginFailure } from '../utils/auth.ts';

export async function getAuthStatus(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const authRequired = Boolean(config.adminPassword);
  if (!authRequired) {
    res.json({ success: true, data: { authRequired: false, authenticated: true } });
    return;
  }

  const authHeader = req.headers.authorization;
  let authenticated = false;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    authenticated = Boolean(verifyToken(token, config.jwtSecret));
  }

  res.json({
    success: true,
    data: {
      authRequired: true,
      authenticated,
    },
  });
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!config.adminPassword) {
      res.json({
        success: true,
        data: {
          token: signToken({ role: 'admin' }, config.jwtSecret),
          expiresIn: 30 * 24 * 3600,
        },
      });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      res.status(429).json({
        success: false,
        error: `Too many failed login attempts. Please wait ${rateCheck.waitSeconds} seconds.`,
        code: 'TOO_MANY_REQUESTS',
      });
      return;
    }

    const { password } = req.body as { password?: string };
    if (!password || typeof password !== 'string') {
      res.status(422).json({
        success: false,
        error: 'Password is required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (password !== config.adminPassword) {
      recordLoginFailure(clientIp);
      res.status(401).json({
        success: false,
        error: 'Incorrect admin password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    clearLoginFailure(clientIp);
    const token = signToken({ role: 'admin' }, config.jwtSecret, 30 * 24 * 3600);
    res.json({
      success: true,
      data: {
        token,
        expiresIn: 30 * 24 * 3600,
      },
    });
  } catch (err) {
    next(err);
  }
}
