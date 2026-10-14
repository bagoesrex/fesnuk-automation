import { api } from './api.ts';
import type { Account } from '../types/index.ts';

export const accountsService = {
  list: () => api.get<Account[]>('/accounts'),
  startSession: (name: string) => api.post<{ message: string }>('/accounts/session/start', { name }),
  confirmSession: () => api.post<Account>('/accounts/session/confirm', {}),
  delete: (id: string) => api.delete<{ id: string }>(`/accounts/${id}`),
};
