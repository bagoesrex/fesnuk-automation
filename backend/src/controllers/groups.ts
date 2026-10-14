import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';

function extractGroupId(url: string): string | null {
  const match = url.match(/facebook\.com\/groups\/([^/?&#]+)/);
  return match?.[1] ?? null;
}

export async function listGroups(_req: Request, res: Response, next: NextFunction) {
  try {
    const groups = await db.group.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, name } = req.body as { url?: string; name?: string };
    if (!url?.trim() || !name?.trim()) {
      res.status(422).json({ success: false, error: 'url and name are required', code: 'VALIDATION_ERROR' });
      return;
    }
    const fbGroupId = extractGroupId(url.trim());
    if (!fbGroupId) {
      res.status(422).json({ success: false, error: 'Invalid Facebook Group URL', code: 'VALIDATION_ERROR' });
      return;
    }
    const group = await db.group.create({ data: { fbGroupId, name: name.trim(), url: url.trim() } });
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

export async function updateGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { name, isActive } = req.body as { name?: string; isActive?: boolean };
    const group = await db.group.update({ where: { id }, data: { name, isActive } });
    res.json({ success: true, data: group });
  } catch {
    res.status(404).json({ success: false, error: 'Group not found', code: 'NOT_FOUND' });
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    // block if group is in an active running schedule
    const running = await db.scheduleGroup.findFirst({
      where: { groupId: id, schedule: { status: 'RUNNING' } },
    });
    if (running) {
      res.status(409).json({ success: false, error: 'Group is in a running schedule', code: 'SCHEDULE_RUNNING' });
      return;
    }
    await db.group.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch {
    res.status(404).json({ success: false, error: 'Group not found', code: 'NOT_FOUND' });
  }
}
