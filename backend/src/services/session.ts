import type { BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/env.ts';
import logger from '../utils/logger.ts';

/** Load saved storageState into the given browser context. Returns false if session file missing or login has expired. */
export async function loadSession(ctx: BrowserContext, sessionPath: string): Promise<boolean> {
  const abs = path.resolve(config.sessionsDir, '..', sessionPath);
  try {
    const raw = await fs.readFile(abs, 'utf-8');
    const state = JSON.parse(raw) as Parameters<BrowserContext['addCookies']>[0];
    if (Array.isArray(state)) {
      await ctx.addCookies(state);
    } else {
      // storageState object shape
      const ss = state as Awaited<ReturnType<BrowserContext['storageState']>>;
      if (ss.cookies?.length) await ctx.addCookies(ss.cookies);
    }
    return true;
  } catch (err) {
    logger.warn(`Failed to load session from ${abs}: ${String(err)}`);
    return false;
  }
}
