import { api } from './api.ts';
import type { Schedule } from '../types/index.ts';

export const schedulesService = {
  list: (accountId?: string) =>
    api.get<Schedule[]>(accountId ? `/schedules?accountId=${encodeURIComponent(accountId)}` : '/schedules'),
  create: (data: {
    name: string;
    cronExpression: string;
    accountId: string;
    postId: string;
    groupIds: string[];
    delayMinSec: number;
    delayMaxSec: number;
  }) => api.post<Schedule>('/schedules', data),
  update: (id: string, data: Partial<{ name: string; cronExpression: string; delayMinSec: number; delayMaxSec: number; groupIds: string[] }>) =>
    api.patch<Schedule>(`/schedules/${id}`, data),
  toggle: (id: string, isActive: boolean) => api.post<Schedule>(`/schedules/${id}/toggle`, { isActive }),
  runNow: (id: string) => api.post<{ message: string }>(`/schedules/${id}/run`, {}),
  delete: (id: string) => api.delete<{ id: string }>(`/schedules/${id}`),
};
