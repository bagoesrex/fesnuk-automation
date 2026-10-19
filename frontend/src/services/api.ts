const BASE = import.meta.env['VITE_API_URL'] as string ?? '/api/v1';

export const API_BASE_URL = BASE;

const TOKEN_KEY = 'fesnuk_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });

  const json = (await res.json()) as { success: boolean; data?: T; error?: string; code?: string };
  if (!json.success) {
    if (res.status === 401 && token) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    throw new Error((json as { error?: string }).error ?? 'Request failed');
  }
  return (json as { data: T }).data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
