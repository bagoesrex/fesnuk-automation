import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';
import { registerSchedule, unregisterSchedule, triggerSchedule } from '../services/scheduler.ts';

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.query as { accountId?: string };
    const where = accountId ? { accountId } : {};
    const schedules = await db.schedule.findMany({
      where,
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

    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found', code: 'NOT_FOUND' });
      return;
    }

    // Verify post belongs to the account
    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post || post.accountId !== accountId) {
      res.status(422).json({
        success: false,
        error: 'The selected post does not belong to this account',
        code: 'CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN',
      });
      return;
    }

    // Verify all groups belong to the account
    const groups = await db.group.findMany({
      where: { id: { in: groupIds } },
    });
    const invalidGroups = groups.filter((g) => g.accountId !== accountId);
    if (groups.length !== groupIds.length || invalidGroups.length > 0) {
      res.status(422).json({
        success: false,
        error: 'One or more selected groups do not belong to this account',
        code: 'CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN',
      });
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

    if (groupIds) {
      const groups = await db.group.findMany({ where: { id: { in: groupIds } } });
      const invalid = groups.filter((g) => g.accountId !== current.accountId);
      if (groups.length !== groupIds.length || invalid.length > 0) {
        res.status(422).json({
          success: false,
          error: 'One or more selected groups do not belong to this account',
          code: 'CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN',
        });
        return;
      }
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
    // Delete child records first (PostLog FKs are SetNull in schema, ScheduleGroup cascades automatically)
    await db.scheduleGroup.deleteMany({ where: { scheduleId: id } });
    await db.schedule.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
