import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env file
dotenv.config();

// Completely isolate the test environment from Vitest/jest
const originalRequire = require;
const originalResolve = require.resolve;

// Create a clean require function for the test environment
const cleanRequire = function (path: string) {
  if (path.includes('@vitest') || path.includes('jest') || path.includes('@testing-library')) {
    throw new Error(`Cannot load ${path} in Playwright environment`);
  }
  return originalRequire(path);
};

// Create a clean resolve function with proper this typing
const cleanResolve = function (this: any, request: string, options: any) {
  if (request.includes('@vitest') || request.includes('jest') || request.includes('@testing-library')) {
    throw new Error(`Cannot resolve ${request} in Playwright environment`);
  }
  return originalResolve.call(this, request, options);
} as NodeJS.RequireResolve;

// Replace the global require and resolve functions
// @ts-ignore - We need to override these functions
require = cleanRequire;
// @ts-ignore - We need to override these functions
require.resolve = Object.assign(cleanResolve, {
  paths: (originalResolve as any).paths,
});

// Clean up any global test environment variables
if (typeof process !== 'undefined') {
  delete process.env.VITEST;
  delete process.env.JEST_WORKER_ID;
}

// Set up MSW server for tests
const setupMSW = async () => {
  try {
    // Import the server setup from the mocks directory
    const { server } = await import('../mocks/server.js');
    
    // Start the server with error handling
    server.listen({
      onUnhandledRequest: 'bypass'
    });
    
    console.log('MSW server started successfully');
    return server;
  } catch (error) {
    console.error('Failed to start MSW server:', error);
    throw error;
  }
};

// Only set up MSW if we're not running in CI
let mswServer: any = null;
if (!process.env.CI) {
  mswServer = await setupMSW();
}

// Clean up after tests
process.on('exit', () => {
  if (mswServer) {
    mswServer.close();
  }
});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: '../specs',
  testIgnore: '**/unit/**',
  testMatch: '**/*.spec.{js,jsx,ts,tsx}',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/e2e/results.xml' }]
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4321',
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    /* Capture screenshot after each test attempt */
    screenshot: 'only-on-failure',
    /* Record video for failed tests */
    video: 'on-first-retry',
    /* Set viewport size */
    viewport: { width: 1280, height: 720 },
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--disable-dev-shm-usage'],
        },
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
      },
    },
  ],
  
  // Timeout configuration
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  
  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  /* Global setup and teardown */
  globalSetup: './test.setup.ts',
  globalTeardown: './test-teardown.ts',

  /* Global test timeout */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
});
