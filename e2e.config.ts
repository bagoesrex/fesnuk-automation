import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

// Requires both servers running before the test run:
//   cd backend && bun run dev      (port 3001)
//   cd frontend && bun run dev     (port 5173)
export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      name: 'frontend',
      engine: web(),
      app: {
        url: 'http://localhost:5173',
        // reuseExisting attaches to the already-running Vite dev server
        command: {
          executable: 'bun',
          args: ['run', 'dev'],
          cwd: 'frontend',
          log: '.e2e/logs/frontend.log',
          reuseExisting: true,
        },
      },
    },
  ],
  timeout: 60000,
  actionTimeout: 15000,
  assertionTimeout: 5000,
  retries: 1,
} satisfies E2EConfig;
