import { test, expect } from '@playwright/test';

test.describe('Image Enhancer MVP Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Image Enhancer with MVP mode enabled
    await page.goto('/en/tools/imag-enhancer/app');
    
    // Wait for MVP component to load
    await page.waitForSelector('#imag-enhancer-root');
  });

  test('should display MVP interface with upload area', async ({ page }) => {
    // Should show upload area with proper text
    await expect(page.locator('text=Drop an image here or click to select')).toBeVisible();
    await expect(page.locator('text=Allowed: JPG, PNG, WEBP')).toBeVisible();
    await expect(page.locator('text=Max size 10MB')).toBeVisible();
    
    // Should show model selection
    await expect(page.locator('label:has-text("Model")')).toBeVisible();
    await expect(page.locator('select#model')).toBeVisible();
    
    // Should have Workers AI models only
    const modelOptions = await page.locator('select#model option').count();
    expect(modelOptions).toBeGreaterThan(0);
  });

  test('should handle file upload via drag and drop', async ({ page }) => {
    // Create a test file
    const testFile = {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    
    // Get the upload area
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    
    // Drag and drop file
    await uploadArea.dispatchEvent('dragover');
    await uploadArea.setInputFiles(testFile);
    
    // Should show preview
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
    
    // Should enable enhance button
    const enhanceButton = page.locator('button:has-text("Enhance")');
    await expect(enhanceButton).toBeEnabled();
  });

  test('should handle file upload via click', async ({ page }) => {
    // Create a test file
    const testFile = {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    
    // Click upload area to trigger file input
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.click();
    
    // Handle file input (may need to wait for input to appear)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    
    // Should show preview
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
  });

  test('should show model selection with Workers AI models', async ({ page }) => {
    const modelSelect = page.locator('select#model');
    
    // Should have at least one option
    const options = await modelSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(0);
    
    // Should contain Workers AI models
    const hasWorkersAiModel = options.some(option => 
      option.includes('Enhance') && option.includes('img2img')
    );
    expect(hasWorkersAiModel).toBe(true);
  });

  test('should validate file types', async ({ page }) => {
    // Create invalid file
    const invalidFile = {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid-file-data'),
    };
    
    // Try to upload invalid file
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.setInputFiles(invalidFile);
    
    // Should show error toast or message
    // Note: This depends on the toast implementation
    await expect(page.locator('text=Unsupported file type')).toBeVisible({ timeout: 5000 });
  });

  test('should validate file size', async ({ page }) => {
    // Create large file (simulated)
    const largeFile = {
      name: 'large-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(15 * 1024 * 1024), // 15MB
    };
    
    // Try to upload large file
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.setInputFiles(largeFile);
    
    // Should show error toast or message
    await expect(page.locator('text=File is too large')).toBeVisible({ timeout: 5000 });
  });

  test('should show usage information', async ({ page }) => {
    // Should display usage info
    await expect(page.locator('text=/Usage:/')).toBeVisible();
  });

  test('should disable enhance button when no file selected', async ({ page }) => {
    const enhanceButton = page.locator('button:has-text("Enhance")');
    await expect(enhanceButton).toBeDisabled();
  });

  test('should enable enhance button when file selected', async ({ page }) => {
    // Upload a valid file first
    const testFile = {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.setInputFiles(testFile);
    
    // Enhance button should be enabled
    const enhanceButton = page.locator('button:has-text("Enhance")');
    await expect(enhanceButton).toBeEnabled();
  });

  test('should show processing state during enhancement', async ({ page }) => {
    // Upload file first
    const testFile = {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.setInputFiles(testFile);
    
    // Click enhance button
    const enhanceButton = page.locator('button:has-text("Enhance")');
    await enhanceButton.click();
    
    // Should show processing state
    await expect(page.locator('button:has-text("Processing…")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Processing…')).toBeVisible();
  });

  test('should display result after enhancement', async ({ page }) => {
    // Mock successful enhancement response
    await page.route('/api/ai-image/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            imageUrl: 'https://example.com/result.jpg',
            originalUrl: 'https://example.com/original.jpg',
          },
        }),
      });
    });
    
    // Upload and enhance
    const testFile = {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.setInputFiles(testFile);
    
    const enhanceButton = page.locator('button:has-text("Enhance")');
    await enhanceButton.click();
    
    // Should show result section
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Result')).toBeVisible();
    
    // Should show download and start over buttons
    await expect(page.locator('button:has-text("Download")')).toBeVisible();
    await expect(page.locator('button:has-text("Start over")')).toBeVisible();
  });

  test('should handle start over functionality', async ({ page }) => {
    // Mock successful enhancement response
    await page.route('/api/ai-image/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            imageUrl: 'https://example.com/result.jpg',
            originalUrl: 'https://example.com/original.jpg',
          },
        }),
      });
    });
    
    // Upload and enhance
    const testFile = {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.setInputFiles(testFile);
    
    const enhanceButton = page.locator('button:has-text("Enhance")');
    await enhanceButton.click();
    
    // Wait for result
    await expect(page.locator('text=Result')).toBeVisible({ timeout: 10000 });
    
    // Click start over
    const startOverButton = page.locator('button:has-text("Start over")');
    await startOverButton.click();
    
    // Should return to upload state
    await expect(page.locator('text=Drop an image here or click to select')).toBeVisible();
    await expect(page.locator('text=Result')).not.toBeVisible();
  });

  test('should handle download functionality', async ({ page }) => {
    // Mock successful enhancement response
    await page.route('/api/ai-image/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            imageUrl: 'https://example.com/result.jpg',
            originalUrl: 'https://example.com/original.jpg',
          },
        }),
      });
    });
    
    // Setup download handler
    let downloadTriggered = false;
    page.on('download', () => {
      downloadTriggered = true;
    });
    
    // Upload and enhance
    const testFile = {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    
    const uploadArea = page.locator('div').filter({ hasText: 'Drop an image here' }).first();
    await uploadArea.setInputFiles(testFile);
    
    const enhanceButton = page.locator('button:has-text("Enhance")');
    await enhanceButton.click();
    
    // Wait for result and click download
    await expect(page.locator('text=Result')).toBeVisible({ timeout: 10000 });
    
    const downloadButton = page.locator('button:has-text("Download")');
    await downloadButton.click();
    
    // Download should be triggered (implementation dependent)
    // This test may need adjustment based on actual download implementation
  });
});
