import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'unit',
    // Test environment
    environment: 'jsdom',
    globals: true,
    
    // Setup files
    setupFiles: ['./src/setupTests.ts'],
    
    // Mock modules
    deps: {
      inline: ['@testing-library/user-event'],
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Watch mode configuration
    watch: false,
    
    // Coverage configuration
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
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
        branches: 90,
        functions: 95,
        lines: 95,
        statements: 95,
        perFile: false,
      },
    },
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec,_test}.{ts,tsx}',
    ],
    exclude: [
      'tests/src/**',
      'tests/integration/**',
      'test-suite-v2/**',
    ],
    
    // Environment variables
    env: {
      NODE_ENV: 'test',
    },
  },
  
  // Resolve aliases
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
      'tests-legacy': resolve(__dirname, './tests/src/legacy'),
      '@': resolve(__dirname, './src'),
    },
  },
});
