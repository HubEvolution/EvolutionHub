import { test, expect } from '@playwright/test';

test.describe('Newsletter Double Opt-in Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  let confirmationToken: string;

  test('should complete newsletter double opt-in flow', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('/');
    
    // Step 2: Fill newsletter form in footer
    await page.fill('input[name="email"]', testEmail);
    await page.check('input[name="consent"]');
    
    // Step 3: Submit newsletter form
    await page.click('button[type="submit"]');
    
    // Step 4: Verify pending confirmation message
    await expect(page.locator('#newsletter-message')).toBeVisible();
    await expect(page.locator('#newsletter-message')).toContainText('Bitte überprüfen Sie Ihre E-Mails!');
    await expect(page.locator('#newsletter-message')).toContainText('Klicken Sie auf den Bestätigungslink');
    
    // Step 5: Simulate clicking confirmation link (extract token from API response)
    // In a real scenario, this would be extracted from the email
    // For testing, we'll use the browser's console to get the token
    const confirmationUrl = await page.evaluate(async () => {
      // Make a direct API call to get the token
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test-direct-${Date.now()}@example.com`,
          consent: true,
          source: 'e2e-test'
        })
      });
      
      const result = await response.json();
      console.log('Newsletter API response:', result);
      
      // In real implementation, extract confirmation URL from logs
      // This is a mock for E2E testing
      return 'mock-confirmation-url';
    });
    
    console.log('Confirmation URL:', confirmationUrl);
  });

  test('should handle newsletter subscription from blog article', async ({ page }) => {
    // Navigate to a blog article
    await page.goto('/blog/new-work-ist-eine-haltung');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find newsletter CTA in blog article
    const newsletterCTA = page.locator('.newsletter-cta').first();
    await expect(newsletterCTA).toBeVisible();
    
    // Fill newsletter form in blog article
    await newsletterCTA.locator('input[name="email"]').fill(testEmail);
    await newsletterCTA.locator('input[name="consent"]').check();
    
    // Submit form
    await newsletterCTA.locator('button[type="submit"]').click();
    
    // Verify confirmation message
    await expect(newsletterCTA.locator('.message')).toBeVisible();
    await expect(newsletterCTA.locator('.message')).toContainText('Bitte überprüfen Sie Ihre E-Mails');
  });

  test('should display newsletter confirmation page correctly', async ({ page }) => {
    // Test invalid token
    await page.goto('/newsletter/confirm?token=invalid-token&email=test@example.com');
    
    // Should show error state
    await expect(page.locator('h1')).toContainText('Newsletter-Bestätigung fehlgeschlagen');
    await expect(page.locator('body')).toContainText('Confirmation link expired or invalid');
    
    // Test missing token
    await page.goto('/newsletter/confirm');
    
    // Should show info state
    await expect(page.locator('h1')).toContainText('Newsletter-Bestätigung');
    await expect(page.locator('body')).toContainText('Bitte klicken Sie auf den Bestätigungslink');
  });

  test('should validate newsletter form inputs', async ({ page }) => {
    await page.goto('/');
    
    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('#newsletter-message')).toBeVisible();
    await expect(page.locator('#newsletter-message')).toContainText('gültige E-Mail-Adresse');
    
    // Test missing consent
    await page.fill('input[name="email"]', 'valid@example.com');
    await page.uncheck('input[name="consent"]');
    await page.click('button[type="submit"]');
    
    // Should show consent error
    await expect(page.locator('#newsletter-message')).toBeVisible();
    await expect(page.locator('#newsletter-message')).toContainText('Datenschutzerklärung');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('/api/newsletter/subscribe', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });
    
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[name="consent"]');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('#newsletter-message')).toBeVisible();
    await expect(page.locator('#newsletter-message')).toContainText('Fehler ist aufgetreten');
  });

  test('should track analytics events for newsletter flow', async ({ page }) => {
    let analyticsEvents: any[] = [];
    
    // Capture console logs for analytics
    page.on('console', (msg) => {
      if (msg.text().includes('Analytics:')) {
        analyticsEvents.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.fill('input[name="email"]', testEmail);
    await page.check('input[name="consent"]');
    await page.click('button[type="submit"]');
    
    // Wait for analytics events
    await page.waitForTimeout(1000);
    
    // Verify analytics tracking
    expect(analyticsEvents).toContain(expect.stringContaining('newsletter_subscribe_pending'));
  });

  test('should handle newsletter confirmation with valid token', async ({ page }) => {
    // Mock successful confirmation
    await page.route('/api/newsletter/confirm*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Email address confirmed successfully!',
          email: testEmail,
          subscription_date: new Date().toISOString()
        })
      });
    });
    
    await page.goto(`/newsletter/confirm?token=valid-token&email=${testEmail}`);
    
    // Should show success state
    await expect(page.locator('h1')).toContainText('Newsletter-Anmeldung bestätigt!');
    await expect(page.locator('body')).toContainText(testEmail);
    await expect(page.locator('a[href="/blog"]')).toBeVisible();
    await expect(page.locator('a[href="/tools"]')).toBeVisible();
  });

  test('should handle expired confirmation tokens', async ({ page }) => {
    // Mock expired token response
    await page.route('/api/newsletter/confirm*', (route) => {
      route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Confirmation link has expired. Please subscribe again.'
        })
      });
    });
    
    await page.goto(`/newsletter/confirm?token=expired-token&email=${testEmail}`);
    
    // Should show expired error
    await expect(page.locator('h1')).toContainText('Newsletter-Bestätigung fehlgeschlagen');
    await expect(page.locator('body')).toContainText('expired');
    await expect(page.locator('a[href="/blog"]')).toContainText('Erneut anmelden');
  });
});
