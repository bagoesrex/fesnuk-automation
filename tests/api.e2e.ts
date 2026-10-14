// API tests for backend endpoints — no browser needed
// Requires backend running at http://localhost:3001

import { test } from 'e2e';
import { expect } from 'e2e';

const API = 'http://localhost:3001/api/v1';

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return res.json() as Promise<{ success: boolean; data?: unknown; error?: string }>;
}

// ── Groups ──────────────────────────────────────────────────────────────────

test('GET /groups returns empty array initially', async () => {
  const body = await api('/groups');
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
});

test('POST /groups creates a group', async () => {
  const body = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://www.facebook.com/groups/e2etestgroup123', name: 'E2E Test Group' }),
  });
  expect(body.success).toBe(true);
  const group = body.data as { id: string; name: string; fbGroupId: string };
  expect(group.name).toBe('E2E Test Group');
  expect(group.fbGroupId).toBe('e2etestgroup123');

  // cleanup
  await api(`/groups/${group.id}`, { method: 'DELETE' });
});

test('POST /groups rejects invalid URL', async () => {
  const body = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://example.com/not-a-group', name: 'Bad Group' }),
  });
  expect(body.success).toBe(false);
  expect(body.error).toBeDefined();
});

test('POST /groups requires name and url', async () => {
  const body = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({ url: '' }),
  });
  expect(body.success).toBe(false);
});

test('PATCH /groups/:id updates a group', async () => {
  const created = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://www.facebook.com/groups/patchtest999', name: 'Before Patch' }),
  });
  const group = created.data as { id: string };

  const patched = await api(`/groups/${group.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'After Patch', isActive: false }),
  });
  expect(patched.success).toBe(true);
  const updated = patched.data as { name: string; isActive: boolean };
  expect(updated.name).toBe('After Patch');
  expect(updated.isActive).toBe(false);

  await api(`/groups/${group.id}`, { method: 'DELETE' });
});

test('DELETE /groups/:id removes the group', async () => {
  const created = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://www.facebook.com/groups/deletetest456', name: 'To Delete' }),
  });
  const group = created.data as { id: string };

  const del = await api(`/groups/${group.id}`, { method: 'DELETE' });
  expect(del.success).toBe(true);

  // confirm it's gone
  const list = await api('/groups');
  const groups = list.data as Array<{ id: string }>;
  expect(groups.find((g) => g.id === group.id)).toBeUndefined();
});

// ── Posts ────────────────────────────────────────────────────────────────────

test('GET /posts returns array', async () => {
  const body = await api('/posts');
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
});

test('POST /posts creates a post (text only)', async () => {
  const form = new FormData();
  form.append('title', 'E2E Test Post');
  form.append('content', 'This is test content from e2e tests');

  const res = await fetch(`${API}/posts`, { method: 'POST', body: form });
  const body = await res.json() as { success: boolean; data?: { id: string; title: string; content: string; imagePaths: string[] } };

  expect(body.success).toBe(true);
  expect(body.data?.title).toBe('E2E Test Post');
  expect(body.data?.imagePaths).toEqual([]);

  await api(`/posts/${body.data!.id}`, { method: 'DELETE' });
});

test('POST /posts requires title and content', async () => {
  const form = new FormData();
  form.append('title', '');

  const res = await fetch(`${API}/posts`, { method: 'POST', body: form });
  const body = await res.json() as { success: boolean };
  expect(body.success).toBe(false);
});

test('PATCH /posts/:id updates a post', async () => {
  const form = new FormData();
  form.append('title', 'Original Title');
  form.append('content', 'Original content');
  const createRes = await fetch(`${API}/posts`, { method: 'POST', body: form });
  const created = await createRes.json() as { data: { id: string } };

  const patched = await api(`/posts/${created.data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: 'Updated Title', isActive: false }),
  });
  expect(patched.success).toBe(true);
  const updated = patched.data as { title: string; isActive: boolean };
  expect(updated.title).toBe('Updated Title');
  expect(updated.isActive).toBe(false);

  await api(`/posts/${created.data.id}`, { method: 'DELETE' });
});

// ── Accounts ─────────────────────────────────────────────────────────────────

test('GET /accounts returns array', async () => {
  const body = await api('/accounts');
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
});

// ── Schedules ─────────────────────────────────────────────────────────────────

test('GET /schedules returns array', async () => {
  const body = await api('/schedules');
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
});

test('POST /schedules requires all fields', async () => {
  const body = await api('/schedules', {
    method: 'POST',
    body: JSON.stringify({ name: 'Incomplete Schedule' }),
  });
  expect(body.success).toBe(false);
});

// ── Logs ─────────────────────────────────────────────────────────────────────

test('GET /logs returns paginated result', async () => {
  const body = await api('/logs');
  expect(body.success).toBe(true);
  const data = body.data as { logs: unknown[]; total: number; page: number; totalPages: number };
  expect(Array.isArray(data.logs)).toBe(true);
  expect(typeof data.total).toBe('number');
  expect(data.page).toBe(1);
});

test('GET /logs/stats returns stats object', async () => {
  const body = await api('/logs/stats');
  expect(body.success).toBe(true);
  const stats = body.data as { totalPosts: number; successRate: number; activeSchedules: number; totalGroups: number };
  expect(typeof stats.totalPosts).toBe('number');
  expect(typeof stats.successRate).toBe('number');
  expect(typeof stats.activeSchedules).toBe('number');
  expect(typeof stats.totalGroups).toBe('number');
});

test('GET /logs supports status filter', async () => {
  const body = await api('/logs?status=SUCCESS');
  expect(body.success).toBe(true);
  const data = body.data as { logs: Array<{ status: string }> };
  data.logs.forEach((log) => expect(log.status).toBe('SUCCESS'));
});

test('GET /logs supports pagination', async () => {
  const body = await api('/logs?page=1&limit=5');
  expect(body.success).toBe(true);
  const data = body.data as { logs: unknown[]; page: number };
  expect(data.logs.length).toBeLessThanOrEqual(5);
  expect(data.page).toBe(1);
});

// ── 404 handling ─────────────────────────────────────────────────────────────

test('unknown route returns 404', async () => {
  const res = await fetch(`${API}/nonexistent-route`);
  const body = await res.json() as { success: boolean; code: string };
  expect(res.status).toBe(404);
  expect(body.success).toBe(false);
  expect(body.code).toBe('NOT_FOUND');
});
