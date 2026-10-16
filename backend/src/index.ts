import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env.ts';
import db, { ensureDatabase } from './config/db.ts';
import { errorHandler, notFound } from './middlewares/errorHandler.ts';
import { initScheduler } from './services/scheduler.ts';
import logger from './utils/logger.ts';

import accountsRouter from './routes/accounts.ts';
import groupsRouter from './routes/groups.ts';
import postsRouter from './routes/posts.ts';
import schedulesRouter from './routes/schedules.ts';
import logsRouter from './routes/logs.ts';
import authRouter from './routes/auth.ts';
import { requireAuth } from './middlewares/auth.ts';

const app = express();

const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// serve uploaded images statically
app.use('/uploads', express.static(config.uploadsDir));

// Public auth routes
app.use('/api/v1/auth', authRouter);

// Protected API routes
app.use('/api/v1/accounts', requireAuth, accountsRouter);
app.use('/api/v1/groups', requireAuth, groupsRouter);
app.use('/api/v1/posts', requireAuth, postsRouter);
app.use('/api/v1/schedules', requireAuth, schedulesRouter);
app.use('/api/v1/logs', requireAuth, logsRouter);

app.use(notFound);
app.use(errorHandler);

async function startServer(): Promise<void> {
  await ensureDatabase();
  await initScheduler();
  app.listen(config.port, () => {
    logger.info(`Backend running on http://localhost:${config.port}`);
  });
}

startServer().catch((err: unknown) => {
  logger.error(`Failed to start server: ${String(err)}`);
  process.exit(1);
});
