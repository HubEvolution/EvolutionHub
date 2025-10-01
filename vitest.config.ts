import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Shared defaults
    globals: true,
    watch: false,
    env: { NODE_ENV: 'test' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/.*',
        'test/.*',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.stories.{ts,tsx}',
        '**/types.ts',
        '**/vite-env.d.ts',
      ],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
        perFile: false,
      },
    },
    // Migrate workspace → projects: define unit + integration here
    projects: [
      // Unit tests project
      {
        test: {
          environment: 'jsdom',
          setupFiles: ['./src/setupTests.ts'],
          // Note: removed deprecated deps.inline; tests run fine without explicit inlining
          testTimeout: 10000,
          include: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'tests/unit/**/*.{test,spec,_test}.{ts,tsx}',
          ],
          exclude: [
            'tests/src/**',
            'tests/integration/**',
            'test-suite-v2/**',
          ],
        },
      },
      // Integration tests project
      {
        test: {
          include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
          environment: 'node',
          testTimeout: 180000,
          globalSetup: ['./tests/integration/setup/global-setup.ts'],
        },
      },
    ],
  },

  // Resolve aliases shared by projects
  resolve: {
    alias: {
      // Spezifische Aliases zuerst (vor generischem '@')
      '@/config/logging': resolve(__dirname, './src/config/logging.ts'),
      '@/config/test-config': resolve(__dirname, './tests/src/legacy/config/test-config.ts'),
      '@/server/utils/logger-factory': resolve(__dirname, './src/server/utils/logger-factory.ts'),
      '@/lib/response-helpers': resolve(__dirname, './src/lib/response-helpers.ts'),
      '@/lib/rate-limiter': resolve(__dirname, './src/lib/rate-limiter.ts'),
      '@/lib/security-logger': resolve(__dirname, './src/lib/security-logger.ts'),
      '@/lib/security/csrf': resolve(__dirname, './src/lib/security/csrf.ts'),
      '@/server/utils/logger': resolve(__dirname, './src/server/utils/logger.ts'),
      'tests-legacy': resolve(__dirname, './tests/src/legacy'),
      '@': resolve(__dirname, './src'),
    },
  },
});