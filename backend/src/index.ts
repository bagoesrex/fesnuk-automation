import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env.ts';
import { errorHandler, notFound } from './middlewares/errorHandler.ts';
import { initScheduler } from './services/scheduler.ts';
import logger from './utils/logger.ts';

import accountsRouter from './routes/accounts.ts';
import groupsRouter from './routes/groups.ts';
import postsRouter from './routes/posts.ts';
import schedulesRouter from './routes/schedules.ts';
import logsRouter from './routes/logs.ts';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploaded images statically
app.use('/uploads', express.static(config.uploadsDir));

// API routes
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/groups', groupsRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/schedules', schedulesRouter);
app.use('/api/v1/logs', logsRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, async () => {
  logger.info(`Backend running on http://localhost:${config.port}`);
  await initScheduler();
});
