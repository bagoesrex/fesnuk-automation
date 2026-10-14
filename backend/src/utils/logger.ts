import winston from 'winston';
import path from 'path';
import { config } from '../config/env.ts';

const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${String(timestamp)} [${level}] ${String(message)}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(config.logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(config.logsDir, 'combined.log'),
    }),
  ],
});

export default logger;
