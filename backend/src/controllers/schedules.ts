import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';
import { registerSchedule, unregisterSchedule, triggerSchedule } from '../services/scheduler.ts';

export async function listSchedules(_req: Request, res: Response, next: NextFunction) {
  try {
    const schedules = await db.schedule.findMany({
      include: { post: true, account: true, scheduleGroups: { include: { group: true }, orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, cronExpression, accountId, postId, groupIds, delayMinSec, delayMaxSec } =
      req.body as {
        name?: string;
        cronExpression?: string;
        accountId?: string;
        postId?: string;
        groupIds?: string[];
        delayMinSec?: number;
        delayMaxSec?: number;
      };

    if (!name?.trim() || !cronExpression?.trim() || !accountId || !postId || !groupIds?.length) {
      res.status(422).json({ success: false, error: 'name, cronExpression, accountId, postId, and groupIds are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const schedule = await db.schedule.create({
      data: {
        name: name.trim(),
        cronExpression: cronExpression.trim(),
        accountId,
        postId,
        delayMinSec: delayMinSec ?? 300,
        delayMaxSec: delayMaxSec ?? 900,
        scheduleGroups: {
          create: groupIds.map((groupId, i) => ({ groupId, order: i })),
        },
      },
      include: { scheduleGroups: { include: { group: true }, orderBy: { order: 'asc' } } },
    });

    registerSchedule(schedule.id, schedule.cronExpression);
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { name, cronExpression, delayMinSec, delayMaxSec, groupIds } =
      req.body as { name?: string; cronExpression?: string; delayMinSec?: number; delayMaxSec?: number; groupIds?: string[] };

    const current = await db.schedule.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ success: false, error: 'Schedule not found', code: 'NOT_FOUND' });
      return;
    }
    if (current.status === 'RUNNING') {
      res.status(409).json({ success: false, error: 'Cannot edit a running schedule', code: 'SCHEDULE_RUNNING' });
      return;
    }

    const updated = await db.schedule.update({
      where: { id },
      data: {
        name,
        cronExpression,
        delayMinSec,
        delayMaxSec,
        ...(groupIds && {
          scheduleGroups: {
            deleteMany: {},
            create: groupIds.map((groupId, i) => ({ groupId, order: i })),
          },
        }),
      },
      include: { scheduleGroups: { include: { group: true }, orderBy: { order: 'asc' } } },
    });

    if (cronExpression && cronExpression !== current.cronExpression) {
      unregisterSchedule(id);
      if (updated.isActive) registerSchedule(id, cronExpression);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function toggleSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { isActive } = req.body as { isActive?: boolean };
    if (isActive === undefined) {
      res.status(422).json({ success: false, error: 'isActive is required', code: 'VALIDATION_ERROR' });
      return;
    }
    const schedule = await db.schedule.update({ where: { id }, data: { isActive } });
    if (isActive) {
      registerSchedule(id, schedule.cronExpression);
    } else {
      unregisterSchedule(id);
    }
    res.json({ success: true, data: schedule });
  } catch {
    res.status(404).json({ success: false, error: 'Schedule not found', code: 'NOT_FOUND' });
  }
}

export async function runScheduleNow(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const schedule = await db.schedule.findUnique({ where: { id } });
    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found', code: 'NOT_FOUND' });
      return;
    }
    if (schedule.status === 'RUNNING') {
      res.status(409).json({ success: false, error: 'Schedule is already running', code: 'SCHEDULE_RUNNING' });
      return;
    }
    // fire-and-forget
    triggerSchedule(id).catch(() => {});
    res.json({ success: true, data: { message: 'Schedule triggered' } });
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const schedule = await db.schedule.findUnique({ where: { id } });
    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found', code: 'NOT_FOUND' });
      return;
    }
    if (schedule.status === 'RUNNING') {
      res.status(409).json({ success: false, error: 'Cannot delete a running schedule', code: 'SCHEDULE_RUNNING' });
      return;
    }
    unregisterSchedule(id);
    await db.schedule.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
