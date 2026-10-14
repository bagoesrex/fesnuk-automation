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

    // Navigate to the groups your account has joined
    await page.goto('https://www.facebook.com/groups/feed', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    // Check if we got redirected to login (session expired)
    if (page.url().includes('/login')) {
      throw new Error('Session expired — please re-setup the account session');
    }

    const scraped = await scrapeGroupsFromFeed(page);
    logger.info(`Scraped ${scraped.length} groups from Facebook`);

    // Upsert all scraped groups
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

async function scrapeGroupsFromFeed(page: import('playwright').Page): Promise<ScrapedGroup[]> {
  const groups: ScrapedGroup[] = [];
  const seen = new Set<string>();

  // Scroll and collect groups from the left sidebar / groups list
  // Facebook renders groups in the left nav on /groups/feed
  await autoScroll(page, 3);

  // Extract all links that match /groups/<id> pattern
  const links = await page.evaluate((): Array<{ href: string; text: string }> => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
    return anchors.map((a) => ({
      href: (a as HTMLAnchorElement).href,
      text: a.textContent?.trim() ?? '',
    }));
  });

  for (const { href, text } of links) {
    // Only keep proper group URLs, exclude sub-pages like /members, /media, /feed etc.
    const match = href.match(/facebook\.com\/groups\/([^/?&#]+)\/?$/);
    if (!match) continue;
    const fbGroupId = match[1];
    // Skip generic paths
    if (['feed', 'discover', 'create', 'joins'].includes(fbGroupId)) continue;
    if (seen.has(fbGroupId)) continue;
    seen.add(fbGroupId);

    const name = text || fbGroupId;
    const url = `https://www.facebook.com/groups/${fbGroupId}`;
    groups.push({ name, url, fbGroupId });
  }

  // If the sidebar didn't yield enough, also check the /groups page
  if (groups.length < 3) {
    await page.goto('https://www.facebook.com/groups/?category=joined', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);
    await autoScroll(page, 5);

    const moreLinks = await page.evaluate((): Array<{ href: string; text: string }> => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
      return anchors.map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: a.textContent?.trim() ?? '',
      }));
    });

    for (const { href, text } of moreLinks) {
      const match = href.match(/facebook\.com\/groups\/([^/?&#]+)\/?$/);
      if (!match) continue;
      const fbGroupId = match[1];
      if (['feed', 'discover', 'create', 'joins'].includes(fbGroupId)) continue;
      if (seen.has(fbGroupId)) continue;
      seen.add(fbGroupId);

      const name = text || fbGroupId;
      const url = `https://www.facebook.com/groups/${fbGroupId}`;
      groups.push({ name, url, fbGroupId });
    }
  }

  return groups;
}

async function autoScroll(page: import('playwright').Page, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(1200);
  }
  // scroll back to top so sidebar is visible
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(500);
}
