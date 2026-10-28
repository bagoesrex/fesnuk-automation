import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/env.ts';

export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.query as { accountId?: string };
    if (!accountId) {
      res.json({ success: true, data: [] });
      return;
    }
    const posts = await db.post.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' } });
    const parsed = posts.map((p) => ({ ...p, imagePaths: JSON.parse(p.imagePaths) as string[] }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    next(err);
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, accountId } = req.body as { title?: string; content?: string; accountId?: string };
    if (!title?.trim() || !content?.trim() || !accountId) {
      res.status(422).json({ success: false, error: 'title, content, and accountId are required', code: 'VALIDATION_ERROR' });
      return;
    }
    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found', code: 'NOT_FOUND' });
      return;
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const imagePaths = files.map((f) =>
      path.relative(path.resolve(config.uploadsDir, '..'), f.path).replace(/\\/g, '/')
    );
    const post = await db.post.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        imagePaths: JSON.stringify(imagePaths),
        accountId,
      },
    });
    res.status(201).json({ success: true, data: { ...post, imagePaths } });
  } catch (err) {
    next(err);
  }
}

export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { title, content, isActive } = req.body as { title?: string; content?: string; isActive?: boolean };
    const post = await db.post.update({ where: { id }, data: { title, content, isActive } });
    res.json({ success: true, data: { ...post, imagePaths: JSON.parse(post.imagePaths) as string[] } });
  } catch {
    res.status(404).json({ success: false, error: 'Post not found', code: 'NOT_FOUND' });
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const inActiveSchedule = await db.schedule.findFirst({
      where: { postId: id, OR: [{ isActive: true }, { status: 'RUNNING' }] },
    });
    if (inActiveSchedule) {
      res.status(409).json({ success: false, error: 'Post is assigned to an active schedule', code: 'SCHEDULE_RUNNING' });
      return;
    }
    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      res.status(404).json({ success: false, error: 'Post not found', code: 'NOT_FOUND' });
      return;
    }
    // delete uploaded images
    const imagePaths = JSON.parse(post.imagePaths) as string[];
    await Promise.all(
      imagePaths.map((rel) => fs.rm(path.resolve(config.uploadsDir, '..', rel), { force: true }))
    );
    // cleanup inactive schedules and groups
    const schedules = await db.schedule.findMany({ where: { postId: id }, select: { id: true } });
    const scheduleIds = schedules.map((s) => s.id);
    if (scheduleIds.length > 0) {
      await db.scheduleGroup.deleteMany({ where: { scheduleId: { in: scheduleIds } } });
      await db.schedule.deleteMany({ where: { id: { in: scheduleIds } } });
    }
    await db.post.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
