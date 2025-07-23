// E2E Test Setup - This file is specifically for Playwright E2E tests
// It should not load any Vitest or Jest dependencies

import type { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import { expect } from '@playwright/test';

// Load environment variables from .env file
dotenv.config();

/**
 * Global setup function that runs once before all tests
 * This is configured in playwright.config.ts
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  // Log the test environment
  console.log(`Running E2E tests against: ${baseURL}`);
  
  // Set test environment variables
  process.env.NEXT_PUBLIC_API_MOCKING = 'enabled';
  process.env.NEXT_PUBLIC_API_URL = baseURL;
  
  // The MSW server is started in playwright.config.ts
  console.log('E2E test environment initialized');
}

// Export the setup function and any test utilities
export { expect };
export default globalSetup;
