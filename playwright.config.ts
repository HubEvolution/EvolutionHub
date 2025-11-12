import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Prefer TEST_BASE_URL, fallback to BASE_URL, then local default
const TEST_BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL;
const BASE_URL = TEST_BASE_URL || 'http://127.0.0.1:8787';
// Determine if target is remote via URL parsing
let IS_REMOTE_TARGET = false;
try {
  const url = new URL(BASE_URL);
  IS_REMOTE_TARGET = !(url.hostname === 'localhost' || url.hostname === '127.0.0.1');
} catch {
  IS_REMOTE_TARGET = false;
}
// Allow disabling local webServer startup (e.g., in git hooks) via PW_NO_SERVER=1
const DISABLE_LOCAL_SERVER = process.env.PW_NO_SERVER === '1';
const RECORD = process.env.E2E_RECORD === '1';

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Origin: BASE_URL,
    },
    trace: RECORD ? 'on' : 'retain-on-failure',
    screenshot: RECORD ? 'on' : 'only-on-failure',
    video: RECORD ? 'retain-on-failure' : 'off',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
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
  ],

  // Start the Cloudflare Worker dev server (wrangler dev) only for local targets
  ...(IS_REMOTE_TARGET || DISABLE_LOCAL_SERVER
    ? {}
    : {
        webServer: {
          command: 'npm run dev:e2e',
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }),
});
