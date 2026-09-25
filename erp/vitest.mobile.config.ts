import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '../mobile'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../mobile/src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
