import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./config/test-setup.ts'],
    include: [
      'src/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      'reports',
      '**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'reports/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        'src/**/*.test.{js,ts}',
        'src/**/*.spec.{js,ts}',
        'fixtures/',
        'data/',
        'scripts/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        './src/unit/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        './src/integration/': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    retry: 2,
    reporters: ['verbose', 'json'],
    outputFile: './reports/test-results.json'
  },
  resolve: {
    alias: {
      // Specific aliases MUST come before the generic '@' alias
      '@/config': path.resolve(__dirname, './config'),
      '@/types': path.resolve(__dirname, './types'),
      '@/utils': path.resolve(__dirname, './utils'),
      '@/fixtures': path.resolve(__dirname, './fixtures'),
      '@/data': path.resolve(__dirname, './data'),
      '@': path.resolve(__dirname, './src')
    }
  }
});