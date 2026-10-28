import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';
import { syncGroupsFromFacebook } from '../services/groupSync.ts';

function extractGroupId(url: string): string | null {
  const match = url.match(/facebook\.com\/groups\/([^/?&#]+)/);
  return match?.[1] ?? null;
}

export async function listGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.query as { accountId?: string };
    const where = accountId ? { accountId } : {};
    const groups = await db.group.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, name, accountId } = req.body as { url?: string; name?: string; accountId?: string };
    if (!url?.trim() || !name?.trim() || !accountId) {
      res.status(422).json({ success: false, error: 'url, name, and accountId are required', code: 'VALIDATION_ERROR' });
      return;
    }
    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found', code: 'NOT_FOUND' });
      return;
    }
    const fbGroupId = extractGroupId(url.trim());
    if (!fbGroupId) {
      res.status(422).json({ success: false, error: 'Invalid Facebook Group URL', code: 'VALIDATION_ERROR' });
      return;
    }
    const group = await db.group.create({
      data: { fbGroupId, name: name.trim(), url: url.trim(), accountId },
    });
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
    // Block deletion if group is in any active schedule (isActive=true) or currently running
    const inActiveSchedule = await db.scheduleGroup.findFirst({
      where: { groupId: id, schedule: { OR: [{ isActive: true }, { status: 'RUNNING' }] } },
    });
    if (inActiveSchedule) {
      res.status(409).json({ success: false, error: 'Group is assigned to an active schedule', code: 'SCHEDULE_RUNNING' });
      return;
    }
    await db.group.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch {
    res.status(404).json({ success: false, error: 'Group not found', code: 'NOT_FOUND' });
  }
}

export async function syncGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.body as { accountId?: string };
    if (!accountId) {
      res.status(422).json({ success: false, error: 'accountId is required', code: 'VALIDATION_ERROR' });
      return;
    }
    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found', code: 'NOT_FOUND' });
      return;
    }
    const result = await syncGroupsFromFacebook(accountId, account.sessionPath, account.proxyUrl);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
