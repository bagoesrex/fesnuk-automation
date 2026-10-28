import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';
import { config } from '../config/env.ts';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger.ts';
import { createStealthBrowser, createStealthContext } from '../utils/browser.ts';

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
    const { name, proxyUrl } = req.body as { name?: string; proxyUrl?: string };
    if (!name?.trim()) {
      res.status(422).json({ success: false, error: 'name is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const browser = await createStealthBrowser({ headless: false });
    const ctx = await createStealthContext(browser, { proxyUrl });
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
        data: {
          name: name.trim(),
          sessionPath: rel,
          proxyUrl: proxyUrl?.trim() || null,
        },
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

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { name, proxyUrl, isActive } = req.body as { name?: string; proxyUrl?: string; isActive?: boolean };
    const data: Record<string, unknown> = {};
    if (name !== undefined) data['name'] = name.trim();
    if (proxyUrl !== undefined) data['proxyUrl'] = proxyUrl?.trim() || null;
    if (isActive !== undefined) data['isActive'] = isActive;

    const account = await db.account.update({ where: { id }, data });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const inActiveSchedule = await db.schedule.findFirst({
      where: { accountId: id, OR: [{ isActive: true }, { status: 'RUNNING' }] },
    });
    if (inActiveSchedule) {
      res.status(409).json({ success: false, error: 'Account is assigned to an active schedule', code: 'SCHEDULE_RUNNING' });
      return;
    }
    const account = await db.account.findUnique({ where: { id } });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found', code: 'NOT_FOUND' });
      return;
    }
    // delete session file
    const abs = path.resolve(config.sessionsDir, '..', account.sessionPath);
    await fs.rm(abs, { force: true });
    // cleanup post images
    const posts = await db.post.findMany({ where: { accountId: id } });
    for (const post of posts) {
      try {
        const paths = JSON.parse(post.imagePaths) as string[];
        for (const rel of paths) {
          const fileAbs = path.resolve(config.uploadsDir, '..', rel);
          await fs.rm(fileAbs, { force: true });
        }
      } catch {
        // ignore parse error
      }
    }
    // cleanup inactive schedules and groups
    const schedules = await db.schedule.findMany({ where: { accountId: id }, select: { id: true } });
    const scheduleIds = schedules.map((s) => s.id);
    if (scheduleIds.length > 0) {
      await db.scheduleGroup.deleteMany({ where: { scheduleId: { in: scheduleIds } } });
      await db.schedule.deleteMany({ where: { id: { in: scheduleIds } } });
    }
    await db.account.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}

export async function exportSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const account = await db.account.findUnique({ where: { id } });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found', code: 'NOT_FOUND' });
      return;
    }

    const abs = path.resolve(config.sessionsDir, '..', account.sessionPath);
    const content = await fs.readFile(abs, 'utf-8');
    const safeName = account.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="session-${safeName}.json"`);
    res.send(content);
  } catch (err) {
    next(err);
  }
}

export async function importSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, proxyUrl, sessionData } = req.body as {
      name?: string;
      proxyUrl?: string;
      sessionData?: unknown;
    };

    if (!name?.trim()) {
      res.status(422).json({ success: false, error: 'name is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!sessionData) {
      res.status(422).json({ success: false, error: 'sessionData is required', code: 'VALIDATION_ERROR' });
      return;
    }

    let parsed: unknown;
    try {
      parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    } catch {
      res.status(422).json({ success: false, error: 'sessionData must be valid JSON', code: 'INVALID_JSON' });
      return;
    }

    // Validate Playwright storageState or cookie array structure
    const isCookieArray = Array.isArray(parsed) && parsed.length > 0;
    const isStorageState = Boolean(
      parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { cookies?: unknown[] }).cookies) &&
        (parsed as { cookies: unknown[] }).cookies.length > 0
    );

    if (!isCookieArray && !isStorageState) {
      res.status(422).json({
        success: false,
        error: 'Invalid session structure: must contain cookies or Playwright storageState format',
        code: 'INVALID_SESSION_DATA',
      });
      return;
    }

    // Write session file
    await fs.mkdir(config.sessionsDir, { recursive: true });
    const sessionPath = path.join(config.sessionsDir, `${Date.now()}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(parsed, null, 2), 'utf-8');

    const rel = path.relative(path.resolve(config.sessionsDir, '..'), sessionPath);
    const account = await db.account.create({
      data: {
        name: name.trim(),
        sessionPath: rel,
        proxyUrl: proxyUrl?.trim() || null,
      },
    });

    logger.info(`Session imported successfully for account: ${account.id} (${account.name})`);
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}
