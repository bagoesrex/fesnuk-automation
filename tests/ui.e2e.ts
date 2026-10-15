// Frontend UI tests — requires both backend (port 3001) and frontend (port 5173) running

import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import db from '../backend/src/config/db.ts';

// ── Dashboard ─────────────────────────────────────────────────────────────────

test('dashboard shows stat cards', async ({ app, screen }) => {
  await app.open('/');
  await expect(screen.getByRole('heading', 'Dashboard')).toBeVisible();
  await expect(screen.getByText('Total Posts')).toBeVisible();
  await expect(screen.getByText('Success Rate')).toBeVisible();
  await expect(screen.getByText('Active Schedules')).toBeVisible();
  await expect(screen.getByText('Active Groups')).toBeVisible();
});

test('dashboard shows quick start guide', async ({ app, screen }) => {
  await app.open('/');
  await expect(screen.getByText('Quick Start')).toBeVisible();
  // check the numbered list exists (5 steps), use count to avoid ambiguous text matching
  await expect(screen.getByRole('listitem').first()).toBeVisible();
});

// ── Sidebar navigation ────────────────────────────────────────────────────────

test('sidebar has all nav links', async ({ app, screen }) => {
  await app.open('/');
  await expect(screen.getByRole('link', 'Dashboard')).toBeVisible();
  await expect(screen.getByRole('link', 'Groups')).toBeVisible();
  await expect(screen.getByRole('link', 'Posts')).toBeVisible();
  await expect(screen.getByRole('link', 'Schedules')).toBeVisible();
  await expect(screen.getByRole('link', 'Logs')).toBeVisible();
  await expect(screen.getByRole('link', 'Session')).toBeVisible();
});

test('sidebar navigates to Groups page', async ({ app, screen }) => {
  await app.open('/');
  await screen.getByRole('link', 'Groups').tap();
  await expect(screen.getByRole('heading', 'Groups')).toBeVisible();
});

test('sidebar navigates to Posts page', async ({ app, screen }) => {
  await app.open('/');
  await screen.getByRole('link', 'Posts').tap();
  await expect(screen.getByRole('heading', 'Posts')).toBeVisible();
});

test('sidebar navigates to Schedules page', async ({ app, screen }) => {
  await app.open('/');
  await screen.getByRole('link', 'Schedules').tap();
  await expect(screen.getByRole('heading', 'Schedules')).toBeVisible();
});

test('sidebar navigates to Logs page', async ({ app, screen }) => {
  await app.open('/');
  await screen.getByRole('link', 'Logs').tap();
  await expect(screen.getByRole('heading', 'Logs')).toBeVisible();
});

test('sidebar navigates to Session page', async ({ app, screen }) => {
  await app.open('/');
  await screen.getByRole('link', 'Session').tap();
  await expect(screen.getByRole('heading', 'Session Setup')).toBeVisible();
});

// ── Groups page ───────────────────────────────────────────────────────────────

test('groups page shows Sync and Add buttons', async ({ app, screen }) => {
  await app.open('/groups');
  // Buttons have "↻ Sync from Facebook" and "+ Add Manually" — use partial match
  await expect(screen.getByRole('button', 'Sync from Facebook', { exact: false })).toBeVisible();
  await expect(screen.getByRole('button', 'Add Manually', { exact: false })).toBeVisible();
});

test('groups page shows table', async ({ app, screen }) => {
  await app.open('/groups');
  await expect(screen.getByRole('table')).toBeVisible();
});

test('groups - Add Manually modal opens and closes', async ({ app, screen }) => {
  await app.open('/groups');
  await screen.getByRole('button', 'Add Manually', { exact: false }).tap();
  await expect(screen.getByText('Add Group Manually')).toBeVisible();
  await screen.getByRole('button', 'Cancel').tap();
  await expect(screen.getByText('Add Group Manually')).toBeHidden();
});

test('groups - Add Manually form has required fields', async ({ app, screen }) => {
  await app.open('/groups');
  await screen.getByRole('button', 'Add Manually', { exact: false }).tap();
  await expect(screen.getByPlaceholder('My Facebook Group')).toBeVisible();
  await expect(screen.getByPlaceholder('https://www.facebook.com/groups/123456789')).toBeVisible();
  await screen.getByRole('button', 'Cancel').tap();
});

test('groups - Sync modal opens and shows account selector', async ({ app, screen }) => {
  await app.open('/groups');
  await screen.getByRole('button', 'Sync from Facebook', { exact: false }).tap();
  await expect(screen.getByText('Sync Groups from Facebook')).toBeVisible();
  await screen.getByRole('button', 'Cancel').tap();
});

test('groups - can create and delete a group manually', async ({ app, screen, browser }) => {
  const name = `E2E Group ${Date.now()}`;
  const url = `https://www.facebook.com/groups/e2e${Date.now()}`;

  await app.open('/groups');
  const before = await screen.getByRole('button', 'Delete').count();

  await screen.getByRole('button', 'Add Manually', { exact: false }).tap();
  await screen.getByPlaceholder('My Facebook Group').fill(name);
  await screen.getByPlaceholder('https://www.facebook.com/groups/123456789').fill(url);
  await screen.getByRole('button', 'Add Group').tap();

  await expect(screen.getByRole('button', 'Delete')).toHaveCount(before + 1);
  await expect(screen.getByText(name)).toBeVisible();

  await browser.onDialog('accept');
  await screen.getByRole('button', 'Delete').first().tap();

  await expect(screen.getByRole('button', 'Delete')).toHaveCount(before);
});

// ── Posts page ────────────────────────────────────────────────────────────────

test('posts page shows Create Post button', async ({ app, screen }) => {
  await app.open('/posts');
  await expect(screen.getByRole('button', 'Create Post', { exact: false })).toBeVisible();
});

test('posts - Create Post modal opens with all fields', async ({ app, screen }) => {
  await app.open('/posts');
  await screen.getByRole('button', 'Create Post', { exact: false }).tap();
  // once modal opens, check for the modal heading specifically
  await expect(screen.getByRole('heading', 'Create Post')).toBeVisible();
  await expect(screen.getByPlaceholder('e.g. Promo Oktober')).toBeVisible();
  await expect(screen.getByPlaceholder('Write your post content here...')).toBeVisible();
  await screen.getByRole('button', 'Cancel').tap();
});

test('posts - can create and delete a post', async ({ app, screen, browser }) => {
  const title = `E2E Post ${Date.now()}`;

  await app.open('/posts');

  // count posts before
  const before = await screen.getByRole('button', 'Delete').count();

  await screen.getByRole('button', 'Create Post', { exact: false }).tap();
  await screen.getByPlaceholder('e.g. Promo Oktober').fill(title);
  await screen.getByPlaceholder('Write your post content here...').fill('Content from e2e UI test');
  await screen.getByRole('button', 'Create Post').last().tap();

  // post count increased by 1
  await expect(screen.getByRole('button', 'Delete')).toHaveCount(before + 1);

  // delete the newest post (first in list = most recent)
  await browser.onDialog('accept');
  await screen.getByRole('button', 'Delete').first().tap();

  // count back to original
  await expect(screen.getByRole('button', 'Delete')).toHaveCount(before);
});

// ── Schedules page ────────────────────────────────────────────────────────────

test('schedules page shows New Schedule button', async ({ app, screen }) => {
  await app.open('/schedules');
  await expect(screen.getByRole('button', 'New Schedule', { exact: false })).toBeVisible();
});

test('schedules page shows table columns', async ({ app, screen }) => {
  await app.open('/schedules');
  await expect(screen.getByRole('heading', 'Schedules')).toBeVisible();
  // scope column headers inside the table to avoid sidebar ambiguity
  const table = screen.getByRole('table');
  await expect(table.getByRole('columnheader', 'Name')).toBeVisible();
  await expect(table.getByRole('columnheader', 'Cron')).toBeVisible();
  await expect(table.getByRole('columnheader', 'Groups')).toBeVisible();
  await expect(table.getByRole('columnheader', 'Status')).toBeVisible();
});

test('schedules - New Schedule modal opens with cron field', async ({ app, screen }) => {
  await app.open('/schedules');
  await screen.getByRole('button', 'New Schedule', { exact: false }).tap();
  await expect(screen.getByText('New Schedule')).toBeVisible();
  await expect(screen.getByPlaceholder('Morning Promo')).toBeVisible();
  await expect(screen.getByPlaceholder('0 9 * * 1-5')).toBeVisible();
  await expect(screen.getByRole('button', 'Select All (Random)')).toBeVisible();
  await screen.getByRole('button', 'Cancel').tap();
});

test('schedules - can select all groups randomly and clear selection', async ({ app, screen }) => {
  const gCount = await db.group.count({ where: { isActive: true } });
  if (gCount === 0) {
    await db.group.create({
      data: { name: 'Random Test Group', url: 'https://facebook.com/groups/randfix', fbGroupId: `rand_${Date.now()}` },
    });
  }

  await app.open('/schedules');
  await screen.getByRole('button', 'New Schedule', { exact: false }).tap();
  await screen.getByRole('button', 'Select All (Random)').tap();

  // Badge indicators for order (#1, #2, etc.) should appear
  await expect(screen.getByText('#1')).toBeVisible();

  // Clear button should now be visible and functional
  await screen.getByRole('button', 'Clear').tap();
  await expect(screen.getByRole('button', 'Clear')).toHaveCount(0);
  await screen.getByRole('button', 'Cancel').tap();
});

test('schedules - can create and delete a schedule', async ({ app, screen, browser }) => {
  let acc = await db.account.findFirst();
  if (!acc) {
    acc = await db.account.create({
      data: { name: 'Sched Fixture Account', sessionPath: 'sessions/sched_fix.json' },
    });
  }
  let group = await db.group.findFirst({ where: { isActive: true } });
  if (!group) {
    group = await db.group.create({
      data: { name: 'Sched Fixture Group', url: 'https://facebook.com/groups/schedfix', fbGroupId: `fix_${Date.now()}` },
    });
  }
  let post = await db.post.findFirst({ where: { isActive: true } });
  if (!post) {
    post = await db.post.create({
      data: { title: 'Sched Fixture Post', content: 'Fixture content' },
    });
  }

  const schedName = `E2E Sched ${Date.now()}`;
  await app.open('/schedules');
  const before = await screen.getByRole('button', 'Delete').count();

  await screen.getByRole('button', 'New Schedule', { exact: false }).tap();
  await screen.getByPlaceholder('Morning Promo').fill(schedName);

  const selects = screen.getByRole('combobox');
  await selects.first().selectOption(acc?.name ?? '');
  await selects.last().selectOption(post.title);
  await screen.getByRole('checkbox').first().tap();

  await screen.getByRole('button', 'Create Schedule').tap();

  await expect(screen.getByRole('button', 'Delete')).toHaveCount(before + 1);
  await expect(screen.getByText(schedName)).toBeVisible();

  await browser.onDialog('accept');
  await screen.getByRole('button', 'Delete').first().tap();

  await expect(screen.getByRole('button', 'Delete')).toHaveCount(before);
});

// ── Logs page ─────────────────────────────────────────────────────────────────

test('logs page shows filter and refresh controls', async ({ app, screen }) => {
  await app.open('/logs');
  await expect(screen.getByRole('heading', 'Logs')).toBeVisible();
  await expect(screen.getByRole('button', 'Refresh')).toBeVisible();
});

test('logs page shows status combobox', async ({ app, screen }) => {
  await app.open('/logs');
  await expect(screen.getByRole('combobox')).toBeVisible();
});

test('logs page shows table columns', async ({ app, screen }) => {
  await app.open('/logs');
  const table = screen.getByRole('table');
  await expect(table.getByRole('columnheader', 'Time')).toBeVisible();
  await expect(table.getByRole('columnheader', 'Group')).toBeVisible();
  await expect(table.getByRole('columnheader', 'Schedule')).toBeVisible();
  await expect(table.getByRole('columnheader', 'Status')).toBeVisible();
  await expect(table.getByRole('columnheader', 'Error')).toBeVisible();
});

// ── Session page ──────────────────────────────────────────────────────────────

test('session page shows setup form', async ({ app, screen }) => {
  await app.open('/session');
  await expect(screen.getByRole('heading', 'Session Setup')).toBeVisible();
  await expect(screen.getByRole('button', 'Start Session Setup')).toBeVisible();
  await expect(screen.getByPlaceholder('Main Account')).toBeVisible();
});

test('session page shows saved accounts table', async ({ app, screen }) => {
  await app.open('/session');
  await expect(screen.getByRole('heading', 'Saved Accounts')).toBeVisible();
  await expect(screen.getByRole('table')).toBeVisible();
});

test('session - Start Session Setup requires name', async ({ app, screen }) => {
  await app.open('/session');
  await screen.getByRole('button', 'Start Session Setup').tap();
  await expect(screen.getByText('Enter a name')).toBeVisible();
});

test('session - can remove a saved account', async ({ app, screen, browser }) => {
  const dummyName = `E2E Acc ${Date.now()}`;
  await db.account.create({
    data: { name: dummyName, sessionPath: `sessions/e2e_${Date.now()}.json` },
  });

  await app.open('/session');
  await expect(screen.getByText(dummyName)).toBeVisible();

  await browser.onDialog('accept');
  const row = screen.getByRole('row', { name: new RegExp(dummyName) });
  await row.getByRole('button', 'Remove').tap();

  await expect(screen.getByText(dummyName)).toBeHidden();
});

test('session - shows error when deleting an account in an active schedule', async ({ app, screen, browser }) => {
  const dummyName = `E2E Active Acc ${Date.now()}`;
  const acc = await db.account.create({
    data: { name: dummyName, sessionPath: `sessions/active_${Date.now()}.json` },
  });
  const post = await db.post.create({
    data: { title: `P ${Date.now()}`, content: 'C' },
  });
  const sched = await db.schedule.create({
    data: {
      name: `S ${Date.now()}`,
      cronExpression: '0 9 * * *',
      accountId: acc.id,
      postId: post.id,
      isActive: true,
      status: 'IDLE',
    },
  });

  await app.open('/session');
  await expect(screen.getByText(dummyName)).toBeVisible();

  await browser.onDialog('accept');
  const row = screen.getByRole('row', { name: new RegExp(dummyName) });
  await row.getByRole('button', 'Remove').tap();

  await expect(screen.getByText('Account is assigned to an active schedule')).toBeVisible();

  // Cleanup
  await db.schedule.delete({ where: { id: sched.id } });
  await db.post.delete({ where: { id: post.id } });
  await db.account.delete({ where: { id: acc.id } });
});
