import { loadSession } from './session.ts';
import db from '../config/db.ts';
import { config } from '../config/env.ts';
import logger from '../utils/logger.ts';
import { delay } from '../utils/helpers.ts';

interface ScrapedGroup {
  name: string;
  url: string;
  fbGroupId: string;
}

export async function syncGroupsFromFacebook(
  sessionPath: string
): Promise<{ added: number; skipped: number; total: number; groups: ScrapedGroup[] }> {
  const { chromium } = await import('playwright-extra');
  const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
  chromium.use(StealthPlugin());

  const browser = await chromium.launch({ headless: config.playwright.headless, slowMo: config.playwright.slowMo });
  const ctx = await browser.newContext();

  try {
    const sessionOk = await loadSession(ctx, sessionPath);
    if (!sessionOk) throw new Error('Failed to load session — please re-setup the account session');

    const page = await ctx.newPage();

    // /groups/joins/ is the dedicated "Groups you've joined" page — most complete source
    await page.goto('https://www.facebook.com/groups/joins/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2500);

    if (page.url().includes('/login')) {
      throw new Error('Session expired — please re-setup the account session');
    }

    const scraped = await scrapeAllGroups(page);
    logger.info(`Scraped ${scraped.length} groups from facebook.com/groups/joins/`);

    let added = 0;
    let skipped = 0;
    for (const g of scraped) {
      const existing = await db.group.findUnique({ where: { fbGroupId: g.fbGroupId } });
      if (existing) {
        skipped++;
      } else {
        await db.group.create({ data: g });
        added++;
      }
    }

    return { added, skipped, total: scraped.length, groups: scraped };
  } finally {
    await browser.close();
  }
}

async function scrapeAllGroups(page: import('playwright').Page): Promise<ScrapedGroup[]> {
  const seen = new Set<string>();
  const groups: ScrapedGroup[] = [];

  // Keep scrolling until no new groups are found in 3 consecutive passes
  let staleRounds = 0;
  const MAX_STALE = 3;

  while (staleRounds < MAX_STALE) {
    const before = seen.size;

    const links = await extractGroupLinks(page);
    for (const { fbGroupId, name, url } of links) {
      if (!seen.has(fbGroupId)) {
        seen.add(fbGroupId);
        groups.push({ fbGroupId, name, url });
      }
    }

    const after = seen.size;
    logger.debug(`Scroll pass: found ${after - before} new groups (total ${after})`);

    if (after === before) {
      staleRounds++;
    } else {
      staleRounds = 0;
    }

    // scroll down to load more
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await delay(1800);
  }

  return groups;
}

async function extractGroupLinks(page: import('playwright').Page): Promise<ScrapedGroup[]> {
  return page.evaluate((): Array<{ fbGroupId: string; name: string; url: string }> => {
    const results: Array<{ fbGroupId: string; name: string; url: string }> = [];
    const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));

    for (const el of anchors) {
      const href = (el as HTMLAnchorElement).href;
      // Match clean group URLs only: /groups/<id> with no sub-path after
      const match = href.match(/facebook\.com\/groups\/([^/?&#]+)\/?(?:[?#].*)?$/);
      if (!match) continue;

      const fbGroupId = match[1];
      // Skip reserved paths
      if (['feed', 'discover', 'create', 'joins', 'search', 'you'].includes(fbGroupId)) continue;
      // Skip numeric-only IDs that are likely post IDs embedded in group URLs
      // (real group IDs can be numeric, so we keep them — just filter sub-pages)
      if (href.match(/\/groups\/[^/]+\/(permalink|posts|media|members|events|files|about|announcements)/)) continue;

      // Prefer the closest meaningful text node (group name is usually the direct text)
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
      if (!text || text.length > 120) continue; // skip empty or nav-wrapper links

      results.push({
        fbGroupId,
        name: text,
        url: `https://www.facebook.com/groups/${fbGroupId}`,
      });
    }

    return results;
  });
}
