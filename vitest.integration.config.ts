import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
    globals: true,
    testTimeout: 180000,
    globalSetup: ['./tests/integration/setup/global-setup.ts'],
    watch: false,
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
});
