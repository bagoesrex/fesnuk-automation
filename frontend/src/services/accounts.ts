import { api } from './api.ts';
import type { Account } from '../types/index.ts';

export const accountsService = {
  list: () => api.get<Account[]>('/accounts'),
  startSession: (name: string, proxyUrl?: string) =>
    api.post<{ message: string }>('/accounts/session/start', { name, proxyUrl }),
  confirmSession: () => api.post<Account>('/accounts/session/confirm', {}),
  update: (id: string, data: Partial<Pick<Account, 'name' | 'proxyUrl' | 'isActive'>>) =>
    api.patch<Account>(`/accounts/${id}`, data),
  delete: (id: string) => api.delete<{ id: string }>(`/accounts/${id}`),
};
