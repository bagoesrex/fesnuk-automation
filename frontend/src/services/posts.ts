import { api } from './api.ts';
import type { Post } from '../types/index.ts';

export const postsService = {
  list: (accountId?: string) =>
    api.get<Post[]>(accountId ? `/posts?accountId=${encodeURIComponent(accountId)}` : '/posts'),
  create: (form: FormData) => api.postForm<Post>('/posts', form),
  update: (id: string, data: Partial<Pick<Post, 'title' | 'content' | 'isActive'>>) =>
    api.patch<Post>(`/posts/${id}`, data),
  delete: (id: string) => api.delete<{ id: string }>(`/posts/${id}`),
};
