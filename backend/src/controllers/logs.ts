import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';

export async function listLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId, groupId, accountId, status, page = '1', limit = '50' } =
      req.query as { scheduleId?: string; groupId?: string; accountId?: string; status?: string; page?: string; limit?: string };

    if (!accountId) {
      res.json({
        success: true,
        data: { logs: [], total: 0, page: Number(page), totalPages: 0 },
      });
      return;
    }

    const take = Math.min(Number(limit), 200);
    const skip = (Number(page) - 1) * take;

    const where = {
      ...(scheduleId && { scheduleId }),
      ...(groupId && { groupId }),
      accountId,
      ...(status && { status }),
    };

    const [logs, total] = await Promise.all([
      db.postLog.findMany({
        where,
        include: { group: true, post: true, schedule: true },
        orderBy: { postedAt: 'desc' },
        take,
        skip,
      }),
      db.postLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: { logs, total, page: Number(page), totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.query as { accountId?: string };
    if (!accountId) {
      res.json({
        success: true,
        data: {
          totalPosts: 0,
          successRate: 0,
          activeSchedules: 0,
          totalGroups: 0,
        },
      });
      return;
    }

    const logWhere = { accountId };
    const scheduleWhere = { accountId, isActive: true };
    const groupWhere = { accountId, isActive: true };

    const [total, succeeded, activeSchedules, totalGroups] = await Promise.all([
      db.postLog.count({ where: logWhere }),
      db.postLog.count({ where: { ...logWhere, status: 'SUCCESS' } }),
      db.schedule.count({ where: scheduleWhere }),
      db.group.count({ where: groupWhere }),
    ]);

    res.json({
      success: true,
      data: {
        totalPosts: total,
        successRate: total > 0 ? Math.round((succeeded / total) * 1000) / 10 : 0,
        activeSchedules,
        totalGroups,
      },
    });
  } catch (err) {
    next(err);
  }
}
