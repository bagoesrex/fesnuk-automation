import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      name: 'frontend',
      engine: web(),
      app: {
        url: 'http://localhost:5173',
      },
    },
  ],
  timeout: 30000,
  actionTimeout: 10000,
  assertionTimeout: 5000,
  retries: 0,
} satisfies E2EConfig;
