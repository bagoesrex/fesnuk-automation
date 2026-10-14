import { api } from './api.ts';
import type { Group } from '../types/index.ts';

export interface SyncResult {
  added: number;
  skipped: number;
  total: number;
  groups: Pick<Group, 'name' | 'url' | 'fbGroupId'>[];
}

export const groupsService = {
  list: () => api.get<Group[]>('/groups'),
  create: (data: { url: string; name: string }) => api.post<Group>('/groups', data),
  update: (id: string, data: Partial<Pick<Group, 'name' | 'isActive'>>) => api.patch<Group>(`/groups/${id}`, data),
  delete: (id: string) => api.delete<{ id: string }>(`/groups/${id}`),
  sync: (accountId: string) => api.post<SyncResult>('/groups/sync', { accountId }),
};
