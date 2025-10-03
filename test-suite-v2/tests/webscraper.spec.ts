/**
 * E2E tests for Webscraper Tool
 */

import { test, expect } from '@playwright/test';

test.describe('Webscraper Tool', () => {
  test('should load webscraper page', async ({ page }) => {
    await page.goto('/tools/webscraper/app');

    // Check page loads
    await expect(page.locator('h1')).toBeVisible();

    // Check form elements exist
    await expect(page.locator('input[name="url"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for empty URL', async ({ page }) => {
    await page.goto('/tools/webscraper/app');

    // Try to submit without URL
    await page.locator('button[type="submit"]').click();

    // HTML5 validation should prevent submission
    const urlInput = page.locator('input[name="url"]');
    const validationMessage = await urlInput.evaluate((el: HTMLInputElement) =>
      el.validationMessage
    );

    expect(validationMessage).toBeTruthy();
  });

  test('should show URL input field with placeholder', async ({ page }) => {
    await page.goto('/tools/webscraper/app');

    const urlInput = page.locator('input[name="url"]');

    await expect(urlInput).toHaveAttribute('type', 'url');
    await expect(urlInput).toHaveAttribute('placeholder');
  });

  test('should enable submit button when URL is entered', async ({ page }) => {
    await page.goto('/tools/webscraper/app');

    const urlInput = page.locator('input[name="url"]');
    const submitButton = page.locator('button[type="submit"]');

    // Initially button should be disabled (empty input)
    await expect(submitButton).toBeDisabled();

    // Enter URL
    await urlInput.fill('https://example.com');

    // Button should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should display loading state during scraping', async ({ page }) => {
    await page.goto('/tools/webscraper/app');

    // Mock API to delay response
    await page.route('**/api/webscraper/extract', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            result: {
              url: 'https://example.com',
              title: 'Test Page',
              description: 'Test Description',
              text: 'Test content',
              metadata: {},
              links: [],
              images: [],
              scrapedAt: new Date().toISOString(),
              robotsTxtAllowed: true,
            },
            usage: { used: 1, limit: 5, resetAt: null },
          },
        }),
      });
    });

    const urlInput = page.locator('input[name="url"]');
    const submitButton = page.locator('button[type="submit"]');

    await urlInput.fill('https://example.com');
    await submitButton.click();

    // Should show loading state
    await expect(submitButton).toContainText(/Processing|Verarbeite/);
  });

  test('should display results after successful scraping', async ({ page }) => {
    await page.goto('/tools/webscraper/app');

    // Mock successful API response
    await page.route('**/api/webscraper/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            result: {
              url: 'https://example.com',
              title: 'Test Page Title',
              description: 'Test Page Description',
              text: 'This is the test content of the page',
              metadata: {
                author: 'Test Author',
                language: 'en',
              },
              links: ['https://example.com/page1', 'https://example.com/page2'],
              images: ['https://example.com/img1.jpg'],
              scrapedAt: new Date().toISOString(),
              robotsTxtAllowed: true,
            },
            usage: { used: 1, limit: 5, resetAt: null },
          },
        }),
      });
    });

    await page.locator('input[name="url"]').fill('https://example.com');
    await page.locator('button[type="submit"]').click();

    // Wait for results
    await expect(page.locator('text=Test Page Title')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Test Page Description')).toBeVisible();
    await expect(page.locator('text=This is the test content')).toBeVisible();
  });

  test('should show error toast for invalid URL', async ({ page }) => {
    await page.goto('/tools/webscraper/app');

    // Mock error response
    await page.route('**/api/webscraper/extract', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            type: 'validation_error',
            message: 'Invalid URL format',
          },
        }),
      });
    });

    await page.locator('input[name="url"]').fill('https://example.com');
    await page.locator('button[type="submit"]').click();

    // Should show error toast (Sonner)
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
  });
});
