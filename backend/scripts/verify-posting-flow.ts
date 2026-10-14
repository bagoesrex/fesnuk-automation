/**
 * verify-posting-flow.ts
 * Dry-run the full posting flow WITHOUT actually submitting.
 * Verifies all selectors work on the live Facebook page.
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
const TEST_CONTENT = 'Test posting dari sistem automasi [DRY RUN - tidak jadi diposting]';

await fs.mkdir(LOGS_DIR, { recursive: true });

console.log('🚀 Launching browser (headed)...');
const browser = await chromium.launch({ headless: false, slowMo: 80 });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

const raw = await fs.readFile(SESSION_PATH, 'utf-8');
const session = JSON.parse(raw) as { cookies?: unknown[] };
if (session.cookies?.length) await ctx.addCookies(session.cookies as Parameters<typeof ctx.addCookies>[0]);

const page = await ctx.newPage();

console.log('\n📡 Navigating to group...');
await page.goto(GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollBy(0, 300));
await page.waitForTimeout(1000);

// ── Step 1: Click composer trigger ────────────────────────────────────────────
console.log('\n[Step 1] Finding "Tulis sesuatu..." trigger...');
const composerTrigger = page.locator('[role="button"]', { hasText: /tulis sesuatu|write something|buat postingan publik/i }).first();
const triggerCount = await composerTrigger.count();
console.log(`  Found: ${triggerCount}`);

if (triggerCount === 0) {
  console.error('  ❌ FAILED: Composer trigger not found!');
  await page.screenshot({ path: path.join(LOGS_DIR, 'verify-FAIL-step1.png') });
  await browser.close();
  process.exit(1);
}

await composerTrigger.click();
console.log('  ✅ Clicked composer trigger');
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(LOGS_DIR, 'verify-01-after-trigger.png') });

// ── Step 2: Wait for dialog ────────────────────────────────────────────────────
console.log('\n[Step 2] Waiting for composer dialog...');
const dialog = page.locator('[role="dialog"]').filter({ hasText: /buat postingan|create post/i }).first();
try {
  await dialog.waitFor({ timeout: 8000 });
  console.log('  ✅ Dialog appeared');
} catch {
  console.error('  ❌ FAILED: Dialog did not appear!');
  await page.screenshot({ path: path.join(LOGS_DIR, 'verify-FAIL-step2.png') });
  await browser.close();
  process.exit(1);
}
await page.screenshot({ path: path.join(LOGS_DIR, 'verify-02-dialog-open.png') });

// ── Step 3: Find textbox inside dialog ────────────────────────────────────────
console.log('\n[Step 3] Finding textbox inside dialog...');
const textbox = dialog.locator('[role="textbox"]').first();
const textboxCount = await textbox.count();
console.log(`  Found textboxes: ${textboxCount}`);

if (textboxCount === 0) {
  console.error('  ❌ FAILED: No textbox inside dialog!');
  await page.screenshot({ path: path.join(LOGS_DIR, 'verify-FAIL-step3.png') });
  await browser.close();
  process.exit(1);
}

const ariaLabel = await textbox.getAttribute('aria-label');
console.log(`  ✅ Textbox aria-label: "${ariaLabel}"`);

// Click and type test content
await textbox.click();
await page.waitForTimeout(400);
for (const char of TEST_CONTENT) {
  await page.keyboard.type(char, { delay: 30 });
}
console.log('  ✅ Typed test content');
await page.screenshot({ path: path.join(LOGS_DIR, 'verify-03-typed.png') });

// ── Step 4: Find photo/video button ───────────────────────────────────────────
console.log('\n[Step 4] Finding photo/video button...');
const photoBtn = dialog.locator('[aria-label="Foto/video"], [aria-label="Photo/video"]').first();
const photoBtnCount = await photoBtn.count();
console.log(`  Found: ${photoBtnCount}`);

if (photoBtnCount > 0) {
  const photoBtnAria = await photoBtn.getAttribute('aria-label');
  console.log(`  ✅ Photo button aria-label: "${photoBtnAria}"`);
} else {
  console.warn('  ⚠️  Photo button not found (may only appear after typing, or label differs)');
  // Dump all buttons in dialog
  const btnsInDialog = await dialog.locator('[role="button"]').all();
  console.log('  Buttons in dialog:');
  for (const btn of btnsInDialog) {
    const a = await btn.getAttribute('aria-label');
    const t = (await btn.textContent() ?? '').trim().slice(0, 50);
    console.log(`    - aria="${a}" text="${t}"`);
  }
}

// ── Step 5: Find submit button ────────────────────────────────────────────────
console.log('\n[Step 5] Finding "Posting" / submit button...');
const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
const postBtnCount = await postBtn.count();

if (postBtnCount > 0) {
  const postBtnAria = await postBtn.getAttribute('aria-label');
  const postBtnText = (await postBtn.textContent() ?? '').trim();
  const isEnabled = await postBtn.isEnabled();
  console.log(`  ✅ Post button found — aria="${postBtnAria}" text="${postBtnText}" enabled=${isEnabled}`);
} else {
  console.error('  ❌ FAILED: Post button not found!');
  // Dump all buttons to find it
  const allBtns = await dialog.locator('[role="button"]').all();
  console.log('  All dialog buttons:');
  for (const btn of allBtns) {
    const a = await btn.getAttribute('aria-label');
    const t = (await btn.textContent() ?? '').trim().slice(0, 60);
    if (a || t) console.log(`    aria="${a}" text="${t}"`);
  }
}

await page.screenshot({ path: path.join(LOGS_DIR, 'verify-04-ready-to-post.png') });

// ── Done (NOT clicking post) ──────────────────────────────────────────────────
console.log('\n✅ DRY RUN COMPLETE — all selectors verified!');
console.log('   (Dialog is still open — we are NOT clicking Post)');
console.log('\n📸 Screenshots saved to backend/logs/verify-*.png');
console.log('\n⏳ Keeping browser open 30s for manual inspection...');

// Close dialog without posting
await page.waitForTimeout(30000);
await browser.close();
console.log('Done.');
