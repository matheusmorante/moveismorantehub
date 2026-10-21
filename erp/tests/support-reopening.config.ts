import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/support-reopening/receive.test.ts'],
    fileParallelism: false, bail: 1, testTimeout: 30_000, hookTimeout: 30_000, reporters: ['default'] },
});
