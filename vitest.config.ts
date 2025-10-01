import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ['./tsconfig.json'] })],
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
        plugins: [react(), tsconfigPaths({ projects: ['./tsconfig.json'] })],
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
        plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
        test: {
          include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
          environment: 'node',
          testTimeout: 180000,
          globalSetup: ['./tests/integration/setup/global-setup.ts'],
        },
      },
    ],
  },

  // tsconfigPaths plugin handles path resolution from tsconfig.json
});