import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  test: {
    environment: 'happy-dom',
    env: {
      VITE_SUPABASE_TEST_URL: process.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_TEST_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    },
    include: ['tests/sale-stock-owned/**/*.test.ts'],
    testTimeout: 120000,
    fileParallelism: false,
  },
});
