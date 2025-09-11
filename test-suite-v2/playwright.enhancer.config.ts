import { defineConfig, devices } from '@playwright/test';

// Minimal Playwright config dedicated to the Imag Enhancer E2E test.
// Does not auto-start a local webServer; expects TEST_BASE_URL to point to a running dev server.

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8789';

export default defineConfig({
  testDir: './src/e2e',
  outputDir: './reports/playwright-results',
  snapshotDir: './reports/playwright-snapshots',

  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './reports/playwright-html-report' }],
    ['line']
  ],

  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { Origin: BASE_URL },
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'chromium-en',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-de',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
