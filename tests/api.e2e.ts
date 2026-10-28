// API tests for backend endpoints — no browser needed
// Requires backend running at http://localhost:3001

import { test } from 'e2e';
import { expect } from 'e2e';
import db from '../backend/src/config/db.ts';

const API = 'http://localhost:3001/api/v1';

let authToken = '';
let fixtureAccountId = '';

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!authToken) {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'aguskucink' }),
      });
      const json = (await res.json()) as { data?: { token: string } };
      if (json.data?.token) authToken = json.data.token;
    } catch {
      // Backend may have no password configured
    }
  }
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function getFixtureAccount(): Promise<string> {
  if (!fixtureAccountId) {
    let acc = await db.account.findFirst();
    if (!acc) {
      acc = await db.account.create({
        data: { name: 'E2E Fixture ' + Date.now(), sessionPath: 'sessions/e2e.json' },
      });
    }
    fixtureAccountId = acc.id;
  }
  return fixtureAccountId;
}

async function api(path: string, init?: RequestInit) {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  });
  return res.json() as Promise<{ success: boolean; data?: unknown; error?: string }>;
}

// ── Groups ──────────────────────────────────────────────────────────────────

test('GET /groups returns empty array initially or when unscoped', async () => {
  const body = await api('/groups');
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
});

test('POST /groups creates a group', async () => {
  const accountId = await getFixtureAccount();
  const body = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({
      url: `https://www.facebook.com/groups/e2etestgroup${Date.now()}`,
      name: 'E2E Test Group',
      accountId,
    }),
  });
  expect(body.success).toBe(true);
  const group = body.data as { id: string; name: string; fbGroupId: string };
  expect(group.name).toBe('E2E Test Group');

  // cleanup
  await api(`/groups/${group.id}`, { method: 'DELETE' });
});

test('POST /groups rejects invalid URL', async () => {
  const accountId = await getFixtureAccount();
  const body = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://example.com/not-a-group', name: 'Bad Group', accountId }),
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
  const accountId = await getFixtureAccount();
  const created = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({
      url: `https://www.facebook.com/groups/patchtest${Date.now()}`,
      name: 'Before Patch',
      accountId,
    }),
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
  const accountId = await getFixtureAccount();
  const created = await api('/groups', {
    method: 'POST',
    body: JSON.stringify({
      url: `https://www.facebook.com/groups/deletetest${Date.now()}`,
      name: 'To Delete',
      accountId,
    }),
  });
  const group = created.data as { id: string };

  const del = await api(`/groups/${group.id}`, { method: 'DELETE' });
  expect(del.success).toBe(true);

  // confirm it's gone
  const list = await api(`/groups?accountId=${accountId}`);
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
  const accountId = await getFixtureAccount();
  const authHeaders = await getAuthHeader();
  const form = new FormData();
  form.append('title', 'E2E Test Post');
  form.append('content', 'This is test content from e2e tests');
  form.append('accountId', accountId);

  const res = await fetch(`${API}/posts`, { method: 'POST', body: form, headers: authHeaders });
  const body = (await res.json()) as {
    success: boolean;
    data?: { id: string; title: string; content: string; imagePaths: string[] };
  };

  expect(body.success).toBe(true);
  expect(body.data?.title).toBe('E2E Test Post');
  expect(body.data?.imagePaths).toEqual([]);

  await api(`/posts/${body.data!.id}`, { method: 'DELETE' });
});

test('POST /posts requires title and content', async () => {
  const authHeaders = await getAuthHeader();
  const form = new FormData();
  form.append('title', '');

  const res = await fetch(`${API}/posts`, { method: 'POST', body: form, headers: authHeaders });
  const body = (await res.json()) as { success: boolean };
  expect(body.success).toBe(false);
});

test('PATCH /posts/:id updates a post', async () => {
  const accountId = await getFixtureAccount();
  const authHeaders = await getAuthHeader();
  const form = new FormData();
  form.append('title', 'Original Title');
  form.append('content', 'Original content');
  form.append('accountId', accountId);
  const createRes = await fetch(`${API}/posts`, { method: 'POST', body: form, headers: authHeaders });
  const created = (await createRes.json()) as { data: { id: string } };

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

test('PATCH /accounts/:id updates account proxy and name', async () => {
  const account = await db.account.create({
    data: { name: 'Proxy Test Acc', sessionPath: 'sessions/proxy_test.json' },
  });

  const updated = await api(`/accounts/${account.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ proxyUrl: 'http://user:pass@1.2.3.4:8080' }),
  });
  expect(updated.success).toBe(true);
  expect((updated.data as { proxyUrl?: string }).proxyUrl).toBe('http://user:pass@1.2.3.4:8080');

  await db.account.delete({ where: { id: account.id } });
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

// ── Auth & Session Export/Import ──────────────────────────────────────────────

test('GET /auth/status returns auth status', async () => {
  const res = await api('/auth/status');
  expect(res.success).toBe(true);
  const data = res.data as { authRequired: boolean; authenticated: boolean };
  expect(typeof data.authRequired).toBe('boolean');
  expect(typeof data.authenticated).toBe('boolean');
});

test('POST /auth/login returns token', async () => {
  const res = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password: 'any' }),
  });
  expect(res.success).toBe(true);
  const data = res.data as { token: string };
  expect(typeof data.token).toBe('string');
});

test('POST /accounts/session/import validates input and creates account', async () => {
  // Invalid payload test
  const invalid = await api('/accounts/session/import', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test' }),
  });
  expect(invalid.success).toBe(false);

  // Valid session import
  const validSession = {
    cookies: [
      { name: 'c_user', value: '100012345', domain: '.facebook.com', path: '/' },
      { name: 'xs', value: 'token123', domain: '.facebook.com', path: '/' },
    ],
    origins: [],
  };

  const created = await api('/accounts/session/import', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Imported E2E Account',
      sessionData: validSession,
      proxyUrl: 'http://user:pass@127.0.0.1:8080',
    }),
  });

  expect(created.success).toBe(true);
  const acc = created.data as { id: string; name: string; proxyUrl: string };
  expect(acc.name).toBe('Imported E2E Account');
  expect(acc.proxyUrl).toBe('http://user:pass@127.0.0.1:8080');

  // Verify export session endpoint
  const exportRes = await fetch(`${API}/accounts/${acc.id}/session`);
  expect(exportRes.status).toBe(200);
  const exportedJson = await exportRes.json() as { cookies: unknown[] };
  expect(Array.isArray(exportedJson.cookies)).toBe(true);

  // Cleanup
  await api(`/accounts/${acc.id}`, { method: 'DELETE' });
});
