import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  test: { environment: 'node', include: ['tests/support-deployment/guards.test.ts'],
    fileParallelism: false, testTimeout: 90_000, hookTimeout: 30_000, reporters: ['default'] },
});
