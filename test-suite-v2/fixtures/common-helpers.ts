/**
 * Common E2E Test Helpers
 *
 * Shared helpers for all E2E tests (non-auth specific).
 * For auth-specific helpers, see auth-helpers.ts
 *
 * @module common-helpers
 */

import type { Page, BrowserContext, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Get base URL from environment
 */
export function getBaseUrl(): string {
  return process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
}

/**
 * Check if running in local development environment
 */
export function isLocalDev(): boolean {
  const baseUrl = getBaseUrl();
  try {
    const url = new URL(baseUrl);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  const baseUrl = getBaseUrl();
  try {
    const url = new URL(baseUrl);
    return url.hostname.includes('ci.hub-evolution.com');
  } catch {
    return false;
  }
}

/**
 * Check if running against staging environment
 */
export function isStaging(): boolean {
  const baseUrl = getBaseUrl();
  try {
    const url = new URL(baseUrl);
    return url.hostname.includes('staging.hub-evolution.com');
  } catch {
    return false;
  }
}

/**
 * Check if running against production environment
 */
export function isProduction(): boolean {
  const baseUrl = getBaseUrl();
  try {
    const url = new URL(baseUrl);
    return url.hostname === 'hub-evolution.com' || url.hostname === 'www.hub-evolution.com';
  } catch {
    return false;
  }
}

/**
 * Navigate to a route with automatic locale and error handling
 *
 * @param page - Playwright page
 * @param route - Route to navigate to (e.g., '/dashboard', '/tools/prompt-enhancer')
 * @param options - Navigation options
 */
export async function navigateToRoute(
  page: Page,
  route: string,
  options: {
    locale?: 'en' | 'de';
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    retries?: number;
  } = {}
): Promise<void> {
  const { locale, waitUntil = 'domcontentloaded', retries = 2 } = options;

  // Build route with locale if provided
  let targetRoute = route;
  if (locale) {
    // Ensure route starts with /
    targetRoute = route.startsWith('/') ? route : `/${route}`;
    // Add locale prefix if not already present
    if (!targetRoute.startsWith(`/${locale}/`)) {
      targetRoute = `/${locale}${targetRoute}`;
    }
  }

  // Attempt navigation with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(targetRoute, { waitUntil });
      return;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Failed to navigate to ${targetRoute} after ${retries + 1} attempts: ${error}`
        );
      }
      // Wait before retry
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }
}

/**
 * Wait for page to be fully loaded and interactive
 *
 * @param page - Playwright page
 * @param options - Wait options
 */
export async function waitForPageReady(
  page: Page,
  options: {
    timeout?: number;
    checkSelectors?: string[]; // Optional selectors to check for
  } = {}
): Promise<void> {
  const { timeout = 10000, checkSelectors = [] } = options;

  // Wait for network idle
  await page.waitForLoadState('networkidle', { timeout });

  // Wait for document ready
  await page.waitForFunction(() => document.readyState === 'complete', { timeout });

  // If specific selectors provided, wait for them
  if (checkSelectors.length > 0) {
    await Promise.all(
      checkSelectors.map((selector) =>
        page
          .locator(selector)
          .first()
          .waitFor({ state: 'attached', timeout: timeout / 2 })
      )
    );
  }
}

/**
 * Dismiss cookie consent banner if present
 *
 * @param page - Playwright page
 */
export async function dismissCookieConsent(page: Page): Promise<void> {
  const consentSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Akzeptieren")',
    'button:has-text("Einverstanden")',
    'button:has-text("Accept all")',
    'button:has-text("Alle akzeptieren")',
    'button[aria-label="Accept"]',
    'button[aria-label="Akzeptieren"]',
    'button[data-testid="cookie-accept"]',
    '[data-testid="cookie-banner"] button:first-child',
  ];

  for (const selector of consentSelectors) {
    const button = page.locator(selector).first();
    const isVisible = await button.isVisible().catch(() => false);

    if (isVisible) {
      try {
        await button.click({ timeout: 2000 });
        // Wait for banner to disappear
        await page.waitForTimeout(500);
        return;
      } catch {
        // Continue to next selector
      }
    }
  }

  // No cookie consent found - that's OK
}

/**
 * Fill form with data
 *
 * @param page - Playwright page
 * @param formData - Object with selector -> value mappings
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string | number | boolean>
): Promise<void> {
  for (const [selector, value] of Object.entries(formData)) {
    const element = page.locator(selector).first();

    // Check if element exists
    await element.waitFor({ state: 'attached', timeout: 5000 });

    // Determine input type and fill accordingly
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    const type = await element.getAttribute('type');

    if (tagName === 'select') {
      await element.selectOption(String(value));
    } else if (type === 'checkbox' || type === 'radio') {
      if (value) {
        await element.check();
      } else {
        await element.uncheck();
      }
    } else if (
      tagName === 'textarea' ||
      type === 'text' ||
      type === 'email' ||
      type === 'password'
    ) {
      await element.fill(String(value));
    } else {
      // Default: try to fill
      await element.fill(String(value));
    }
  }
}

/**
 * Submit form
 *
 * @param page - Playwright page
 * @param selector - Form or submit button selector (optional, defaults to finding submit button)
 */
export async function submitForm(page: Page, selector?: string): Promise<void> {
  if (selector) {
    const element = page.locator(selector).first();
    await element.click();
  } else {
    // Find and click first submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
  }
}

/**
 * Find element by data-testid
 *
 * @param page - Playwright page
 * @param testId - data-testid value
 */
export function findByTestId(page: Page, testId: string): Locator {
  return page.locator(`[data-testid="${testId}"]`);
}

/**
 * Find element by aria-label
 *
 * @param page - Playwright page
 * @param label - aria-label value (can be partial match)
 */
export function findByAriaLabel(page: Page, label: string, exact = false): Locator {
  if (exact) {
    return page.locator(`[aria-label="${label}"]`);
  } else {
    return page.locator(`[aria-label*="${label}"]`);
  }
}

/**
 * Find element by text content
 *
 * @param page - Playwright page
 * @param text - Text content to search for
 * @param exact - Whether to match exact text
 */
export function findByText(page: Page, text: string, exact = false): Locator {
  if (exact) {
    return page.getByText(text, { exact: true });
  } else {
    return page.getByText(text);
  }
}

/**
 * Find element by role
 *
 * @param page - Playwright page
 * @param role - ARIA role
 * @param options - Additional options
 */
export function findByRole(
  page: Page,
  role: string,
  options?: { name?: string; exact?: boolean }
): Locator {
  return page.getByRole(role as any, options);
}

/**
 * Expect error message to be visible
 *
 * @param page - Playwright page
 * @param message - Expected error message (can be partial)
 */
export async function expectErrorMessage(page: Page, message: string): Promise<void> {
  const errorSelectors = [
    '[data-testid="error-message"]',
    '[role="alert"]',
    '.error-message',
    '.error',
    '[aria-live="polite"]', // Common for error announcements
  ];

  let errorFound = false;

  for (const selector of errorSelectors) {
    const errorElement = page.locator(selector).first();
    const isVisible = await errorElement.isVisible().catch(() => false);

    if (isVisible) {
      const text = await errorElement.textContent();
      if (text && text.toLowerCase().includes(message.toLowerCase())) {
        errorFound = true;
        break;
      }
    }
  }

  if (!errorFound) {
    // Also check for toast notifications
    const toast = page.locator('[data-testid="toast"]').first();
    const toastVisible = await toast.isVisible().catch(() => false);

    if (toastVisible) {
      const toastText = await toast.textContent();
      if (toastText && toastText.toLowerCase().includes(message.toLowerCase())) {
        errorFound = true;
      }
    }
  }

  expect(errorFound, `Expected error message containing "${message}" to be visible`).toBeTruthy();
}

/**
 * Expect success message to be visible
 *
 * @param page - Playwright page
 * @param message - Expected success message (can be partial)
 */
export async function expectSuccessMessage(page: Page, message: string): Promise<void> {
  const successSelectors = [
    '[data-testid="success-message"]',
    '[data-testid="toast"]',
    '.success-message',
    '.success',
    '[role="status"]',
  ];

  let successFound = false;

  for (const selector of successSelectors) {
    const successElement = page.locator(selector).first();
    const isVisible = await successElement.isVisible().catch(() => false);

    if (isVisible) {
      const text = await successElement.textContent();
      if (text && text.toLowerCase().includes(message.toLowerCase())) {
        successFound = true;
        break;
      }
    }
  }

  expect(
    successFound,
    `Expected success message containing "${message}" to be visible`
  ).toBeTruthy();
}

/**
 * Wait for element to appear (with timeout)
 *
 * @param page - Playwright page
 * @param selector - Element selector
 * @param timeout - Timeout in ms
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<Locator> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

/**
 * Wait for element to disappear (with timeout)
 *
 * @param page - Playwright page
 * @param selector - Element selector
 * @param timeout - Timeout in ms
 */
export async function waitForElementGone(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'hidden', timeout });
}

/**
 * Scroll element into view
 *
 * @param page - Playwright page
 * @param selector - Element selector
 */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded();
}

/**
 * Take screenshot with consistent naming
 *
 * @param page - Playwright page
 * @param name - Screenshot name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = Date.now();
  const sanitizedName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  await page.screenshot({
    path: `test-suite-v2/reports/screenshots/${sanitizedName}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Get current locale from URL or page
 *
 * @param page - Playwright page
 */
export async function getCurrentLocale(page: Page): Promise<'en' | 'de' | null> {
  const url = page.url();

  if (url.includes('/en/')) return 'en';
  if (url.includes('/de/')) return 'de';

  // Try to get from HTML lang attribute
  const htmlLang = await page.getAttribute('html', 'lang').catch(() => null);
  if (htmlLang === 'en' || htmlLang === 'en-US') return 'en';
  if (htmlLang === 'de' || htmlLang === 'de-DE') return 'de';

  return null;
}

/**
 * Switch locale
 *
 * @param page - Playwright page
 * @param targetLocale - Target locale
 */
export async function switchLocale(page: Page, targetLocale: 'en' | 'de'): Promise<void> {
  // Look for locale switcher
  const switcher = page.locator('[data-testid="locale-switcher"]').first();
  const switcherVisible = await switcher.isVisible().catch(() => false);

  if (switcherVisible) {
    await switcher.click();
    const option = page.locator(`[data-locale="${targetLocale}"]`).first();
    await option.click();
    await page.waitForLoadState('domcontentloaded');
  } else {
    // Fallback: modify URL
    const currentUrl = page.url();
    const newUrl = currentUrl.replace(/\/(en|de)\//, `/${targetLocale}/`);
    await page.goto(newUrl);
  }
}

/**
 * Clear all cookies for current context
 *
 * @param context - Browser context
 */
export async function clearCookies(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

/**
 * Set cookie
 *
 * @param context - Browser context
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export async function setCookie(
  context: BrowserContext,
  name: string,
  value: string,
  options: {
    domain?: string;
    path?: string;
    expires?: number;
  } = {}
): Promise<void> {
  const baseUrl = getBaseUrl();
  const url = new URL(baseUrl);

  await context.addCookies([
    {
      name,
      value,
      domain: options.domain || url.hostname,
      path: options.path || '/',
      expires: options.expires,
    },
  ]);
}
