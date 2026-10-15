import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'child_process';
import path from 'path';
import logger from '../utils/logger.ts';

const db = new PrismaClient();

export async function ensureDatabase(): Promise<void> {
  try {
    await db.$queryRawUnsafe('SELECT 1 FROM "Schedule" LIMIT 1');
  } catch (err: unknown) {
    const errorStr = String(err);
    const code = (err as { code?: string })?.code;
    if (code === 'P2010' || code === 'P2021' || errorStr.includes('no such table') || errorStr.includes('does not exist')) {
      logger.info('Database schema missing. Applying Prisma migrations...');
      const baseDir = (typeof import.meta !== 'undefined' && (import.meta.dir ?? import.meta.dirname)) || path.resolve(process.cwd(), 'backend', 'src', 'config');
      const backendDir = baseDir.includes('backend') ? baseDir.substring(0, baseDir.indexOf('backend') + 'backend'.length) : path.resolve(baseDir, 'backend');
      const res = spawnSync('bunx', ['prisma', 'migrate', 'deploy'], {
        cwd: backendDir,
        stdio: 'inherit',
        shell: true,
      });
      if (res.status !== 0) {
        logger.error(`Prisma migration deploy failed with exit code ${res.status}`);
      } else {
        logger.info('Prisma migrations applied successfully.');
      }
    } else {
      throw err;
    }
  }
}

export default db;
