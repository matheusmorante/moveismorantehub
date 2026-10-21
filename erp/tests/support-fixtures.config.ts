import { defineConfig } from 'vitest/config';

// Explicit provisioning operation, separate from UI and normal unit test runs.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/support-fixtures/provision.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    reporters: ['default'],
  },
});
