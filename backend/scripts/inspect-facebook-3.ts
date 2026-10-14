/**
 * inspect-facebook-3.ts
 * Click "Tulis sesuatu..." and wait properly for the modal to appear,
 * then dump everything inside the modal/composer.
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

console.log('🚀 Launching browser...');
const browser = await chromium.launch({ headless: false, slowMo: 50 });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

const raw = await fs.readFile(SESSION_PATH, 'utf-8');
const session = JSON.parse(raw) as { cookies?: unknown[] };
if (session.cookies?.length) await ctx.addCookies(session.cookies as Parameters<typeof ctx.addCookies>[0]);

const page = await ctx.newPage();
await page.goto(GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(LOGS_DIR, '05-group-before.png') });

// ── Click "Tulis sesuatu..." using Playwright locator ───────────────────────
console.log('\n🖱️  Clicking "Tulis sesuatu..." button...');

// The button has text "Tulis sesuatu..." — find it
const composerButton = page.locator('[role="button"]', { hasText: 'Tulis sesuatu' }).first();
const count = await composerButton.count();
console.log(`Found ${count} matching buttons`);

if (count > 0) {
  await composerButton.click();
  console.log('Clicked!');
} else {
  // Fallback: click the area
  await page.locator('text=Tulis sesuatu').first().click();
}

// Wait up to 5 seconds for modal to appear
console.log('Waiting for modal...');
let modalFound = false;
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(500);
  const dialogs = await page.locator('[role="dialog"]').count();
  const hasComposer = await page.locator('[data-lexical-editor="true"]').count();
  console.log(`  [${i * 0.5}s] dialogs=${dialogs}, lexical editors=${hasComposer}`);
  if (dialogs > 0 || hasComposer > 1) {
    modalFound = true;
    break;
  }
  await page.screenshot({ path: path.join(LOGS_DIR, `06-wait-${i}.png`) });
}

await page.screenshot({ path: path.join(LOGS_DIR, '07-after-wait.png') });
console.log(`\nModal found: ${modalFound}`);

// ── Dump the full page state ─────────────────────────────────────────────────
console.log('\n🔍 Full page dump after click...');

const fullDump = await page.evaluate(() => {
  const results: Array<{
    tag: string; role: string | null; ariaLabel: string | null;
    text: string; ce: string | null; type: string | null;
    lexical: string | null; testId: string | null;
    placeholder: string | null; ariaPlaceholder: string | null;
    y: number; visible: boolean;
  }> = [];

  // Get everything interactive
  const selectors = [
    '[role="dialog"]', '[role="textbox"]', '[contenteditable="true"]',
    '[data-lexical-editor]', 'input[type="file"]', '[role="button"]',
    'button', 'textarea', '[aria-placeholder]',
  ];

  const seen = new Set<Element>();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 100);
      results.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        text,
        ce: el.getAttribute('contenteditable'),
        type: el.getAttribute('type'),
        lexical: el.getAttribute('data-lexical-editor'),
        testId: el.getAttribute('data-testid'),
        placeholder: el.getAttribute('placeholder'),
        ariaPlaceholder: el.getAttribute('aria-placeholder'),
        y: Math.round(rect.top),
        visible: rect.width > 0 && rect.height > 0,
      });
    });
  }
  return results;
});

console.log('\n=== FULL PAGE DUMP (sorted by Y) ===');
fullDump.sort((a, b) => a.y - b.y).forEach((el, i) => {
  if (!el.visible && !el.lexical && el.type !== 'file') return; // skip invisible non-special
  console.log(`[${i}] y=${el.y} <${el.tag}> role=${el.role} aria="${el.ariaLabel}" ce=${el.ce} lexical=${el.lexical} type=${el.type} placeholder="${el.placeholder ?? el.ariaPlaceholder}"`);
  if (el.text) console.log(`     text: "${el.text}"`);
});

// ── Now look specifically for ALL file inputs and their surrounding buttons ──
console.log('\n📷 All file inputs and nearby elements:');
const fileInputInfo = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('input[type="file"]')).map((el) => {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement;
    const grandParent = parent?.parentElement;
    return {
      accept: el.getAttribute('accept'),
      multiple: el.getAttribute('multiple'),
      visible: rect.width > 0 && rect.height > 0,
      y: Math.round(rect.top),
      parentTag: parent?.tagName,
      parentRole: parent?.getAttribute('role'),
      parentAria: parent?.getAttribute('aria-label'),
      grandRole: grandParent?.getAttribute('role'),
      grandAria: grandParent?.getAttribute('aria-label'),
      grandText: grandParent?.textContent?.trim().slice(0, 60),
    };
  });
});
fileInputInfo.forEach((fi, i) => {
  console.log(`[${i}] input[file] y=${fi.y} visible=${fi.visible} accept="${fi.accept}" multiple=${fi.multiple}`);
  console.log(`     parent: <${fi.parentTag}> role=${fi.parentRole} aria="${fi.parentAria}"`);
  console.log(`     grand: role=${fi.grandRole} aria="${fi.grandAria}" text="${fi.grandText}"`);
});

// ── Save everything ──────────────────────────────────────────────────────────
await fs.writeFile(path.join(LOGS_DIR, 'dom-dump-3.json'), JSON.stringify({ fullDump, fileInputInfo, modalFound }, null, 2));
console.log('\n💾 Saved: backend/logs/dom-dump-3.json');
console.log('\n⏳ Keeping browser open 60s...');
await page.waitForTimeout(60000);
await browser.close();
