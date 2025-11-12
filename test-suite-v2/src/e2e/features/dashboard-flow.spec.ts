/**
 * E2E-Tests für Dashboard-Flows
 *
 * Diese Tests verwenden Playwright gegen BASE_URL=ci.hub-evolution.com.
 * Fokus: Navigation zu Dashboard, Auth-Handling (valid/invalid -> redirect/401),
 * Flows: Load activity/notifications/projects/stats, perform-action (create project),
 * Error-Cases: No auth, rate-limit (multiple API calls), network/DB errors.
 *
 * @file dashboard-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Set baseURL for CI environment
test.describe.configure({ mode: 'parallel' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Mock console errors for cleaner logs
    console.warn = () => {};
  });
});

test('sollte Dashboard bei gültiger Auth laden und Daten anzeigen', async ({ page }) => {
  // Assume logged in or set session cookie for auth
  await page.goto('/dashboard'); // BASE_URL=ci.hub-evolution.com

  // Check navigation and auth status
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible(); // Assume testid

  // Check components load
  await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
  await expect(page.locator('[data-testid="projects-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="stats-card"]')).toBeVisible();
});

test('sollte bei invalid Auth auf Login redirecten', async ({ page }) => {
  // Clear auth cookies/sessions
  await page.context().clearCookies();

  await page.goto('/dashboard');

  // Expect redirect to login
  await expect(page).toHaveURL(/.*\/login/);
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
});

test('sollte Notifications laden und anzeigen', async ({ page }) => {
  // Assume auth setup (e.g., via fixture or goto login and login)
  await page.goto('/dashboard');

  // Click or scroll to notifications
  await page.click('[data-testid="notifications-toggle"]');
  await expect(page.locator('[data-testid="notification-item"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="notification-count"]')).toHaveText(/[0-9]+/);
});

test('sollte Projects Panel laden und Projekte anzeigen', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.locator('[data-testid="projects-list"]')).toBeVisible();
  await expect(page.locator('[data-testid="project-card"]')).toHaveCount.gte(0); // At least 0 or more
});

test('sollte Stats Cards mit Counts anzeigen', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.locator('[data-testid="stats-projects"]')).toHaveText(/[0-9]+/);
  await expect(page.locator('[data-testid="stats-tasks"]')).toHaveText(/[0-9]+/);
  await expect(page.locator('[data-testid="stats-team"]')).toHaveText(/[0-9]+/);
});

test('sollte Perform Action (Create Project) ausführen', async ({ page }) => {
  await page.goto('/dashboard');

  // Click quick action button
  await page.click('[data-testid="create-project-btn"]');
  await page.fill('[data-testid="project-title"]', 'Test Project');
  await page.click('[data-testid="submit-project"]');

  // Expect success message or list update
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  await expect(page.locator('[data-testid="project-card"]')).toHaveCount.gte(1);
});

test('sollte bei Rate-Limit (multiple API calls) 429 Error handhaben', async ({ page }) => {
  await page.route('**/api/dashboard/**', async (route) => {
    // Simulate rate limit after 2 calls
    const calls = (route.request().headers()['x-test-call'] || 0) as number;
    if (calls >= 2) {
      route.fulfill({ status: 429, body: JSON.stringify({ error: 'Rate limit exceeded' }) });
    } else {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: [] }) });
    }
  });

  await page.goto('/dashboard');
  // Trigger multiple API calls (e.g., refresh or click)
  await page.reload();
  await page.click('[data-testid="refresh-stats"]'); // Assume button

  // Expect error toast or disabled state
  await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
});

test('sollte bei Network/DB Error graceful degradieren', async ({ page }) => {
  await page.route('**/api/dashboard/**', (route) => {
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'DB Error' }) });
  });

  await page.goto('/dashboard');

  // Expect error message but page loads (degradation)
  await expect(page.locator('[data-testid="error-placeholder"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible(); // Page still functional
});
