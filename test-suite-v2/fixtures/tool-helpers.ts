/**
 * Tool-Specific E2E Test Helpers
 *
 * Helpers for testing Evolution Hub tools (Prompt Enhancer, Image Enhancer, etc.)
 *
 * @module tool-helpers
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { navigateToRoute, waitForPageReady, findByTestId } from './common-helpers';
import path from 'path';

export type ToolName = 'prompt-enhancer' | 'imag-enhancer' | 'image-enhancer';
export type Locale = 'en' | 'de';

/**
 * Get tool path for given tool and locale
 */
function getToolPath(tool: ToolName, locale?: Locale): string {
  const toolPaths: Record<ToolName, string> = {
    'prompt-enhancer': '/tools/prompt-enhancer',
    'imag-enhancer': '/tools/imag-enhancer/app',
    'image-enhancer': '/tools/imag-enhancer/app', // Alias
  };

  const basePath = toolPaths[tool];
  if (!basePath) {
    throw new Error(`Unknown tool: ${tool}`);
  }

  if (locale) {
    return `/${locale}${basePath}`;
  }

  return basePath;
}

/**
 * Navigate to tool page
 *
 * @param page - Playwright page
 * @param tool - Tool name
 * @param options - Navigation options
 */
export async function navigateToTool(
  page: Page,
  tool: ToolName,
  options: {
    locale?: Locale;
    waitForReady?: boolean;
  } = {}
): Promise<void> {
  const { locale = 'en', waitForReady = true } = options;

  const toolPath = getToolPath(tool, locale);

  await navigateToRoute(page, toolPath, { locale, waitUntil: 'domcontentloaded' });

  if (waitForReady) {
    // Tool-specific readiness checks
    if (tool === 'prompt-enhancer') {
      await Promise.race([
        findByTestId(page, 'input-text').waitFor({ state: 'attached', timeout: 5000 }),
        page.locator('#inputText').waitFor({ state: 'attached', timeout: 5000 }),
      ]);
    } else if (tool === 'imag-enhancer' || tool === 'image-enhancer') {
      await Promise.race([
        findByTestId(page, 'image-upload-dropzone').waitFor({ state: 'attached', timeout: 5000 }),
        page.locator('[aria-label*="Image upload"]').first().waitFor({ state: 'attached', timeout: 5000 }),
        page.locator('select#model').first().waitFor({ state: 'attached', timeout: 5000 }),
      ]);
    }
  }
}

/**
 * Upload file to tool
 *
 * @param page - Playwright page
 * @param filePath - Absolute or relative path to file
 * @param options - Upload options
 */
export async function uploadFile(
  page: Page,
  filePath: string,
  options: {
    dropzoneSelector?: string;
    fileInputSelector?: string;
  } = {}
): Promise<void> {
  const {
    dropzoneSelector = '[data-testid="file-upload"], input[type="file"], [aria-label*="upload"]',
    fileInputSelector = 'input[type="file"]',
  } = options;

  // Resolve file path
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  // Try to find file input
  const fileInput = page.locator(fileInputSelector).first();
  const inputExists = await fileInput.count().catch(() => 0);

  if (inputExists > 0) {
    // Direct file input
    await fileInput.setInputFiles(resolvedPath);
  } else {
    // Try dropzone click to reveal input
    const dropzone = page.locator(dropzoneSelector).first();
    await dropzone.click();

    // Wait for file input to appear
    const fileInputAfterClick = page.locator(fileInputSelector).first();
    await fileInputAfterClick.waitFor({ state: 'attached', timeout: 2000 });
    await fileInputAfterClick.setInputFiles(resolvedPath);
  }

  // Best-effort: wait until preview image shows up in dropzone (confirms state updated)
  try {
    const preview = page.locator(`${dropzoneSelector} img`).first();
    await preview.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    // ignore if not visible yet; subsequent steps will still proceed
  }
}

/**
 * Select option from dropdown
 *
 * @param page - Playwright page
 * @param selector - Select element selector
 * @param value - Option value or label
 */
export async function selectOption(page: Page, selector: string, value: string): Promise<void> {
  const select = page.locator(selector).first();
  await select.waitFor({ state: 'attached', timeout: 5000 });
  await select.selectOption(value);
}

/**
 * Wait for tool processing to complete
 *
 * @param page - Playwright page
 * @param options - Wait options
 */
export async function waitForProcessing(
  page: Page,
  options: {
    timeout?: number;
    loadingSelector?: string;
    successSelector?: string;
  } = {}
): Promise<void> {
  const {
    timeout = 30000,
    loadingSelector = '[data-testid="loading"], [aria-busy="true"], .loading, .spinner',
    successSelector = '[data-testid="result"], [data-testid="output"], #outputText, .result',
  } = options;

  // Wait for loading indicator to appear
  const loadingIndicator = page.locator(loadingSelector).first();
  const loadingAppeared = await loadingIndicator.isVisible().catch(() => false);

  if (loadingAppeared) {
    // Wait for loading to disappear
    await loadingIndicator.waitFor({ state: 'hidden', timeout });
  }

  // Wait for success/result element to appear
  const resultElement = page.locator(successSelector).first();
  await resultElement.waitFor({ state: 'visible', timeout });
}

/**
 * Download result from tool
 *
 * @param page - Playwright page
 * @param options - Download options
 */
export async function downloadResult(
  page: Page,
  options: {
    buttonSelector?: string;
    expectedFilename?: string;
  } = {}
): Promise<string> {
  const { buttonSelector = '[data-testid="download-button"], button:has-text("Download")' } = options;

  // Start waiting for download before clicking
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

  // Click download button
  const downloadButton = page.locator(buttonSelector).first();
  await downloadButton.click();

  // Wait for download to complete
  const download = await downloadPromise;

  // Get suggested filename
  const filename = download.suggestedFilename();

  return filename;
}

/**
 * Get tool output text
 *
 * @param page - Playwright page
 * @param outputSelector - Output element selector
 */
export async function getToolOutput(
  page: Page,
  outputSelector = '[data-testid="output"], #outputText, .output, .result'
): Promise<string> {
  const outputElement = page.locator(outputSelector).first();
  await outputElement.waitFor({ state: 'visible', timeout: 5000 });

  const text = await outputElement.textContent();
  return text || '';
}

/**
 * Assert tool output is not empty
 *
 * @param page - Playwright page
 * @param outputSelector - Output element selector
 */
export async function assertOutputNotEmpty(
  page: Page,
  outputSelector = '[data-testid="output"], #outputText, .output, .result'
): Promise<void> {
  const output = await getToolOutput(page, outputSelector);
  expect(output.trim().length, 'Tool output should not be empty').toBeGreaterThan(0);
}

/**
 * Assert tool output contains text
 *
 * @param page - Playwright page
 * @param expectedText - Expected text in output
 * @param outputSelector - Output element selector
 */
export async function assertOutputContains(
  page: Page,
  expectedText: string,
  outputSelector = '[data-testid="output"], #outputText, .output, .result'
): Promise<void> {
  const output = await getToolOutput(page, outputSelector);
  expect(
    output.toLowerCase().includes(expectedText.toLowerCase()),
    `Output should contain "${expectedText}"`
  ).toBeTruthy();
}

/**
 * Clear tool input/output
 *
 * @param page - Playwright page
 * @param options - Clear options
 */
export async function clearTool(
  page: Page,
  options: {
    clearButtonSelector?: string;
    inputSelector?: string;
  } = {}
): Promise<void> {
  const {
    clearButtonSelector = '[data-testid="clear-button"], button:has-text("Clear"), button:has-text("Reset")',
    inputSelector,
  } = options;

  // Try to find clear button
  const clearButton = page.locator(clearButtonSelector).first();
  const buttonVisible = await clearButton.isVisible().catch(() => false);

  if (buttonVisible) {
    await clearButton.click();
  } else if (inputSelector) {
    // Fallback: clear input manually
    const input = page.locator(inputSelector).first();
    await input.fill('');
  }
}

/**
 * Wait for usage quota display
 *
 * @param page - Playwright page
 */
export async function waitForUsageQuota(page: Page): Promise<void> {
  const usageSelectors = [
    '[data-testid="usage-quota"]',
    '[data-testid="usage-section"]',
    'h3:has-text("Usage")',
    'h3:has-text("Nutzung")',
  ];

  for (const selector of usageSelectors) {
    const element = page.locator(selector).first();
    const isVisible = await element.isVisible().catch(() => false);

    if (isVisible) {
      return;
    }
  }
}

/**
 * Get current usage count
 *
 * @param page - Playwright page
 */
export async function getCurrentUsage(page: Page): Promise<number | null> {
  const usageSelectors = [
    '[data-testid="usage-count"]',
    '[data-testid="requests-used"]',
  ];

  for (const selector of usageSelectors) {
    const element = page.locator(selector).first();
    const text = await element.textContent().catch(() => null);

    if (text) {
      const match = text.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  return null;
}

/**
 * Assert quota exceeded error
 *
 * @param page - Playwright page
 */
export async function assertQuotaExceeded(page: Page): Promise<void> {
  const errorSelectors = [
    '[data-testid="quota-exceeded"]',
    '[data-testid="error-message"]',
  ];

  let quotaErrorFound = false;

  for (const selector of errorSelectors) {
    const element = page.locator(selector).first();
    const text = await element.textContent().catch(() => null);

    if (text && (text.toLowerCase().includes('quota') || text.toLowerCase().includes('limit'))) {
      quotaErrorFound = true;
      break;
    }
  }

  expect(quotaErrorFound, 'Quota exceeded error should be displayed').toBeTruthy();
}

/**
 * Seed guest ID cookie to avoid quota issues in tests
 *
 * @param page - Playwright page
 */
export async function seedGuestId(page: Page): Promise<string> {
  const baseUrl = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
  const url = new URL(baseUrl);

  const guestId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await page.context().addCookies([
    {
      name: 'guest_id',
      value: guestId,
      domain: url.hostname,
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    },
  ]);

  return guestId;
}

/**
 * Prompt Enhancer specific helpers
 */
export const PromptEnhancer = {
  /**
   * Fill input text
   */
  async fillInput(page: Page, text: string): Promise<void> {
    const input = page.locator('#inputText, [data-testid="input-text"]').first();
    await input.fill(text);
  },

  /**
   * Select mode
   */
  async selectMode(page: Page, mode: 'creative' | 'technical' | 'concise'): Promise<void> {
    // Prefer segmented buttons; wait briefly for group to attach
    const group = page.locator('[data-testid="mode-group"]').first();
    const groupAttached = await group.waitFor({ state: 'attached', timeout: 1000 }).then(() => true).catch(() => false);
    if (groupAttached) {
      const btn = page.locator(`[data-testid="mode-${mode}"]`).first();
      const btnAttached = await btn.waitFor({ state: 'attached', timeout: 1000 }).then(() => true).catch(() => false);
      if (btnAttached) {
        await btn.click();
        return;
      }
    }
    // Fallback to select element
    const select = page.locator('#mode, [data-testid="mode-select"]').first();
    const hasSelect = await select.waitFor({ state: 'attached', timeout: 1500 }).then(() => true).catch(() => false);
    if (hasSelect) {
      await selectOption(page, '#mode, [data-testid="mode-select"]', mode);
      return;
    }
    throw new Error('PromptEnhancer.selectMode: neither mode buttons nor select found');
  },

  /**
   * Click enhance button
   */
  async clickEnhance(page: Page): Promise<void> {
    const enhanceButton = page.locator(
      'button[type="submit"], button:has-text("Enhance"), [data-testid="enhance-button"]'
    ).first();
    await enhanceButton.click();
  },

  /**
   * Get enhanced output
   */
  async getOutput(page: Page): Promise<string> {
    return getToolOutput(page, '#outputText, [data-testid="output-text"]');
  },

  /**
   * Complete full enhance flow
   */
  async enhance(page: Page, input: string, mode?: 'creative' | 'technical' | 'concise'): Promise<string> {
    await this.fillInput(page, input);
    if (mode) {
      await this.selectMode(page, mode);
    }
    await this.clickEnhance(page);
    await waitForProcessing(page, {
      loadingSelector: '[data-testid="loading"], .loading',
      successSelector: '#outputText, [data-testid="output-text"]',
    });
    return this.getOutput(page);
  },
};

/**
 * Image Enhancer specific helpers
 */
export const ImageEnhancer = {
  /**
   * Select enhancement model
   */
  async selectModel(page: Page, model: 'realesrgan-x4plus' | 'gfpgan-v1.4'): Promise<void> {
    await selectOption(page, 'select#model, [data-testid="model-select"]', model);
  },

  /**
   * Upload image
   */
  async uploadImage(page: Page, imagePath: string): Promise<void> {
    await uploadFile(page, imagePath, {
      dropzoneSelector: '[data-testid="image-upload-dropzone"], [aria-label*="Image upload"]',
    });
  },

  /**
   * Click enhance button
   */
  async clickEnhance(page: Page): Promise<void> {
    const enhanceButton = page.locator(
      'button:has-text("Enhance"), [data-testid="enhance-button"]'
    ).first();
    // Wait until enabled to avoid flakiness (requires file selected and not rate-limited)
    await enhanceButton.waitFor({ state: 'attached', timeout: 5000 });
    await expect(enhanceButton).toBeEnabled({ timeout: 60000 });
    await enhanceButton.click();
  },

  /**
   * Toggle comparison view
   */
  async toggleComparison(page: Page): Promise<void> {
    const compareButton = page.locator(
      'button:has-text("Compare"), [data-testid="compare-button"]'
    ).first();
    await compareButton.click();
  },

  /**
   * Download enhanced image
   */
  async downloadEnhanced(page: Page): Promise<string> {
    return downloadResult(page, {
      buttonSelector: 'button:has-text("Download"), [data-testid="download-button"]',
    });
  },
};
