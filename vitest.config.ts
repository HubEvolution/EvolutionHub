import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
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
    },
    
    // Test file patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    
    // Environment variables
    env: {
      NODE_ENV: 'test',
    },
  },
  
  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
