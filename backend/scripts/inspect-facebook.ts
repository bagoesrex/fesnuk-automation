/**
 * inspect-facebook.ts
 * Opens a headed browser with the saved session, navigates to a Facebook group,
 * and dumps all interactive DOM elements relevant to posting.
 * Does NOT post anything — inspect only.
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const SESSION_PATH = path.resolve(import.meta.dir, '..', 'sessions', '1791954610004.json');
const LOGS_DIR = path.resolve(import.meta.dir, '..', 'logs');
const GROUP_URL = 'https://www.facebook.com/groups/115996045140273';

await fs.mkdir(LOGS_DIR, { recursive: true });

console.log('🚀 Launching browser (headed)...');
const browser = await chromium.launch({ headless: false, slowMo: 80 });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// Load session
const raw = await fs.readFile(SESSION_PATH, 'utf-8');
const session = JSON.parse(raw) as { cookies?: unknown[]; origins?: unknown[] };
if (session.cookies?.length) await ctx.addCookies(session.cookies as Parameters<typeof ctx.addCookies>[0]);

const page = await ctx.newPage();

// ── Step 1: Verify login ──────────────────────────────────────────────────────
console.log('📡 Navigating to Facebook...');
await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

if (page.url().includes('/login')) {
  console.error('❌ Session expired! Please re-setup the session.');
  await browser.close();
  process.exit(1);
}
console.log('✅ Logged in. Current URL:', page.url());

await page.screenshot({ path: path.join(LOGS_DIR, '01-homepage.png') });
console.log('📸 Screenshot: 01-homepage.png');

// ── Step 2: Navigate to group ────────────────────────────────────────────────
console.log(`\n📡 Navigating to group: ${GROUP_URL}`);
await page.goto(GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);

await page.screenshot({ path: path.join(LOGS_DIR, '02-group-page.png') });
console.log('📸 Screenshot: 02-group-page.png');

// ── Step 3: Dump all potential composer elements (before click) ───────────────
console.log('\n🔍 Dumping interactive elements on group page (before click)...');

const beforeClickDump = await page.evaluate(() => {
  const results: Array<{
    tag: string;
    role: string | null;
    ariaLabel: string | null;
    placeholder: string | null;
    testId: string | null;
    text: string;
    classes: string;
    contentEditable: string | null;
    type: string | null;
    isVisible: boolean;
  }> = [];

  // Query everything that could be a post composer or button
  const selectors = [
    '[role="textbox"]',
    '[contenteditable="true"]',
    '[data-testid*="status"]',
    '[data-testid*="composer"]',
    '[data-testid*="post"]',
    '[aria-label*="Write"]',
    '[aria-label*="Post"]',
    '[aria-label*="post"]',
    '[aria-label*="share"]',
    '[aria-label*="Share"]',
    '[aria-label*="Photo"]',
    '[aria-label*="photo"]',
    '[aria-label*="Video"]',
    '[aria-label*="Feeling"]',
    'input[type="file"]',
  ];

  const seen = new Set<Element>();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      results.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        placeholder: el.getAttribute('placeholder'),
        testId: el.getAttribute('data-testid'),
        text: (el.textContent ?? '').trim().slice(0, 100),
        classes: el.className?.toString().slice(0, 80) ?? '',
        contentEditable: el.getAttribute('contenteditable'),
        type: el.getAttribute('type'),
        isVisible: rect.width > 0 && rect.height > 0,
      });
    });
  }
  return results;
});

console.log('\n=== PRE-CLICK ELEMENTS ===');
beforeClickDump.forEach((el, i) => {
  console.log(`[${i}] <${el.tag}> role=${el.role} aria-label="${el.ariaLabel}" placeholder="${el.placeholder}" testid="${el.testId}" visible=${el.isVisible}`);
  if (el.text) console.log(`     text: "${el.text}"`);
  if (el.contentEditable) console.log(`     contenteditable: ${el.contentEditable}`);
});

// ── Step 4: Find and click the post composer ─────────────────────────────────
console.log('\n🖱️  Attempting to click the post composer...');

// Try each known selector pattern
const composerSelectors = [
  '[aria-label*="Buat postingan"]',    // Indonesian: "Create post"
  '[aria-label*="Tulis sesuatu"]',     // Indonesian: "Write something"
  '[aria-label*="Write something"]',
  '[aria-label*="Create a post"]',
  '[aria-label*="What"]',
  '[role="textbox"]',
  '[contenteditable="true"]',
  'div[data-lexical-editor="true"]',
  'div[data-contents="true"]',
];

let composerClicked = false;
for (const sel of composerSelectors) {
  try {
    const el = page.locator(sel).first();
    const count = await el.count();
    if (count > 0) {
      const isVisible = await el.isVisible();
      console.log(`  ✓ Found: "${sel}" (visible: ${isVisible})`);
      if (isVisible) {
        // scroll into view first
        await page.evaluate((s) => {
          const node = document.querySelector(s);
          node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, sel);
        await page.waitForTimeout(1000);
        await el.click();
        composerClicked = true;
        console.log(`  🖱️  Clicked: "${sel}"`);
        break;
      }
    }
  } catch (e) {
    // try next
  }
}

if (!composerClicked) {
  console.log('  ⚠️  No composer found via direct selectors. Trying to find "create post" area...');
  // Try clicking a div that looks like a post creation box
  await page.evaluate(() => {
    // Look for the post creation prompt text
    const allDivs = Array.from(document.querySelectorAll('div, span'));
    for (const div of allDivs) {
      const text = div.textContent?.trim().toLowerCase() ?? '';
      if ((text.includes('write something') || text.includes('tulis sesuatu') || text.includes('buat postingan')) && (div as HTMLElement).offsetWidth > 100) {
        (div as HTMLElement).click();
        break;
      }
    }
  });
}

await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(LOGS_DIR, '03-after-composer-click.png') });
console.log('📸 Screenshot: 03-after-composer-click.png');

// ── Step 5: Dump DOM after click (modal/dialog may appear) ───────────────────
console.log('\n🔍 Dumping elements after composer click...');

const afterClickDump = await page.evaluate(() => {
  const results: Array<{
    tag: string;
    role: string | null;
    ariaLabel: string | null;
    placeholder: string | null;
    testId: string | null;
    text: string;
    contentEditable: string | null;
    type: string | null;
    isVisible: boolean;
    dataLexical: string | null;
    dataContents: string | null;
  }> = [];

  const selectors = [
    '[role="textbox"]',
    '[contenteditable="true"]',
    '[role="dialog"]',
    '[data-lexical-editor]',
    '[data-contents]',
    'div[contenteditable]',
    'button[type="submit"]',
    '[aria-label*="Post"]',
    '[aria-label*="Posting"]',
    '[aria-label*="Bagikan"]',   // Indonesian: "Share/Post"
    '[aria-label*="Publikasikan"]',
    '[aria-label*="Photo"]',
    '[aria-label*="Foto"]',      // Indonesian: "Photo"
    '[aria-label*="Gambar"]',    // Indonesian: "Image"
    'input[type="file"]',
    '[aria-label*="Close"]',
    '[aria-label*="Tutup"]',     // Indonesian: "Close"
  ];

  const seen = new Set<Element>();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      results.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        placeholder: el.getAttribute('placeholder'),
        testId: el.getAttribute('data-testid'),
        text: (el.textContent ?? '').trim().slice(0, 150),
        contentEditable: el.getAttribute('contenteditable'),
        type: el.getAttribute('type'),
        isVisible: rect.width > 0 && rect.height > 0,
        dataLexical: el.getAttribute('data-lexical-editor'),
        dataContents: el.getAttribute('data-contents'),
      });
    });
  }
  return results;
});

console.log('\n=== POST-CLICK ELEMENTS ===');
afterClickDump.forEach((el, i) => {
  console.log(`[${i}] <${el.tag}> role=${el.role} aria-label="${el.ariaLabel}" testid="${el.testId}" visible=${el.isVisible} lexical=${el.dataLexical} contents=${el.dataContents}`);
  if (el.text) console.log(`     text: "${el.text}"`);
  if (el.contentEditable) console.log(`     contenteditable: ${el.contentEditable}`);
  if (el.type) console.log(`     type: ${el.type}`);
});

// ── Step 6: Check for photo button ───────────────────────────────────────────
console.log('\n📷 Looking for photo/file attachment buttons...');
const photoButtonDump = await page.evaluate(() => {
  const photoSelectors = [
    'input[type="file"]',
    '[aria-label*="Photo"]',
    '[aria-label*="Foto"]',
    '[aria-label*="photo"]',
    '[aria-label*="Video"]',
    '[aria-label*="video"]',
    '[aria-label*="Image"]',
    '[aria-label*="Gambar"]',
    '[aria-label*="Add photos"]',
    '[aria-label*="Tambah foto"]',
    'button[data-testid*="photo"]',
    'button[data-testid*="media"]',
    '[data-testid*="photo"]',
    '[data-testid*="media"]',
    '[data-testid*="camera"]',
    'svg[aria-label*="Photo"]',
  ];
  const out: Array<{ sel: string; count: number; ariaLabels: string[] }> = [];
  for (const sel of photoSelectors) {
    const nodes = document.querySelectorAll(sel);
    if (nodes.length) {
      out.push({
        sel,
        count: nodes.length,
        ariaLabels: Array.from(nodes).map((n) => n.getAttribute('aria-label') ?? n.textContent?.trim().slice(0, 50) ?? '').slice(0, 5),
      });
    }
  }
  return out;
});

photoButtonDump.forEach(({ sel, count, ariaLabels }) => {
  console.log(`  "${sel}": ${count} found — labels: ${JSON.stringify(ariaLabels)}`);
});

// ── Step 7: Save full dump to file ───────────────────────────────────────────
const report = {
  timestamp: new Date().toISOString(),
  groupUrl: GROUP_URL,
  preClickElements: beforeClickDump,
  postClickElements: afterClickDump,
  photoButtons: photoButtonDump,
};
await fs.writeFile(path.join(LOGS_DIR, 'dom-dump.json'), JSON.stringify(report, null, 2));
console.log('\n💾 Full dump saved to: backend/logs/dom-dump.json');
console.log('📸 Screenshots saved to: backend/logs/');
console.log('\n🔎 Browser stays open for 30 seconds so you can inspect manually...');

await page.waitForTimeout(30000);
await browser.close();
console.log('✅ Done.');
