import type { FullConfig } from '@playwright/test';

/**
 * Global teardown function that runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  // The MSW server is now managed by the Playwright config
  console.log('Cleaning up test environment...');
  
  // Add any additional cleanup here
  
  console.log('Test environment cleanup completed');
}

export default globalTeardown;
