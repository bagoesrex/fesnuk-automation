import { api, getAuthToken } from './api.ts';
import type { Account } from '../types/index.ts';

const BASE = import.meta.env['VITE_API_URL'] as string ?? '/api/v1';

export const accountsService = {
  list: () => api.get<Account[]>('/accounts'),
  startSession: (name: string, proxyUrl?: string) =>
    api.post<{ message: string }>('/accounts/session/start', { name, proxyUrl }),
  confirmSession: () => api.post<Account>('/accounts/session/confirm', {}),
  importSession: (name: string, sessionData: unknown, proxyUrl?: string) =>
    api.post<Account>('/accounts/session/import', { name, sessionData, proxyUrl }),
  exportSession: async (id: string, accountName: string): Promise<void> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/accounts/${id}/session`, { headers });
    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errJson.error ?? 'Failed to export session');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  update: (id: string, data: Partial<Pick<Account, 'name' | 'proxyUrl' | 'isActive'>>) =>
    api.patch<Account>(`/accounts/${id}`, data),
  delete: (id: string) => api.delete<{ id: string }>(`/accounts/${id}`),
};
