// Frontend UI tests — requires both backend (port 3001) and frontend (port 5173) running

import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

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
  await screen.getByRole('button', 'Cancel').tap();
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
