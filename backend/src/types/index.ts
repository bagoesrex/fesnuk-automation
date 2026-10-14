export type ScheduleStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR';
export type LogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}
