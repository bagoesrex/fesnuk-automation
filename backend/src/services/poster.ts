import type { Schedule, Post, Account, Group } from '@prisma/client';
import db from '../config/db.ts';
import { loadSession } from './session.ts';
import { delay, randomInt } from '../utils/helpers.ts';
import { config } from '../config/env.ts';
import logger from '../utils/logger.ts';
import path from 'path';
import fs from 'fs';
import { createStealthBrowser, createStealthContext, humanClick } from '../utils/browser.ts';

type ScheduleWithRelations = Schedule & {
  post: Post;
  account: Account;
  scheduleGroups: Array<{ group: Group; order: number }>;
};

export async function runPosting(schedule: ScheduleWithRelations): Promise<void> {
  const browser = await createStealthBrowser();

  try {
    for (const { group } of schedule.scheduleGroups) {
      if (!group.isActive) {
        await writeLog(schedule, group, 'SKIPPED', 'Group is inactive');
        continue;
      }

      const ctx = await createStealthContext(browser, {
        proxyUrl: schedule.account.proxyUrl,
        viewport: { width: 1280, height: 900 },
      });
      try {
        // load saved session
        const sessionOk = await loadSession(ctx, schedule.account.sessionPath);
        if (!sessionOk) {
          await writeLog(schedule, group, 'SKIPPED', 'Session invalid or expired');
          await ctx.close();
          continue;
        }

        await postToGroup(ctx, group, schedule.post, schedule.account.sessionPath);
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
  group: Group,
  post: Post,
  _sessionPath: string
): Promise<void> {
  const page = await ctx.newPage();
  try {
    await page.goto(group.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // human-like: random scroll then pause — also helps Facebook render feed elements
    await page.evaluate(() => (window as any).scrollBy(0, 200 + Math.random() * 400));
    await delay(randomInt(1500, 2500));

    // ── Step 1: Click "Tulis sesuatu..." / "Write something..." trigger ────────
    const composerTrigger = page
      .locator('[role="button"]', { hasText: /tulis sesuatu|write something|buat postingan publik/i })
      .first();
    await composerTrigger.waitFor({ timeout: 15000 });
    await composerTrigger.scrollIntoViewIfNeeded();
    // Offset slightly so it's not tucked under Facebook's sticky navbar
    await page.evaluate(() => (window as any).scrollBy(0, -120));
    await delay(500);
    await humanClick(page, composerTrigger, { force: true });
    await delay(randomInt(1200, 2000));

    // ── Step 2: Wait for composer dialog to open ──────────────────────────────
    // Index 0 has the actual composer content (no aria-label).
    const dialog = page.locator('[role="dialog"]').first();
    try {
      await dialog.waitFor({ timeout: 8000 });
    } catch {
      // Retry click once if dialog didn't open immediately
      await page.evaluate(() => (window as any).scrollBy(0, -120));
      await composerTrigger.click({ force: true });
      await dialog.waitFor({ timeout: 15000 });
    }

    // ── Step 3: Click and type into composer textbox inside dialog ────────────
    const textbox = dialog.locator('[role="textbox"]').first();
    await textbox.waitFor({ timeout: 10000 });
    await textbox.click({ force: true });
    await textbox.focus().catch(() => {});
    await delay(randomInt(300, 600));

    // Type content character by character for human-like pacing
    const imagePaths = JSON.parse(post.imagePaths) as string[];
    for (const char of post.content) {
      await page.keyboard.type(char, { delay: randomInt(30, 80) });
    }

    // Fallback: verify text registered; if empty, insert directly via InputEvent
    const currentText = await textbox.innerText().catch(() => '');
    if (!currentText.trim() && post.content.trim()) {
      await textbox.focus().catch(() => {});
      await page.keyboard.insertText(post.content);
    }

    // Dismiss any auto-suggestion / mention dropdown that may have appeared
    // (e.g. Facebook shows mention suggestions when typing names like "Guys", "@someone", etc.)
    // Strategy: click the dialog heading — dismisses dropdown WITHOUT closing dialog.
    const dialogHeading = dialog.locator('text=Buat postingan, text="Create post", text="Create a post"').first();
    const headingExists = await dialogHeading.count();
    if (headingExists > 0) {
      await dialogHeading.click({ force: true }).catch(() => {});
    }
    await delay(randomInt(400, 700));

    // ── Step 4: Attach images if any ─────────────────────────────────────────
    if (imagePaths.length > 0) {
      const photoBtn = dialog.locator('[aria-label="Foto/video"], [aria-label="Photo/video"]').first();
      await photoBtn.waitFor({ timeout: 5000 });
      await photoBtn.click({ force: true });
      await delay(randomInt(600, 1200));

      const fileInput = dialog.locator('input[type="file"][multiple]').first();
      await fileInput.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});

      const absPaths = imagePaths.map((rel) => path.resolve(config.uploadsDir, '..', rel));
      try {
        await fileInput.setInputFiles(absPaths);
      } catch {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 8000 }),
          photoBtn.click({ force: true }),
        ]);
        await fileChooser.setFiles(absPaths);
      }

      // Wait for uploads: watch for spinner/progress to disappear
      await page.waitForSelector('[role="progressbar"], [aria-label="Memuat..."], [aria-label="Loading..."]', {
        state: 'detached',
        timeout: 60000,
      }).catch(() => {});
      await delay(randomInt(1500, 2500));
    }

    // ── Step 5: Click the "Posting" / "Post" submit button ─────────────────────
    const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
    await postBtn.waitFor({ timeout: 10000 });
    await postBtn.scrollIntoViewIfNeeded();

    // Wait until Post button is enabled (aria-disabled is false or not present)
    const enabledPostBtn = dialog
      .locator('[aria-label="Posting"]:not([aria-disabled="true"]), [aria-label="Post"]:not([aria-disabled="true"])')
      .first();

    try {
      await enabledPostBtn.waitFor({ state: 'visible', timeout: 45000 });
    } catch {
      const isDisabled = await postBtn.getAttribute('aria-disabled');
      if (isDisabled === 'true') {
        throw new Error(
          'Tombol Posting tetap nonaktif (aria-disabled="true") setelah 45 detik. Kemungkinan upload gambar masih berjalan/gagal, atau grup mewajibkan pemilihan topik/aturan persetujuan.'
        );
      }
    }

    await delay(randomInt(300, 600));
    await humanClick(page, postBtn, { force: true });

    // Wait for dialog to close (post submitted successfully)
    await dialog.waitFor({ state: 'detached', timeout: 35000 });
    await delay(randomInt(2000, 3000));

    logger.info('Post submitted successfully');
  } catch (err) {
    const domPath = await captureErrorDom(page, group.name);
    if (domPath && err instanceof Error) {
      err.message = `${err.message} (DOM: ${domPath})`;
    }
    throw err;
  } finally {
    await page.close();
  }
}

async function captureErrorDom(page: import('playwright').Page, groupName: string): Promise<string | null> {
  try {
    await fs.promises.mkdir(config.logsDir, { recursive: true });
    const safeName = groupName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'unknown';
    const timestamp = Date.now();
    const filename = `dom-error-${timestamp}-${safeName}.html`;
    const fullPath = path.join(config.logsDir, filename);

    const html = await page.content();
    await fs.promises.writeFile(fullPath, html, 'utf-8');

    // Also capture screenshot for quick visual check
    const screenshotName = `screenshot-error-${timestamp}-${safeName}.png`;
    await page.screenshot({ path: path.join(config.logsDir, screenshotName) }).catch(() => {});

    logger.info(`Captured error DOM and screenshot for ${groupName} -> ${filename}`);
    return `logs/${filename}`;
  } catch (e) {
    logger.warn(`Failed to capture error DOM for ${groupName}: ${e}`);
    return null;
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
