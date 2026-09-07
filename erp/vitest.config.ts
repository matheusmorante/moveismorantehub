import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      '../mobile/src/**/*.test.{ts,tsx}',
      '../src/mcp/**/*.test.{ts,tsx}',
    ],
    exclude: ['src/**/*.integration.test.{ts,tsx}', 'src/**/*.e2e.test.{ts,tsx}'],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
  },
});

