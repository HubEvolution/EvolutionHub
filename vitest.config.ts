import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'url';
import { resolve as resolvePath } from 'path';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^astro:content$/,
        replacement: fileURLToPath(new URL('./tests/mocks/astro-content.ts', import.meta.url)),
      },
    ],
  },
  plugins: [
    // Ensure 'astro:content' resolves in Vitest by intercepting before import analysis
    (function mockAstroContent() {
      const replacement = fileURLToPath(new URL('./tests/mocks/astro-content.ts', import.meta.url));
      return {
        name: 'mock-astro-content',
        enforce: 'pre' as const,
        resolveId(id: string) {
          if (id === 'astro:content') return replacement;
          return null;
        },
      };
    })(),
    react(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
  ],
  test: {
    // Shared defaults
    globals: true,
    watch: false,
    env: { NODE_ENV: 'test' },
    passWithNoTests: true,
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
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
        perFile: false,
      },
    },
    // Migrate workspace → projects: define unit + integration here
    projects: [
      // Unit tests project
      {
        plugins: [
          (function mockAstroContent() {
            const replacement = fileURLToPath(
              new URL('./tests/mocks/astro-content.ts', import.meta.url)
            );
            return {
              name: 'mock-astro-content',
              enforce: 'pre' as const,
              resolveId(id: string) {
                if (id === 'astro:content') return replacement;
                return null;
              },
            };
          })(),
          react(),
          tsconfigPaths({ projects: ['./tsconfig.json'] }),
        ],
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/setupTests.ts'],
          // Note: removed deprecated deps.inline; tests run fine without explicit inlining
          testTimeout: 10000,
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec,_test}.{ts,tsx}'],
          exclude: ['tests/src/**', 'tests/integration/**', 'test-suite-v2/**'],
        },
      },
      // Integration tests project
      {
        plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
        test: {
          name: 'integration',
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
