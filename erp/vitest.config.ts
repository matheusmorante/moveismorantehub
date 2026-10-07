import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^maplibre-gl$/, replacement: path.resolve(__dirname, './src/testMocks/maplibre-gl.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      '../src/telemetry/**/*.test.{ts,tsx}',
    ],
    exclude: ['src/**/*.integration.test.{ts,tsx}', 'src/**/*.e2e.test.{ts,tsx}'],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
  },
});

