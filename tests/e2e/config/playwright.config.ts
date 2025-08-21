import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Plain Playwright config without top-level await or require overrides
// Reuse BASE_URL in multiple places and set Origin header to satisfy CSRF checks
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';

export default defineConfig({
  testDir: '../specs',
  testIgnore: '**/unit/**',
  testMatch: '**/*.spec.{js,jsx,ts,tsx}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/e2e/results.xml' }],
  ],
  use: {
    // Wrangler dev default URL
    baseURL: BASE_URL,
    // Ensure POSTs include an Origin header for Astro's CSRF protection
    extraHTTPHeaders: {
      Origin: BASE_URL,
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: { args: ['--disable-dev-shm-usage'] },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // Start the Cloudflare Worker dev server (wrangler dev)
  webServer: {
    // Ensure npm runs from the project root even when config is in a subfolder
    command: 'npm --prefix ../../.. run dev:e2e',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Use existing setup/teardown files
  globalSetup: './setup.ts',
  globalTeardown: './test-teardown.ts',
});
