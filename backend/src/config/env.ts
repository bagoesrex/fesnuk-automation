import path from 'path';

const baseDir = (typeof import.meta !== 'undefined' && (import.meta.dir ?? import.meta.dirname)) || path.resolve(process.cwd(), 'backend', 'src', 'config');
const root = path.resolve(baseDir, '..', '..');

export const config = {
  port: Number(process.env['PORT'] ?? 3001),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
  sessionsDir: path.resolve(root, process.env['SESSIONS_DIR'] ?? 'sessions'),
  uploadsDir: path.resolve(root, process.env['UPLOADS_DIR'] ?? 'uploads'),
  logsDir: path.resolve(root, process.env['LOGS_DIR'] ?? 'logs'),
  playwright: {
    headless: process.env['PLAYWRIGHT_HEADLESS'] !== 'false',
    slowMo: Number(process.env['BROWSER_SLOW_MO'] ?? 50),
  },
} as const;
