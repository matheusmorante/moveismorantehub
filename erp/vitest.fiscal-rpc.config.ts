import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    poolOptions: { forks: { execArgv: process.execArgv } },
    include: ['src/pages/utils/nfe/__tests__/activeFiscalAttempt.integration.test.ts'],
  },
});
