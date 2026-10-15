import type { Request, Response, NextFunction } from 'express';
import db from '../config/db.ts';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/env.ts';

export async function listPosts(_req: Request, res: Response, next: NextFunction) {
  try {
    const posts = await db.post.findMany({ orderBy: { createdAt: 'desc' } });
    const parsed = posts.map((p) => ({ ...p, imagePaths: JSON.parse(p.imagePaths) as string[] }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    next(err);
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title?.trim() || !content?.trim()) {
      res.status(422).json({ success: false, error: 'title and content are required', code: 'VALIDATION_ERROR' });
      return;
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const imagePaths = files.map((f) => path.relative(path.resolve(config.uploadsDir, '..'), f.path));
    const post = await db.post.create({
      data: { title: title.trim(), content: content.trim(), imagePaths: JSON.stringify(imagePaths) },
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
    await db.post.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
