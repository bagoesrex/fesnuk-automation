import type { BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/env.ts';
import logger from '../utils/logger.ts';

export class SessionExpiredError extends Error {
  constructor(message = 'Facebook session has expired or is logged out.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

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
      const ss = state as unknown as Awaited<ReturnType<BrowserContext['storageState']>>;
      if (ss.cookies?.length) await ctx.addCookies(ss.cookies);
    }
    return true;
  } catch (err) {
    logger.warn(`Failed to load session from ${abs}: ${String(err)}`);
    return false;
  }
}

/** Auto-save updated cookies / storageState back to session file to preserve Facebook token rotations. */
export async function saveSession(ctx: BrowserContext, sessionPath: string): Promise<void> {
  const abs = path.resolve(config.sessionsDir, '..', sessionPath);
  try {
    const state = await ctx.storageState();
    await fs.writeFile(abs, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    logger.warn(`Failed to auto-save session to ${abs}: ${String(err)}`);
  }
}

/** Check if the current page is authenticated on Facebook. Throws SessionExpiredError if logged out. */
export async function assertSessionActive(page: Page): Promise<void> {
  const url = page.url();
  if (url.includes('/login') || url.includes('/checkpoint')) {
    throw new SessionExpiredError(`Redirected to login or security checkpoint (${url})`);
  }

  const content = await page.content();
  const userIdMatch = /"USER_ID":"([0-9]+)"/.exec(content);
  if (userIdMatch && userIdMatch[1] === '0') {
    throw new SessionExpiredError('Facebook is viewing as unauthenticated guest (USER_ID: 0)');
  }

  const hasLoginModal = content.includes('See more on Facebook') || content.includes('Lihat lainnya di Facebook');
  if (hasLoginModal) {
    throw new SessionExpiredError('Facebook login wall modal detected ("See more on Facebook")');
  }

  const hasLoginForm = content.includes('name="email"') && (content.includes('name="pass"') || content.includes('name="login"'));
  const hasProfile = content.includes('aria-label="Your profile"') || content.includes('aria-label="Profil Anda"');
  if (hasLoginForm && !hasProfile) {
    throw new SessionExpiredError('Facebook login form detected on page');
  }
}

