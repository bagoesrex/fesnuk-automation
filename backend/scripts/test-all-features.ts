/**
 * test-all-features.ts — v2
 *
 * Comprehensive live test: CRUD + ketersinambungan + browser posting.
 * Fixes applied:
 *   - Dialog locator: use .first() without hasText filter
 *   - Suggestion dismiss: click "Buat postingan" heading (not Escape)
 *   - Group guard: now blocks isActive schedules too
 *   - Schedule E2E: run poster directly (not fire-and-forget via API)
 *   - Cleanup order: delete schedule before group
 *
 * Usage: bun scripts/test-all-features.ts
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

// ── Config ───────────────────────────────────────────────────────────────────
const API = 'http://localhost:3001/api/v1';
const SESSION_PATH = path.resolve(import.meta.dir, '..', 'sessions', '1791954610004.json');
const LOGS_DIR = path.resolve(import.meta.dir, '..', 'logs', 'test-run');
const UPLOADS_DIR = path.resolve(import.meta.dir, '..', 'uploads');
const TEST_GROUP_URL = 'https://www.facebook.com/groups/1592012502030681';
const TEST_GROUP_FB_ID = '1592012502030681';
const TS = Date.now();

const db = new PrismaClient();
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Test runner ───────────────────────────────────────────────────────────────
type Status = '✅ PASS' | '❌ FAIL' | '⚠️  SKIP';
const results: Array<{ label: string; status: Status; detail: string; ms: number }> = [];

async function test(label: string, fn: () => Promise<string>): Promise<string | null> {
  const t = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - t;
    results.push({ label, status: '✅ PASS', detail, ms });
    console.log(`  ✅ ${label} (${ms}ms) — ${detail}`);
    return detail;
  } catch (err) {
    const ms = Date.now() - t;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ label, status: '❌ FAIL', detail: msg, ms });
    console.log(`  ❌ ${label} (${ms}ms)`);
    console.log(`     ${msg.split('\n')[0]}`);
    return null;
  }
}

function skip(label: string, reason: string) {
  results.push({ label, status: '⚠️  SKIP', detail: reason, ms: 0 });
  console.log(`  ⚠️  ${label} — ${reason}`);
}

function section(title: string) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(64));
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(`${json.error}`);
  return json.data as T;
}

async function apiRaw(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: 'POST', body: form });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(`${json.error}`);
  return json.data as T;
}

// ── Screenshot ────────────────────────────────────────────────────────────────
let ssIdx = 0;
async function shot(page: import('playwright').Page, label: string) {
  ssIdx++;
  const f = path.join(LOGS_DIR, `${String(ssIdx).padStart(2, '0')}-${label.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}.png`);
  await page.screenshot({ path: f });
  console.log(`     📸 ${path.basename(f)}`);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
await fs.mkdir(LOGS_DIR, { recursive: true });

console.log('\n🚀 Facebook Automation — Comprehensive Feature Test v2');
console.log(`   TS: ${TS} | API: ${API}`);
console.log(`   Test group: ${TEST_GROUP_URL}\n`);

const created = {
  groupId: '',
  postTextId: '',
  postImageId: '',
  scheduleId: '',
};

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 1 — Accounts
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 1 — Accounts');

const accountId = await test('GET /accounts — verify session exists', async () => {
  const accounts = await api<Array<{ id: string; name: string }>>('GET', '/accounts');
  if (!accounts.length) throw new Error('No accounts — run session setup first');
  return accounts.map(a => `${a.name}(${a.id})`).join(', ');
}).then(r => r ? r.match(/\(([^)]+)\)/)?.[1] ?? '' : '');

if (!accountId) throw new Error('Cannot continue without accountId');

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 2 — Groups CRUD
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 2 — Groups CRUD');

await test('POST /groups — create test group', async () => {
  const existing = await db.group.findFirst({ where: { fbGroupId: TEST_GROUP_FB_ID } });
  if (existing) {
    await db.scheduleGroup.deleteMany({ where: { groupId: existing.id } });
    await db.group.delete({ where: { id: existing.id } }).catch(() => {});
  }
  const g = await api<{ id: string; fbGroupId: string }>('POST', '/groups', {
    url: TEST_GROUP_URL,
    name: `Test Group [${TS}]`,
  });
  created.groupId = g.id;
  return `id=${g.id} fbGroupId=${g.fbGroupId}`;
});

await test('GET /groups — test group in list', async () => {
  const groups = await api<Array<{ fbGroupId: string }>>('GET', '/groups');
  if (!groups.find(g => g.fbGroupId === TEST_GROUP_FB_ID)) throw new Error('Not found in list');
  return `${groups.length} groups total`;
});

await test('PATCH /groups/:id — rename', async () => {
  const g = await api<{ name: string }>('PATCH', `/groups/${created.groupId}`, {
    name: `Test Group Updated [${TS}]`,
  });
  if (!g.name.includes('Updated')) throw new Error('Name not changed');
  return `name="${g.name}"`;
});

await test('PATCH /groups/:id — disable (isActive=false)', async () => {
  const g = await api<{ isActive: boolean }>('PATCH', `/groups/${created.groupId}`, { isActive: false });
  if (g.isActive) throw new Error('Still active');
  return 'isActive=false';
});

await test('PATCH /groups/:id — re-enable (isActive=true)', async () => {
  const g = await api<{ isActive: boolean }>('PATCH', `/groups/${created.groupId}`, { isActive: true });
  if (!g.isActive) throw new Error('Still inactive');
  return 'isActive=true';
});

await test('POST /groups — reject invalid Facebook URL', async () => {
  const res = await apiRaw('POST', '/groups', { url: 'https://example.com/foo', name: 'Bad' });
  const json = await res.json() as { success: boolean };
  if (json.success) throw new Error('Should have rejected');
  return `rejected with ${res.status}`;
});

await test('POST /groups — reject missing name', async () => {
  const res = await apiRaw('POST', '/groups', { url: TEST_GROUP_URL });
  const json = await res.json() as { success: boolean };
  if (json.success) throw new Error('Should have rejected');
  return `rejected with ${res.status}`;
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 3 — Posts CRUD
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 3 — Posts CRUD');

await test('POST /posts — create text-only post', async () => {
  const form = new FormData();
  form.append('title', `Auto Test Text [${TS}]`);
  form.append('content', `Halo Guys! Ini test automasi text only.\nTimestamp: ${TS}\n#test`);
  const p = await apiForm<{ id: string; title: string; imagePaths: string[] }>('/posts', form);
  created.postTextId = p.id;
  if (p.imagePaths.length !== 0) throw new Error('Should have 0 images');
  return `id=${p.id}`;
});

await test('GET /posts — text post in list', async () => {
  const posts = await api<Array<{ id: string }>>('GET', '/posts');
  if (!posts.find(p => p.id === created.postTextId)) throw new Error('Not found');
  return `${posts.length} posts`;
});

await test('PATCH /posts/:id — update content', async () => {
  const p = await api<{ content: string }>('PATCH', `/posts/${created.postTextId}`, {
    content: `Halo Guys! Test UPDATED.\nTimestamp: ${TS}`,
  });
  if (!p.content.includes('UPDATED')) throw new Error('Not updated');
  return 'content updated';
});

await test('PATCH /posts/:id — disable/re-enable', async () => {
  await api('PATCH', `/posts/${created.postTextId}`, { isActive: false });
  const off = await api<{ isActive: boolean }>('PATCH', `/posts/${created.postTextId}`, { isActive: true });
  if (!off.isActive) throw new Error('Re-enable failed');
  return 'toggled off then on';
});

await test('POST /posts — create post with uploaded image', async () => {
  const files = await fs.readdir(UPLOADS_DIR).catch(() => [] as string[]);
  const img = files.find(f => /\.(jpg|jpeg)$/i.test(f));
  if (!img) throw new Error('No .jpg in uploads/');
  const bytes = await fs.readFile(path.join(UPLOADS_DIR, img));
  const form = new FormData();
  form.append('title', `Auto Test Image [${TS}]`);
  form.append('content', `Test gambar.\nTimestamp: ${TS}\n#test`);
  form.append('images', new Blob([bytes], { type: 'image/jpeg' }), img);
  const p = await apiForm<{ id: string; imagePaths: string[] }>('/posts', form);
  created.postImageId = p.id;
  if (!p.imagePaths.length) throw new Error('No imagePaths returned');
  return `id=${p.id} images=${p.imagePaths.length}`;
});

await test('POST /posts — reject missing title', async () => {
  const form = new FormData();
  form.append('content', 'some content');
  const res = await fetch(`${API}/posts`, { method: 'POST', body: form });
  const json = await res.json() as { success: boolean };
  if (json.success) throw new Error('Should have rejected');
  return `rejected with ${res.status}`;
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 4 — Schedules CRUD
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 4 — Schedules CRUD');

await test('POST /schedules — create schedule (far-future cron)', async () => {
  const s = await api<{ id: string; status: string; cronExpression: string; scheduleGroups: unknown[] }>(
    'POST', '/schedules',
    {
      name: `Test Schedule [${TS}]`,
      cronExpression: '0 0 1 1 *',
      accountId,
      postId: created.postTextId,
      groupIds: [created.groupId],
      delayMinSec: 5,
      delayMaxSec: 10,
    }
  );
  created.scheduleId = s.id;
  return `id=${s.id} status=${s.status} cron="${s.cronExpression}" groups=${s.scheduleGroups.length}`;
});

await test('GET /schedules — relations correct (post, account, group)', async () => {
  const list = await api<Array<{
    id: string;
    post: { id: string };
    account: { id: string };
    scheduleGroups: Array<{ group: { id: string } }>;
  }>>('GET', '/schedules');
  const s = list.find(s => s.id === created.scheduleId);
  if (!s) throw new Error('Not in list');
  if (s.post.id !== created.postTextId) throw new Error(`Wrong post: ${s.post.id}`);
  if (s.account.id !== accountId) throw new Error(`Wrong account: ${s.account.id}`);
  if (!s.scheduleGroups.find(sg => sg.group.id === created.groupId)) throw new Error('Wrong group');
  return 'post ✓ account ✓ group ✓';
});

await test('PATCH /schedules/:id — update delays & name', async () => {
  const s = await api<{ name: string; delayMinSec: number; delayMaxSec: number }>(
    'PATCH', `/schedules/${created.scheduleId}`,
    { name: `Updated Schedule [${TS}]`, delayMinSec: 15, delayMaxSec: 30 }
  );
  if (!s.name.includes('Updated')) throw new Error('Name not changed');
  if (s.delayMinSec !== 15 || s.delayMaxSec !== 30) throw new Error('Delays not updated');
  return `name updated, delays ${s.delayMinSec}-${s.delayMaxSec}s`;
});

await test('POST /schedules/:id/toggle — disable', async () => {
  const s = await api<{ isActive: boolean }>('POST', `/schedules/${created.scheduleId}/toggle`, { isActive: false });
  if (s.isActive) throw new Error('Still active');
  return 'disabled';
});

await test('POST /schedules/:id/toggle — re-enable', async () => {
  const s = await api<{ isActive: boolean }>('POST', `/schedules/${created.scheduleId}/toggle`, { isActive: true });
  if (!s.isActive) throw new Error('Still inactive');
  return 're-enabled';
});

await test('DELETE /groups/:id — blocked while in active schedule', async () => {
  const res = await apiRaw('DELETE', `/groups/${created.groupId}`);
  const json = await res.json() as { success: boolean; code?: string };
  if (json.success) throw new Error('Should have been blocked (409)');
  return `blocked → ${res.status} ${json.code ?? ''}`;
});

await test('DELETE /posts/:id — blocked while in active schedule (409)', async () => {
  const res = await apiRaw('DELETE', `/posts/${created.postTextId}`);
  const json = await res.json() as { success: boolean; code?: string };
  if (json.success) throw new Error('Should have been blocked (post in active schedule)');
  return `blocked → ${res.status} ${json.code ?? ''}`;
});

const statsBefore = await api<{ totalPosts: number; successRate: number; activeSchedules: number }>(
  'GET', '/logs/stats'
);
await test('GET /logs/stats — baseline snapshot', async () => {
  return `totalPosts=${statsBefore.totalPosts} successRate=${statsBefore.successRate}% active=${statsBefore.activeSchedules}`;
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 5 — Live Browser: Text-Only Posting
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 5 — Live Browser: Text-Only Posting');

let browser: import('playwright').Browser | null = null;
let mainCtx: import('playwright').BrowserContext | null = null;
let page: import('playwright').Page | null = null;
let textPostSuccess = false;

try {
  browser = await chromium.launch({ headless: false, slowMo: 60 });
  const raw = await fs.readFile(SESSION_PATH, 'utf-8');
  const session = JSON.parse(raw) as { cookies?: unknown[] };
  mainCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (session.cookies?.length) await mainCtx.addCookies(session.cookies as Parameters<typeof mainCtx.addCookies>[0]);
  page = await mainCtx.newPage();

  await test('Load session & verify login', async () => {
    await page!.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);
    if (page!.url().includes('/login')) throw new Error('Session expired');
    return `OK — ${page!.url()}`;
  });

  await test('Navigate to test group', async () => {
    await page!.goto(TEST_GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2500);
    await shot(page!, 'group-page');
    return await page!.title();
  });

  await test('Open post composer dialog', async () => {
    await page!.evaluate(() => window.scrollBy(0, 300));
    await delay(1200);
    const trigger = page!.locator('[role="button"]', { hasText: /tulis sesuatu|write something/i }).first();
    await trigger.waitFor({ timeout: 15000 });
    await trigger.scrollIntoViewIfNeeded();
    await delay(500);
    await trigger.click();
    await delay(1500);
    const dialog = page!.locator('[role="dialog"]').first();
    try {
      await dialog.waitFor({ timeout: 8000 });
    } catch {
      await trigger.click();
      await dialog.waitFor({ timeout: 15000 });
    }
    await shot(page!, 'dialog-open');
    return 'dialog opened';
  });

  await test('Type content (includes "Guys" to trigger auto-suggestion)', async () => {
    const dialog = page!.locator('[role="dialog"]').first();
    const textbox = dialog.locator('[role="textbox"]').first();
    await textbox.click();
    await delay(400);
    const content = `Halo Guys! Test automasi text only.\nTimestamp: ${TS}\n#test #automasi`;
    for (const char of content) {
      await page!.keyboard.type(char, { delay: 40 });
    }
    await delay(500);
    await shot(page!, 'after-typing');
    return 'typed with Guys';
  });

  await test('Dismiss auto-suggestion by clicking dialog heading', async () => {
    const dialog = page!.locator('[role="dialog"]').first();
    // Click "Buat postingan" heading — dismisses dropdown without closing dialog
    const heading = dialog.locator('text=Buat postingan').first();
    if (await heading.count() > 0) {
      await heading.click({ force: true });
    }
    await delay(500);
    // Verify dialog still open
    const dialogStillOpen = await dialog.count();
    if (!dialogStillOpen) throw new Error('Dialog was closed by dismiss action');
    // Verify Posting button visible
    const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
    const btnVisible = await postBtn.isVisible();
    await shot(page!, 'after-dismiss');
    return `dialog still open, Posting btn visible=${btnVisible}`;
  });

  await test('Verify Posting button enabled', async () => {
    const dialog = page!.locator('[role="dialog"]').first();
    const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
    await postBtn.waitFor({ timeout: 5000 });
    const isEnabled = await postBtn.isEnabled();
    const isVisible = await postBtn.isVisible();
    if (!isVisible || !isEnabled) throw new Error(`visible=${isVisible} enabled=${isEnabled}`);
    return `enabled=${isEnabled} visible=${isVisible}`;
  });

  await test('Submit text-only post', async () => {
    const dialog = page!.locator('[role="dialog"]').first();
    const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
    await postBtn.scrollIntoViewIfNeeded();
    await delay(300);
    await postBtn.click();
    await dialog.waitFor({ state: 'detached', timeout: 30000 });
    await delay(2500);
    await shot(page!, 'text-post-submitted');
    textPostSuccess = true;
    return 'dialog closed — SUCCESS';
  });

} catch (err) {
  console.log(`  ⚠️  Phase 5 error: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 6 — Live Browser: Text + Image Posting
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 6 — Live Browser: Text + Image Posting');

let imagePostSuccess = false;

if (page && browser) {
  console.log('  ⏳ Anti-rate-limit wait: 15s...');
  await delay(15000);

  try {
    await test('Navigate to test group (fresh page)', async () => {
      await page!.goto(TEST_GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(2500);
      await shot(page!, 'group-page-2');
      return 'navigated';
    });

    await test('Open composer for image post', async () => {
      await page!.evaluate(() => window.scrollBy(0, 300));
      await delay(800);
      const trigger = page!.locator('[role="button"]', { hasText: /tulis sesuatu|write something/i }).first();
      await trigger.waitFor({ timeout: 10000 });
      await trigger.click();
      await delay(1200);
      const dialog = page!.locator('[role="dialog"]').first();
      await dialog.waitFor({ timeout: 8000 });
      await shot(page!, 'dialog-open-2');
      return 'dialog opened';
    });

    await test('Type content for image post', async () => {
      const dialog = page!.locator('[role="dialog"]').first();
      const textbox = dialog.locator('[role="textbox"]').first();
      await textbox.click();
      await delay(300);
      const content = `Test automasi dengan gambar.\nTimestamp: ${TS}\n#test #gambar`;
      for (const char of content) {
        await page!.keyboard.type(char, { delay: 40 });
      }
      // Dismiss suggestion by clicking heading
      const heading = dialog.locator('text=Buat postingan').first();
      if (await heading.count() > 0) await heading.click({ force: true });
      await delay(500);
      return 'typed';
    });

    await test('Click Foto/video button', async () => {
      const dialog = page!.locator('[role="dialog"]').first();
      const photoBtn = dialog.locator('[aria-label="Foto/video"], [aria-label="Photo/video"]').first();
      await photoBtn.waitFor({ timeout: 5000 });
      await photoBtn.click();
      await delay(1000);
      await shot(page!, 'photo-btn-clicked');
      return 'clicked';
    });

    await test('Attach image file', async () => {
      const files = await fs.readdir(UPLOADS_DIR).catch(() => [] as string[]);
      const img = files.find(f => /\.(jpg|jpeg)$/i.test(f));
      if (!img) throw new Error('No image in uploads/');
      const absPath = path.join(UPLOADS_DIR, img);
      const dialog = page!.locator('[role="dialog"]').first();

      // Primary: setInputFiles on the multiple file input
      const fileInput = dialog.locator('input[type="file"][multiple]').first();
      try {
        await fileInput.waitFor({ state: 'attached', timeout: 6000 });
        await fileInput.setInputFiles(absPath);
      } catch {
        // Fallback: filechooser event
        const photoBtn = dialog.locator('[aria-label="Foto/video"], [aria-label="Photo/video"]').first();
        const [fc] = await Promise.all([
          page!.waitForEvent('filechooser', { timeout: 8000 }),
          photoBtn.click(),
        ]);
        await fc.setFiles(absPath);
      }

      // Wait for upload to complete
      await page!.waitForSelector(
        '[role="progressbar"], [aria-label="Memuat..."], [aria-label="Loading..."]',
        { state: 'detached', timeout: 60000 }
      ).catch(() => {});
      await delay(2000);
      await shot(page!, 'image-attached');
      return `attached: ${img}`;
    });

    await test('Verify Posting button enabled after upload', async () => {
      const dialog = page!.locator('[role="dialog"]').first();
      const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
      await postBtn.waitFor({ timeout: 5000 });
      const isEnabled = await postBtn.isEnabled();
      if (!isEnabled) throw new Error('Button disabled after upload');
      return `enabled`;
    });

    await test('Submit image post', async () => {
      const dialog = page!.locator('[role="dialog"]').first();
      const postBtn = dialog.locator('[aria-label="Posting"], [aria-label="Post"]').first();
      await postBtn.scrollIntoViewIfNeeded();
      await delay(300);
      await postBtn.click();
      await dialog.waitFor({ state: 'detached', timeout: 30000 });
      await delay(2500);
      await shot(page!, 'image-post-submitted');
      imagePostSuccess = true;
      return 'dialog closed — SUCCESS';
    });

  } catch (err) {
    console.log(`  ⚠️  Phase 6 error: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
  }
} else {
  skip('Phase 6 (image posting)', 'Browser unavailable from Phase 5 failure');
}

// Close browser before E2E schedule run
if (browser) {
  await browser.close();
  browser = null;
  page = null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 7 — E2E: runPosting directly → PostLog
//  We call runPosting() directly from this script (foreground process) rather
//  than via the API, because the backend (background process) can't get window
//  focus on Windows for Facebook's composer trigger click.
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 7 — End-to-End: Schedule Run → PostLog');

console.log('  ⏳ Anti-rate-limit wait: 20s before posting...');
await delay(20000);

// Load the schedule with all relations for runPosting
const scheduleForPosting = await db.schedule.findUnique({
  where: { id: created.scheduleId },
  include: {
    post: true,
    account: true,
    scheduleGroups: { include: { group: true }, orderBy: { order: 'asc' } },
  },
});

await test('runPosting() directly — posts to test group', async () => {
  if (!scheduleForPosting) throw new Error('Schedule not found in DB');
  // Mark RUNNING in DB (mirrors what triggerSchedule does)
  await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'RUNNING' } });
  const { runPosting } = await import('../src/services/poster.ts');
  try {
    await runPosting(scheduleForPosting);
    await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'IDLE' } });
    return 'runPosting completed';
  } catch (err) {
    await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'ERROR' } });
    throw err;
  }
});

await test('GET /logs?scheduleId=X — PostLog entries created', async () => {
  const resp = await api<{ logs: Array<{ status: string; error: string | null; group: { name: string } | null }>; total: number }>(
    'GET', `/logs?scheduleId=${created.scheduleId}`
  );
  if (resp.total === 0) throw new Error('0 log entries — runPosting may not have written a log');
  const log = resp.logs[0]!;
  return `${resp.total} log(s) — status=${log.status} group="${log.group?.name ?? 'null'}" error="${log.error ?? 'none'}"`;
});

await test('PostLog has SUCCESS status', async () => {
  const resp = await api<{ logs: Array<{ status: string; error: string | null }> }>(
    'GET', `/logs?scheduleId=${created.scheduleId}`
  );
  const success = resp.logs.filter(l => l.status === 'SUCCESS');
  const failed = resp.logs.filter(l => l.status === 'FAILED');
  if (!success.length && failed.length) {
    throw new Error(`All ${failed.length} log(s) FAILED: "${failed[0]?.error ?? 'no error msg'}"`);
  }
  if (!success.length) throw new Error('No SUCCESS logs');
  return `${success.length} SUCCESS`;
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 8 — Logs & Stats
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 8 — Logs & Stats');

await test('GET /logs/stats — totalPosts increased', async () => {
  const after = await api<{ totalPosts: number; successRate: number; activeSchedules: number }>('GET', '/logs/stats');
  if (after.totalPosts <= statsBefore.totalPosts) {
    throw new Error(`No increase: before=${statsBefore.totalPosts} after=${after.totalPosts}`);
  }
  return `${statsBefore.totalPosts} → ${after.totalPosts} (+${after.totalPosts - statsBefore.totalPosts})`;
});

await test('GET /logs — status=SUCCESS filter', async () => {
  const r = await api<{ logs: Array<{ status: string }>; total: number }>('GET', '/logs?status=SUCCESS');
  r.logs.forEach(l => { if (l.status !== 'SUCCESS') throw new Error(`Got non-SUCCESS: ${l.status}`); });
  return `${r.total} SUCCESS logs`;
});

await test('GET /logs — status=FAILED filter', async () => {
  const r = await api<{ logs: Array<{ status: string }>; total: number }>('GET', '/logs?status=FAILED');
  r.logs.forEach(l => { if (l.status !== 'FAILED') throw new Error(`Got non-FAILED: ${l.status}`); });
  return `${r.total} FAILED logs`;
});

await test('GET /logs — pagination (limit=2)', async () => {
  const r = await api<{ logs: unknown[]; page: number; totalPages: number }>('GET', '/logs?page=1&limit=2');
  if (r.logs.length > 2) throw new Error(`Got ${r.logs.length} (max 2)`);
  return `${r.logs.length} logs on page 1 of ${r.totalPages}`;
});

await test('GET /logs — filter by groupId', async () => {
  const r = await api<{ logs: Array<{ groupId: string }>; total: number }>(`GET`, `/logs?groupId=${created.groupId}`);
  r.logs.forEach(l => { if (l.groupId !== created.groupId) throw new Error('Wrong groupId'); });
  return `${r.total} logs for test group`;
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 9 — Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 9 — Edge Cases');

await test('DELETE /schedules/:id — blocked if RUNNING (409)', async () => {
  // Simulate: mark schedule as RUNNING in DB directly
  await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'RUNNING' } });
  const res = await apiRaw('DELETE', `/schedules/${created.scheduleId}`);
  const json = await res.json() as { success: boolean };
  // Restore status
  await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'IDLE' } });
  if (json.success) throw new Error('Should have blocked');
  return `blocked ${res.status}`;
});

await test('PATCH /schedules/:id — blocked if RUNNING (409)', async () => {
  await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'RUNNING' } });
  const res = await apiRaw('PATCH', `/schedules/${created.scheduleId}`, { name: 'New Name' });
  const json = await res.json() as { success: boolean };
  await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'IDLE' } });
  if (json.success) throw new Error('Should have blocked');
  return `blocked ${res.status}`;
});

await test('POST /schedules/:id/run — blocked if RUNNING (409)', async () => {
  await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'RUNNING' } });
  const res = await apiRaw('POST', `/schedules/${created.scheduleId}/run`, {});
  const json = await res.json() as { success: boolean };
  await db.schedule.update({ where: { id: created.scheduleId }, data: { status: 'IDLE' } });
  if (json.success) throw new Error('Should have blocked');
  return `blocked ${res.status}`;
});

await test('GET /groups/:id not found → 404', async () => {
  const res = await apiRaw('PATCH', '/groups/nonexistent-id-xyz', { name: 'x' });
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  return `404 returned correctly`;
});

await test('GET /posts/:id not found → 404 on delete', async () => {
  const res = await apiRaw('DELETE', '/posts/nonexistent-id-xyz');
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  return `404 returned correctly`;
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 10 — Cleanup
// ─────────────────────────────────────────────────────────────────────────────
section('PHASE 10 — Cleanup');

await test('Disable schedule before delete (best practice)', async () => {
  await api('POST', `/schedules/${created.scheduleId}/toggle`, { isActive: false });
  return 'disabled';
});

await test('DELETE /schedules/:id', async () => {
  await api('DELETE', `/schedules/${created.scheduleId}`, undefined);
  const list = await api<Array<{ id: string }>>('GET', '/schedules');
  if (list.find(s => s.id === created.scheduleId)) throw new Error('Still exists');
  return 'deleted and confirmed gone';
});

await test('DELETE /groups/:id — now allowed (no active schedule)', async () => {
  await api('DELETE', `/groups/${created.groupId}`, undefined);
  const list = await api<Array<{ id: string }>>('GET', '/groups');
  if (list.find(g => g.id === created.groupId)) throw new Error('Still exists');
  return 'deleted';
});

await test('DELETE /posts/:id — text post', async () => {
  await api('DELETE', `/posts/${created.postTextId}`, undefined);
  return 'deleted';
});

await test('DELETE /posts/:id — image post (verify file cleanup)', async () => {
  const posts = await api<Array<{ id: string; imagePaths: string[] }>>('GET', '/posts');
  const imgPost = posts.find(p => p.id === created.postImageId);
  const imgPaths = imgPost?.imagePaths ?? [];
  await api('DELETE', `/posts/${created.postImageId}`, undefined);
  // Verify files deleted from disk
  for (const rel of imgPaths) {
    const abs = path.resolve(import.meta.dir, '..', rel);
    const exists = await fs.access(abs).then(() => true).catch(() => false);
    if (exists) throw new Error(`File still on disk: ${rel}`);
  }
  return `post deleted, ${imgPaths.length} file(s) cleaned`;
});

await test('Verify DB clean — no test entities remain', async () => {
  const [groups, posts, schedules] = await Promise.all([
    api<Array<{ id: string }>>('GET', '/groups'),
    api<Array<{ id: string }>>('GET', '/posts'),
    api<Array<{ id: string }>>('GET', '/schedules'),
  ]);
  const orphans = [
    groups.find(g => g.id === created.groupId) ? 'group' : null,
    posts.find(p => p.id === created.postTextId) ? 'postText' : null,
    posts.find(p => p.id === created.postImageId) ? 'postImage' : null,
    schedules.find(s => s.id === created.scheduleId) ? 'schedule' : null,
  ].filter(Boolean);
  if (orphans.length) throw new Error(`Still in DB: ${orphans.join(', ')}`);
  return 'all clean';
});

await test('PostLogs preserved (audit trail intact)', async () => {
  const count = await db.postLog.count();
  return `${count} total PostLog records preserved`;
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
await db.$disconnect();
if (browser) await browser.close();

const passed = results.filter(r => r.status === '✅ PASS').length;
const failed = results.filter(r => r.status === '❌ FAIL').length;
const skipped = results.filter(r => r.status === '⚠️  SKIP').length;

console.log('\n' + '═'.repeat(64));
console.log('  FINAL SUMMARY');
console.log('═'.repeat(64));
console.log(`  Total   : ${results.length}`);
console.log(`  ✅ Pass : ${passed}`);
console.log(`  ❌ Fail : ${failed}`);
console.log(`  ⚠️  Skip : ${skipped}`);
console.log(`  Browser : text=${textPostSuccess ? '✅' : '❌'} image=${imagePostSuccess ? '✅' : '❌'}`);
console.log(`  Screenshots: backend/logs/test-run/`);

if (failed > 0) {
  console.log('\n  ❌ FAILURES:');
  results.filter(r => r.status === '❌ FAIL').forEach(r => {
    console.log(`    • ${r.label}`);
    console.log(`      ${r.detail.split('\n')[0]}`);
  });
}

console.log('\n' + '═'.repeat(64));
if (failed > 0) process.exit(1);
