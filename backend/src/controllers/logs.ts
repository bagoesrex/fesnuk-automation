import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';

export async function listLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId, groupId, status, page = '1', limit = '50' } =
      req.query as { scheduleId?: string; groupId?: string; status?: string; page?: string; limit?: string };

    const take = Math.min(Number(limit), 200);
    const skip = (Number(page) - 1) * take;

    const where = {
      ...(scheduleId && { scheduleId }),
      ...(groupId && { groupId }),
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

export async function getStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const [total, succeeded, activeSchedules, totalGroups] = await Promise.all([
      db.postLog.count(),
      db.postLog.count({ where: { status: 'SUCCESS' } }),
      db.schedule.count({ where: { isActive: true } }),
      db.group.count({ where: { isActive: true } }),
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
