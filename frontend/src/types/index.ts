// Shared TypeScript types matching API response shapes

export interface Account {
  id: string;
  name: string;
  sessionPath: string;
  proxyUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  fbGroupId: string;
  name: string;
  url: string;
  accountId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  imagePaths: string[];
  accountId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleGroup {
  id: string;
  order: number;
  groupId: string;
  group: Group;
}

export interface Schedule {
  id: string;
  name: string;
  cronExpression: string;
  delayMinSec: number;
  delayMaxSec: number;
  isActive: boolean;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR';
  lastRunAt: string | null;
  nextRunAt: string | null;
  accountId: string;
  account: Account;
  postId: string;
  post: Post;
  scheduleGroups: ScheduleGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface PostLog {
  id: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error: string | null;
  postedAt: string;
  scheduleId: string;
  schedule: Schedule;
  groupId: string;
  group: Group;
  postId: string;
  post: Post;
  accountId: string;
}

export interface Stats {
  totalPosts: number;
  successRate: number;
  activeSchedules: number;
  totalGroups: number;
}

export interface PaginatedLogs {
  logs: PostLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}
