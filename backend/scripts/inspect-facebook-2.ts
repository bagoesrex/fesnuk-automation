/**
 * inspect-facebook-2.ts
 * Deeper inspection - find the "Create Post" button/area in a Facebook group,
 * open the composer modal, then dump the real composer DOM.
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
const browser = await chromium.launch({ headless: false, slowMo: 80 });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

const raw = await fs.readFile(SESSION_PATH, 'utf-8');
const session = JSON.parse(raw) as { cookies?: unknown[] };
if (session.cookies?.length) await ctx.addCookies(session.cookies as Parameters<typeof ctx.addCookies>[0]);

const page = await ctx.newPage();
await page.goto(GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);

// ── Find ALL buttons and clickable divs ───────────────────────────────────────
console.log('\n🔍 Scanning ALL buttons and role=button elements...');

const allButtons = await page.evaluate(() => {
  const results: Array<{ tag: string; ariaLabel: string | null; text: string; testId: string | null; isVisible: boolean }> = [];
  document.querySelectorAll('[role="button"], button').forEach((el) => {
    const rect = el.getBoundingClientRect();
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const ariaLabel = el.getAttribute('aria-label');
    if (text || ariaLabel) {
      results.push({
        tag: el.tagName.toLowerCase(),
        ariaLabel,
        text,
        testId: el.getAttribute('data-testid'),
        isVisible: rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight,
      });
    }
  });
  return results;
});

console.log('\n=== ALL VISIBLE BUTTONS ===');
allButtons.filter((b) => b.isVisible).forEach((b, i) => {
  console.log(`[${i}] <${b.tag}> aria="${b.ariaLabel}" text="${b.text}" testid="${b.testId}"`);
});

// ── Find text that looks like "Create Post" in Indonesian ─────────────────────
console.log('\n\n🔍 Looking for "Buat postingan" / create post trigger...');
const createPostElements = await page.evaluate(() => {
  const keywords = [
    'buat postingan', 'create post', 'tulis sesuatu', 'write something',
    'apa yang sedang', 'what\'s on your mind', 'bagikan sesuatu',
    'mulai postingan', 'start a post', 'di pikiranmu', 'ada apa',
  ];
  const found: Array<{ tag: string; ariaLabel: string | null; text: string; rect: { top: number; left: number; width: number; height: number } }> = [];
  document.querySelectorAll('*').forEach((el) => {
    const text = (el.textContent ?? '').trim().toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') ?? '').toLowerCase();
    for (const kw of keywords) {
      if ((text === kw || ariaLabel.includes(kw)) && (el as HTMLElement).offsetParent !== null) {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width > 50) {
          found.push({
            tag: el.tagName.toLowerCase(),
            ariaLabel: el.getAttribute('aria-label'),
            text: (el.textContent ?? '').trim().slice(0, 100),
            rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
          });
        }
        break;
      }
    }
  });
  return found;
});

console.log('\n=== CREATE POST TRIGGERS ===');
createPostElements.forEach((el, i) => {
  console.log(`[${i}] <${el.tag}> aria="${el.ariaLabel}" text="${el.text}" rect=${JSON.stringify(el.rect)}`);
});

// ── Click the create post trigger ─────────────────────────────────────────────
console.log('\n\n🖱️  Clicking create post area...');

// Indonesian Facebook: look for "Buat postingan" button or the top-of-feed composer
const clicked = await page.evaluate(() => {
  // Strategy 1: Find by aria-label containing create/buat
  const ariaSelectors = [
    '[aria-label*="Buat postingan"]',
    '[aria-label*="Create post"]',
    '[aria-label*="Tulis sesuatu"]',
    '[aria-label*="Write something"]',
    '[aria-label*="Mulai postingan"]',
    '[aria-label*="Start a post"]',
    '[aria-label*="di pikiranmu"]',
    '[aria-label*="on your mind"]',
  ];
  for (const sel of ariaSelectors) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el && el.offsetParent !== null) {
      el.click();
      return `clicked aria: ${sel}`;
    }
  }

  // Strategy 2: Find by text content
  const allEls = Array.from(document.querySelectorAll('[role="button"], button, div[tabindex="0"]'));
  for (const el of allEls) {
    const text = (el.textContent ?? '').trim().toLowerCase();
    if (text.includes('buat postingan') || text.includes('create post') || text.includes('mulai postingan')) {
      (el as HTMLElement).click();
      return `clicked text: "${text.slice(0, 50)}"`;
    }
  }

  // Strategy 3: The composer placeholder at top of feed — click the parent card
  const placeholderDivs = Array.from(document.querySelectorAll('div, span'));
  for (const el of placeholderDivs) {
    const text = (el.textContent ?? '').trim();
    if (
      (text === 'Buat postingan' || text === 'Tulis sesuatu...' || text === 'What\'s on your mind?' || text === 'Mulai postingan') &&
      (el as HTMLElement).offsetWidth > 100
    ) {
      (el as HTMLElement).click();
      return `clicked placeholder text: "${text}"`;
    }
  }

  return 'nothing clicked';
});

console.log('Result:', clicked);
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(LOGS_DIR, '04-after-create-post-click.png') });
console.log('📸 Screenshot: 04-after-create-post-click.png');

// ── Dump all dialogs/modals that may have appeared ───────────────────────────
console.log('\n🔍 Checking for dialog/modal after click...');
const dialogDump = await page.evaluate(() => {
  const out: Array<{
    role: string | null; ariaLabel: string | null; ariaModal: string | null;
    id: string | null; dataTestId: string | null; isVisible: boolean; childCount: number;
  }> = [];
  document.querySelectorAll('[role="dialog"], [role="modal"], [aria-modal="true"]').forEach((el) => {
    const rect = (el as HTMLElement).getBoundingClientRect();
    out.push({
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      ariaModal: el.getAttribute('aria-modal'),
      id: el.id || null,
      dataTestId: el.getAttribute('data-testid'),
      isVisible: rect.width > 0 && rect.height > 0,
      childCount: el.childElementCount,
    });
  });
  return out;
});
console.log('Dialogs found:', JSON.stringify(dialogDump, null, 2));

// ── Full DOM dump inside any dialog ──────────────────────────────────────────
const dialogInnerDump = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return null;

  const elements: Array<{ tag: string; role: string | null; ariaLabel: string | null; text: string; contentEditable: string | null; type: string | null; testId: string | null; dataLexical: string | null }> = [];
  dialog.querySelectorAll('*').forEach((el) => {
    const role = el.getAttribute('role');
    const ariaLabel = el.getAttribute('aria-label');
    const ce = el.getAttribute('contenteditable');
    const type = el.getAttribute('type');
    const testId = el.getAttribute('data-testid');
    const lexical = el.getAttribute('data-lexical-editor');
    if (role || ariaLabel || ce || (type === 'file') || lexical) {
      elements.push({
        tag: el.tagName.toLowerCase(),
        role, ariaLabel,
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
        contentEditable: ce,
        type,
        testId,
        dataLexical: lexical,
      });
    }
  });
  return elements;
});

if (dialogInnerDump) {
  console.log('\n=== DIALOG INNER ELEMENTS ===');
  dialogInnerDump.forEach((el, i) => {
    console.log(`[${i}] <${el.tag}> role=${el.role} aria="${el.ariaLabel}" ce=${el.contentEditable} type=${el.type} lexical=${el.dataLexical} testid=${el.testId}`);
    if (el.text) console.log(`     text: "${el.text}"`);
  });
} else {
  console.log('No dialog found — composer may be inline (not in a modal)');

  // Dump the top portion of the page — look for inline composer
  const inlineDump = await page.evaluate(() => {
    const out: Array<{ tag: string; role: string | null; ariaLabel: string | null; ce: string | null; type: string | null; lexical: string | null; text: string; y: number }> = [];
    document.querySelectorAll('[contenteditable], [data-lexical-editor], [role="textbox"], input[type="file"]').forEach((el) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      out.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ce: el.getAttribute('contenteditable'),
        type: el.getAttribute('type'),
        lexical: el.getAttribute('data-lexical-editor'),
        text: (el.textContent ?? '').trim().slice(0, 80),
        y: Math.round(rect.top),
      });
    });
    return out.sort((a, b) => a.y - b.y);
  });

  console.log('\n=== INLINE COMPOSER CANDIDATES ===');
  inlineDump.forEach((el, i) => {
    console.log(`[${i}] y=${el.y} <${el.tag}> role=${el.role} aria="${el.ariaLabel}" ce=${el.ce} lexical=${el.lexical} type=${el.type}`);
    if (el.text) console.log(`     text: "${el.text}"`);
  });
}

// Save full dump
const report2 = { dialogDump, dialogInnerDump, allButtons, createPostElements };
await fs.writeFile(path.join(LOGS_DIR, 'dom-dump-2.json'), JSON.stringify(report2, null, 2));
console.log('\n💾 Saved: backend/logs/dom-dump-2.json');
console.log('\n⏳ Keeping browser open 45s for manual inspection...');
await page.waitForTimeout(45000);
await browser.close();
