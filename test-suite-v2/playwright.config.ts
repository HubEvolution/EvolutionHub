import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve BASE_URL similarly to the root E2E config
const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
// Determine if target is remote; if remote, don't auto-start local server
let IS_REMOTE_TARGET = false;
try {
  const url = new URL(BASE_URL);
  IS_REMOTE_TARGET = !(url.hostname === 'localhost' || url.hostname === '127.0.0.1');
} catch {
  IS_REMOTE_TARGET = false;
}

export default defineConfig({
  testDir: './src/e2e',
  outputDir: './reports/playwright-results',
  snapshotDir: './reports/playwright-snapshots',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './reports/playwright-html-report' }],
    ['json', { outputFile: './reports/playwright-results.json' }],
    ['junit', { outputFile: './reports/playwright-junit.xml' }],
    ['line']
  ],

  use: {
    baseURL: BASE_URL,
    // Ensure POSTs include an Origin header for CSRF protection in Astro middleware
    extraHTTPHeaders: { Origin: BASE_URL },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  ...(IS_REMOTE_TARGET
    ? {}
    : {
        webServer: {
          // Run the root project's E2E dev server (wrangler dev on 127.0.0.1:8787)
          command: 'npm --prefix .. run dev:e2e',
          url: BASE_URL,
          // Always stop the server after tests to avoid hanging processes
          reuseExistingServer: false,
          timeout: 120 * 1000,
          env: {
            E2E_FAKE_STYTCH: '1',
            AUTH_PROVIDER: 'stytch',
          },
        },
      }),

  expect: {
    timeout: 10000,
    toMatchSnapshot: {
      maxDiffPixels: 100,
    },
  },

  // E2E v2 local setup/teardown (no-op by default)
  globalSetup: path.join(__dirname, './config/playwright-global-setup.ts'),
  globalTeardown: path.join(__dirname, './config/playwright-global-teardown.ts'),
});