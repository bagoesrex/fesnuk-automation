import { api } from './api.ts';
import type { PaginatedLogs, Stats } from '../types/index.ts';

export const logsService = {
  list: (params?: { scheduleId?: string; groupId?: string; accountId?: string; status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.scheduleId) qs.set('scheduleId', params.scheduleId);
    if (params?.groupId) qs.set('groupId', params.groupId);
    if (params?.accountId) qs.set('accountId', params.accountId);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return api.get<PaginatedLogs>(`/logs${q ? `?${q}` : ''}`);
  },
  stats: (accountId?: string) =>
    api.get<Stats>(accountId ? `/logs/stats?accountId=${encodeURIComponent(accountId)}` : '/logs/stats'),
};
