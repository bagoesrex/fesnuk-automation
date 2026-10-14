import type { Schedule, Post, Account, Group } from '@prisma/client';
import db from '../config/db.ts';
import { loadSession } from './session.ts';
import { delay, randomInt } from '../utils/helpers.ts';
import { config } from '../config/env.ts';
import logger from '../utils/logger.ts';
import path from 'path';

type ScheduleWithRelations = Schedule & {
  post: Post;
  account: Account;
  scheduleGroups: Array<{ group: Group; order: number }>;
};

export async function runPosting(schedule: ScheduleWithRelations): Promise<void> {
  const { chromium } = await import('playwright-extra');
  const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
  chromium.use(StealthPlugin());

  const browser = await chromium.launch({ headless: config.playwright.headless, slowMo: config.playwright.slowMo });

  try {
    for (const { group } of schedule.scheduleGroups) {
      if (!group.isActive) {
        await writeLog(schedule, group, 'SKIPPED', 'Group is inactive');
        continue;
      }

      const ctx = await browser.newContext();
      try {
        // load saved session
        const sessionOk = await loadSession(ctx, schedule.account.sessionPath);
        if (!sessionOk) {
          await writeLog(schedule, group, 'SKIPPED', 'Session invalid or expired');
          await ctx.close();
          continue;
        }

        await postToGroup(ctx, group.url, schedule.post, schedule.account.sessionPath);
        await writeLog(schedule, group, 'SUCCESS');
        logger.info(`Posted to group ${group.name} (schedule ${schedule.id})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await writeLog(schedule, group, 'FAILED', msg);
        logger.error(`Failed posting to group ${group.name}: ${msg}`);
      } finally {
        await ctx.close();
      }

      // random delay before next group (skip delay after last group)
      const isLast = schedule.scheduleGroups.at(-1)?.group.id === group.id;
      if (!isLast) {
        const ms = randomInt(schedule.delayMinSec, schedule.delayMaxSec) * 1000;
        logger.info(`Waiting ${Math.round(ms / 1000)}s before next group`);
        await delay(ms);
      }
    }
  } finally {
    await browser.close();
  }
}

async function postToGroup(
  ctx: import('playwright').BrowserContext,
  groupUrl: string,
  post: Post,
  _sessionPath: string
): Promise<void> {
  const page = await ctx.newPage();
  try {
    await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // human-like: random scroll then pause
    await page.evaluate(() => window.scrollBy(0, 200 + Math.random() * 400));
    await delay(randomInt(800, 1800));

    // ── Step 1: Click "Tulis sesuatu..." / "Write something..." trigger ────────
    // Facebook renders an inline button (role=button, text="Tulis sesuatu...") that opens the composer modal.
    // DOM confirmed via inspection: [role="button"] with text "Tulis sesuatu..."
    const composerTrigger = page.locator('[role="button"]', { hasText: /tulis sesuatu|write something|buat postingan publik/i }).first();
    await composerTrigger.waitFor({ timeout: 15000 });
    await composerTrigger.click();
    await delay(randomInt(800, 1500));

    // ── Step 2: Wait for the composer dialog to open ──────────────────────────
    // Confirmed: [role="dialog"][aria-label="Buat postingan"] appears after click
    const dialog = page.locator('[role="dialog"]').filter({ hasText: /buat postingan|create post/i }).first();
    await dialog.waitFor({ timeout: 10000 });

    // ── Step 3: Click and type into the composer textbox inside the dialog ────
    // Confirmed: [role="textbox"][aria-label="Buat postingan publik..."] inside dialog
    const textbox = dialog.locator('[role="textbox"]').first();
    await textbox.waitFor({ timeout: 10000 });
    await textbox.click();
    await delay(randomInt(300, 600));

    // Type content character by character for human-like pacing
    const imagePaths = JSON.parse(post.imagePaths) as string[];
    for (const char of post.content) {
      await page.keyboard.type(char, { delay: randomInt(30, 100) });
    }
    await delay(randomInt(400, 800));

    // ── Step 4: Attach images if any ─────────────────────────────────────────
    // Confirmed: [aria-label="Foto/video"] button opens file picker inside the dialog
    if (imagePaths.length > 0) {
      const photoBtn = dialog.locator('[aria-label="Foto/video"], [aria-label="Photo/video"]').first();
      await photoBtn.waitFor({ timeout: 5000 });
      await photoBtn.click();
      await delay(randomInt(600, 1200));

      // Wait for file input to be ready then set files directly (more reliable than filechooser event)
      // The file input for the composer modal is the one with multiple attribute and image+video accept
      const fileInput = dialog.locator('input[type="file"][multiple]').first();
      await fileInput.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {
        // fallback: use any file input
      });

      const absPaths = imagePaths.map((rel) => path.resolve(config.uploadsDir, '..', rel));
      try {
        await fileInput.setInputFiles(absPaths);
      } catch {
        // Fallback: trigger via filechooser event on the photo button
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 8000 }),
          photoBtn.click(),
        ]);
        await fileChooser.setFiles(absPaths);
      }

      // Wait for uploads: watch for spinner/progress to disappear
      await page.waitForSelector('[role="progressbar"], [aria-label="Memuat..."], [aria-label="Loading..."]', {
        state: 'detached',
        timeout: 60000,
      }).catch(() => {}); // ok if never appeared
      await delay(randomInt(1500, 2500));
    }

    // ── Step 5: Click the "Posting" / "Post" submit button ─────────────────────
    // Confirmed: [aria-label="Posting"] inside the dialog
    const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
    await postBtn.waitFor({ timeout: 5000 });
    await postBtn.click();

    // Wait for dialog to close (post submitted successfully)
    await dialog.waitFor({ state: 'detached', timeout: 30000 });
    await delay(randomInt(2000, 3000));

    logger.info('Post submitted successfully');
  } finally {
    await page.close();
  }
}

async function writeLog(
  schedule: ScheduleWithRelations,
  group: Group,
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
  error?: string
): Promise<void> {
  await db.postLog.create({
    data: {
      scheduleId: schedule.id,
      groupId: group.id,
      postId: schedule.post.id,
      accountId: schedule.account.id,
      status,
      error,
    },
  });
}
