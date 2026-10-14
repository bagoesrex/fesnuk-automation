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
    await delay(randomInt(500, 1500));

    // click the post composer box
    const composer = page.locator('[data-testid="status-attachment-mentions-input"], [aria-label="Write something..."], [role="textbox"]').first();
    await composer.waitFor({ timeout: 15000 });
    await composer.click();
    await delay(randomInt(300, 800));

    // type content character by character for human-like pacing
    const imagePaths = JSON.parse(post.imagePaths) as string[];
    for (const char of post.content) {
      await page.keyboard.type(char, { delay: randomInt(30, 120) });
    }

    // attach images if any
    if (imagePaths.length > 0) {
      const photoBtn = page.locator('[aria-label="Photo/video"], [aria-label="Photo"], [data-testid="photo-video"]').first();
      await photoBtn.click();
      await delay(randomInt(500, 1000));

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('input[type="file"]').last().click(),
      ]);
      const absPaths = imagePaths.map((rel) => path.resolve(config.uploadsDir, '..', rel));
      await fileChooser.setFiles(absPaths);
      // wait for uploads to finish (progress bar disappears)
      await page.waitForSelector('[aria-label="Loading"], [role="progressbar"]', { state: 'detached', timeout: 60000 }).catch(() => {});
      await delay(randomInt(1000, 2000));
    }

    // submit
    const postBtn = page.locator('[aria-label="Post"], button:has-text("Post")').last();
    await postBtn.click();
    // wait for composer to close / post to appear
    await delay(randomInt(3000, 5000));
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
