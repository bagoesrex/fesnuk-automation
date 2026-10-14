import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';
import { config } from '../config/env.ts';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger.ts';

// In-memory ref to the headed browser context during session setup
let pendingBrowserClose: (() => Promise<void>) | null = null;

export async function listAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await db.account.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
}

export async function startSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      res.status(422).json({ success: false, error: 'name is required', code: 'VALIDATION_ERROR' });
      return;
    }

    // lazy import playwright-extra to avoid loading on startup
    const { chromium } = await import('playwright-extra');
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    chromium.use(StealthPlugin());

    const browser = await chromium.launch({ headless: false, slowMo: config.playwright.slowMo });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://www.facebook.com/login');

    // store close fn for confirm step
    pendingBrowserClose = async () => {
      const state = await ctx.storageState();
      const sessionPath = path.join(config.sessionsDir, `${Date.now()}.json`);
      await fs.writeFile(sessionPath, JSON.stringify(state));
      await browser.close();
      // upsert account record
      const rel = path.relative(path.resolve(config.sessionsDir, '..'), sessionPath);
      const account = await db.account.create({
        data: { name: name.trim(), sessionPath: rel },
      });
      logger.info(`Session saved for account: ${account.id}`);
      // store account id on closure so confirm can return it
      (pendingBrowserClose as unknown as { accountId: string }).accountId = account.id;
    };

    logger.info('Headed browser opened for manual login');
    res.json({ success: true, data: { message: 'Browser opened. Complete login then call POST /accounts/session/confirm' } });
  } catch (err) {
    next(err);
  }
}

export async function confirmSession(req: Request, res: Response, next: NextFunction) {
  try {
    if (!pendingBrowserClose) {
      res.status(400).json({ success: false, error: 'No pending session. Call /session/start first.', code: 'SESSION_NOT_FOUND' });
      return;
    }
    await pendingBrowserClose();
    const accountId = (pendingBrowserClose as unknown as { accountId: string }).accountId;
    pendingBrowserClose = null;
    const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const account = await db.account.findUnique({ where: { id } });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found', code: 'NOT_FOUND' });
      return;
    }
    // delete session file
    const abs = path.resolve(config.sessionsDir, '..', account.sessionPath);
    await fs.rm(abs, { force: true });
    await db.account.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
