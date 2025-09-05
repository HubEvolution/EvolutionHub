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
    alias: {
      // Spezifische Aliases zuerst (vor generischem '@')
      '@/config/logging': resolve(__dirname, './src/config/logging.ts'),
      '@/config/test-config': resolve(__dirname, './tests/src/legacy/config/test-config.ts'),
      '@/server/utils/logger-factory': resolve(__dirname, './src/server/utils/logger-factory.ts'),
      '@/lib/response-helpers': resolve(__dirname, './src/lib/response-helpers.ts'),
      '@/lib/rate-limiter': resolve(__dirname, './src/lib/rate-limiter.ts'),
      '@/lib/security-logger': resolve(__dirname, './src/lib/security-logger.ts'),
      '@/server/utils/logger': resolve(__dirname, './src/server/utils/logger.ts'),
      '@': resolve(__dirname, './src'),
    },
  },
});
