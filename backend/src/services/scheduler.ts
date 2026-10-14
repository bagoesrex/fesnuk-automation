import cron from 'node-cron';
import db from '../config/db.ts';
import { runPosting } from './poster.ts';
import logger from '../utils/logger.ts';

// Map of scheduleId -> cron task
const tasks = new Map<string, cron.ScheduledTask>();

export function registerSchedule(scheduleId: string, cronExpression: string): void {
  if (tasks.has(scheduleId)) unregisterSchedule(scheduleId);

  if (!cron.validate(cronExpression)) {
    logger.warn(`Invalid cron expression for schedule ${scheduleId}: ${cronExpression}`);
    return;
  }

  const task = cron.schedule(cronExpression, () => {
    triggerSchedule(scheduleId).catch((err: unknown) => {
      logger.error(`Unhandled error in schedule ${scheduleId}: ${String(err)}`);
    });
  });

  tasks.set(scheduleId, task);
  logger.info(`Registered schedule ${scheduleId} [${cronExpression}]`);
}

export function unregisterSchedule(scheduleId: string): void {
  const task = tasks.get(scheduleId);
  if (task) {
    task.stop();
    tasks.delete(scheduleId);
    logger.info(`Unregistered schedule ${scheduleId}`);
  }
}

export async function triggerSchedule(scheduleId: string): Promise<void> {
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      post: true,
      account: true,
      scheduleGroups: { include: { group: true }, orderBy: { order: 'asc' } },
    },
  });

  if (!schedule) {
    logger.warn(`triggerSchedule: schedule ${scheduleId} not found`);
    return;
  }
  if (schedule.status === 'RUNNING') {
    logger.warn(`Schedule ${scheduleId} is already running — skipping trigger`);
    return;
  }

  await db.schedule.update({ where: { id: scheduleId }, data: { status: 'RUNNING', lastRunAt: new Date() } });
  logger.info(`Schedule ${scheduleId} started`);

  try {
    await runPosting(schedule);
    await db.schedule.update({ where: { id: scheduleId }, data: { status: 'IDLE' } });
  } catch (err) {
    logger.error(`Schedule ${scheduleId} failed: ${String(err)}`);
    await db.schedule.update({ where: { id: scheduleId }, data: { status: 'ERROR' } });
  }
}

/** Load all active schedules from DB and register them on boot. */
export async function initScheduler(): Promise<void> {
  const schedules = await db.schedule.findMany({ where: { isActive: true } });
  // reset any stuck RUNNING state from previous crash
  await db.schedule.updateMany({ where: { status: 'RUNNING' }, data: { status: 'ERROR' } });
  for (const s of schedules) {
    registerSchedule(s.id, s.cronExpression);
  }
  logger.info(`Scheduler initialized with ${schedules.length} active schedule(s)`);
}
