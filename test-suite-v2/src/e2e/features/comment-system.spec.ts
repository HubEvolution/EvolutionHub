import { test, expect, Page } from '@playwright/test';
import { getDb } from '../../../src/lib/db/helpers';
import {
  completeMagicLinkFlow,
  completeWelcomeProfile,
  generateUniqueEmail,
} from '../../../fixtures/auth-helpers';

test.describe('Comment System E2E Tests', () => {
  let testUserEmail: string;

  test.describe('Guest User Comments', () => {
    test('should allow guest users to post comments', async ({ page }) => {
      // Fill out guest comment form
      await page.fill('textarea[name="content"]', 'This is a test comment from a guest user');
      await page.fill('input[name="authorName"]', 'Guest Tester');
      await page.fill('input[name="authorEmail"]', 'guest@example.com');

      // Submit comment
      await page.click('button:has-text("Kommentar posten")');

      // Verify comment appears
      await expect(page.locator('.comment-content')).toContainText('This is a test comment from a guest user');
      await expect(page.locator('.comment-author')).toContainText('Guest Tester');
    });

    test('should validate guest comment form', async ({ page }) => {
      // Try to submit without required fields
      await page.click('button:has-text("Kommentar posten")');

      // Should show validation errors
      await expect(page.locator('.error-message')).toContainText('Kommentar ist erforderlich');
      await expect(page.locator('.error-message')).toContainText('Name ist erforderlich');
      await expect(page.locator('.error-message')).toContainText('E-Mail ist erforderlich');
    });

    test('should validate guest email format', async ({ page }) => {
      // Fill form with invalid email
      await page.fill('textarea[name="content"]', 'Valid comment content');
      await page.fill('input[name="authorName"]', 'Guest Tester');
      await page.fill('input[name="authorEmail"]', 'invalid-email');

      await page.click('button:has-text("Kommentar posten")');

      // Should show email format error
      await expect(page.locator('.error-message')).toContainText('Bitte gib eine gültige E-Mail-Adresse ein');
    });

    test('should enforce rate limiting for guest users', async ({ page }) => {
      // Post multiple comments rapidly
      for (let i = 0; i < 6; i++) {
        await page.fill('textarea[name="content"]', `Rapid comment ${i + 1}`);
        await page.fill('input[name="authorName"]', 'Rate Limit Tester');
        await page.fill('input[name="authorEmail"]', `ratetest${i}@example.com`);

        await page.click('button:has-text("Kommentar posten")');

        // Wait a bit between posts
        await page.waitForTimeout(100);
      }

      // Should eventually show rate limit message
      await expect(page.locator('.rate-limit-message')).toBeVisible();
    });
  });

  test.describe('Authenticated User Comments', () => {
    test.beforeEach(async ({ page }) => {
      // Create a unique test user and sign in via Magic Link (local E2E uses fake provider)
      testUserEmail = generateUniqueEmail('comment-e2e');
      await completeMagicLinkFlow(page, testUserEmail, { locale: 'en', targetAfterAuth: '/dashboard' });

      // If first-time login redirects to welcome-profile, complete it
      if (/welcome-profile/.test(page.url())) {
        await completeWelcomeProfile(page, {
          name: 'Test User',
          username: `test-${Date.now()}`,
        });
      }

      // Navigate to comments demo
      await page.goto('/blog/comments-demo');
    });

    test('should allow authenticated users to post comments', async ({ page }) => {
      // Fill out comment form
      await page.fill('textarea[name="content"]', 'This is a test comment from an authenticated user');

      // Submit comment
      await page.click('button:has-text("Kommentar posten")');

      // Verify comment appears with user info
      await expect(page.locator('.comment-content')).toContainText('This is a test comment from an authenticated user');
      await expect(page.locator('.comment-author')).toContainText('Test User');
    });

    test('should allow users to edit their own comments', async ({ page }) => {
      // Post a comment first
      await page.fill('textarea[name="content"]', 'Original comment content');
      await page.click('button:has-text("Kommentar posten")');

      // Wait for comment to appear and click edit
      await page.waitForSelector('.comment-actions');
      await page.click('button:has-text("Bearbeiten")');

      // Edit the comment
      const editTextarea = page.locator('textarea[value="Original comment content"]');
      await editTextarea.fill('Updated comment content');
      await page.click('button:has-text("Speichern")');

      // Verify updated content
      await expect(page.locator('.comment-content')).toContainText('Updated comment content');
      await expect(page.locator('.comment-edited-indicator')).toBeVisible();
    });

    test('should allow users to delete their own comments', async ({ page }) => {
      // Post a comment first
      await page.fill('textarea[name="content"]', 'Comment to be deleted');
      await page.click('button:has-text("Kommentar posten")');

      // Wait for comment and click delete
      await page.waitForSelector('.comment-actions');
      await page.click('button:has-text("Löschen")');

      // Confirm deletion in dialog
      await page.click('button:has-text("Löschen")');

      // Verify comment is removed
      await expect(page.locator('.comment-content')).not.toContainText('Comment to be deleted');
    });

    test('should allow users to reply to comments', async ({ page }) => {
      // Post a parent comment first
      await page.fill('textarea[name="content"]', 'This is a parent comment');
      await page.click('button:has-text("Kommentar posten")');

      // Wait for comment and click reply
      await page.waitForSelector('.comment-actions');
      await page.click('button:has-text("Antworten")');

      // Fill reply form
      await page.fill('textarea[name="content"]', 'This is a reply to the parent comment');
      await page.click('button:has-text("Antwort posten")');

      // Verify reply appears nested under parent
      await expect(page.locator('.comment-reply')).toContainText('This is a reply to the parent comment');
    });

    test('should allow users to report inappropriate comments', async ({ page }) => {
      // First, we need another user to post a comment to report
      // For this test, we'll simulate by creating a comment via API or using a different approach

      // Navigate to a different page and back to simulate another user's comment
      await page.goto('/blog/comments-demo?seed=test');

      // Look for existing comments to report
      const reportButton = page.locator('button:has-text("Melden")').first();
      if (await reportButton.isVisible()) {
        await reportButton.click();

        // Select spam reason
        await page.click('input[name="reason"][value="spam"]');
        await page.fill('textarea[name="description"]', 'This comment appears to be spam');
        await page.click('button:has-text("Melden")');

        // Verify report confirmation
        await expect(page.locator('.success-message')).toContainText('Kommentar wurde gemeldet');
      }
    });
  });

  test.describe('Comment Moderation', () => {
    test('should show different comment states correctly', async ({ page }) => {
      // Navigate to demo page with different comment states
      await page.goto('/blog/comments-demo?show=all');

      // Check for different comment states
      await expect(page.locator('[data-status="approved"]')).toBeVisible();
      await expect(page.locator('[data-status="pending"]')).toBeVisible();
      await expect(page.locator('[data-status="rejected"]')).toBeVisible();
    });

    test('should display comment statistics', async ({ page }) => {
      await page.goto('/blog/comments-demo?stats=true');

      // Check for statistics display
      await expect(page.locator('.comment-stats')).toBeVisible();
      await expect(page.locator('.stats-total')).toContainText('Kommentare insgesamt');
    });
  });

  test.describe('Comment Validation and Security', () => {
    test('should prevent XSS attacks in comments', async ({ page }) => {
      const maliciousContent = '<script>alert("xss")</script>Test content';

      await page.fill('textarea[name="content"]', maliciousContent);
      await page.fill('input[name="authorName"]', 'XSS Tester');
      await page.fill('input[name="authorEmail"]', 'xss@example.com');

      await page.click('button:has-text("Kommentar posten")');

      // Verify script tags are sanitized
      await expect(page.locator('.comment-content')).not.toContainText('<script>');
      await expect(page.locator('.comment-content')).toContainText('Test content');
    });

    test('should validate comment length limits', async ({ page }) => {
      // Test minimum length
      await page.fill('textarea[name="content"]', 'Hi');
      await page.fill('input[name="authorName"]', 'Length Tester');
      await page.fill('input[name="authorEmail"]', 'length@example.com');

      await page.click('button:has-text("Kommentar posten")');

      await expect(page.locator('.error-message')).toContainText('mindestens 3 Zeichen');

      // Test maximum length
      const longContent = 'a'.repeat(2001);
      await page.fill('textarea[name="content"]', longContent);

      await page.click('button:has-text("Kommentar posten")');

      await expect(page.locator('.error-message')).toContainText('weniger als 2000 Zeichen');
    });

    test('should detect and prevent spam content', async ({ page }) => {
      const spamContent = 'Buy now! Limited time offer! Click here to get rich quick!';

      await page.fill('textarea[name="content"]', spamContent);
      await page.fill('input[name="authorName"]', 'Spam Tester');
      await page.fill('input[name="authorEmail"]', 'spam@example.com');

      await page.click('button:has-text("Kommentar posten")');

      // Should show spam detection error
      await expect(page.locator('.error-message')).toContainText('unerlaubte Inhalte');
    });
  });

  test.describe('Responsive Design and Accessibility', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/blog/comments-demo');

      // Should still be able to interact with comment form
      await expect(page.locator('textarea[name="content"]')).toBeVisible();
      await expect(page.locator('button:has-text("Kommentar posten")')).toBeVisible();

      // Form should be usable on mobile
      await page.fill('textarea[name="content"]', 'Mobile test comment');
      await page.fill('input[name="authorName"]', 'Mobile Tester');
      await page.fill('input[name="authorEmail"]', 'mobile@example.com');

      await page.click('button:has-text("Kommentar posten")');

      await expect(page.locator('.comment-content')).toContainText('Mobile test comment');
    });

    test('should be accessible via keyboard navigation', async ({ page }) => {
      await page.goto('/blog/comments-demo');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('textarea[name="content"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="authorName"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="authorEmail"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Kommentar posten")')).toBeFocused();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/blog/comments-demo');

      // Check for proper ARIA attributes
      await expect(page.locator('textarea[name="content"]')).toHaveAttribute('aria-label');
      await expect(page.locator('button[type="submit"]')).toHaveAttribute('aria-label');

      // Check for proper roles
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="complementary"]')).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show new comments in real-time', async ({ page, context }) => {
      // Open two browser contexts
      const page2 = await context.newPage();

      // Navigate both pages to comments demo
      await page.goto('/blog/comments-demo');
      await page2.goto('/blog/comments-demo');

      // Post comment in first page
      await page.fill('textarea[name="content"]', 'Real-time test comment');
      await page.fill('input[name="authorName"]', 'RT Tester 1');
      await page.fill('input[name="authorEmail"]', 'rt1@example.com');

      await page.click('button:has-text("Kommentar posten")');

      // Second page should show the new comment
      await expect(page2.locator('.comment-content')).toContainText('Real-time test comment');

      await page2.close();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error by intercepting API calls
      await page.route('**/api/comments**', route => {
        route.abort('failed');
      });

      await page.goto('/blog/comments-demo');

      await page.fill('textarea[name="content"]', 'Network error test');
      await page.fill('input[name="authorName"]', 'Error Tester');
      await page.fill('input[name="authorEmail"]', 'error@example.com');

      await page.click('button:has-text("Kommentar posten")');

      // Should show user-friendly error message
      await expect(page.locator('.error-message')).toContainText('Fehler beim Posten');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server error
      await page.route('**/api/comments**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { type: 'server_error', message: 'Internal server error' }
          })
        });
      });

      await page.goto('/blog/comments-demo');

      await page.fill('textarea[name="content"]', 'Server error test');
      await page.fill('input[name="authorName"]', 'Error Tester');
      await page.fill('input[name="authorEmail"]', 'error@example.com');

      await page.click('button:has-text("Kommentar posten")');

      // Should show user-friendly error message
      await expect(page.locator('.error-message')).toContainText('Server-Fehler');
    });
  });

  test.describe('Internationalization', () => {
    test('should display comments in German locale', async ({ page }) => {
      await page.goto('/de/blog/comments-demo');

      // Check for German text
      await expect(page.locator('h1')).toContainText('Kommentare');
      await expect(page.locator('button')).toContainText('Kommentar posten');
    });

    test('should display comments in English locale', async ({ page }) => {
      await page.goto('/en/blog/comments-demo');

      // Check for English text
      await expect(page.locator('h1')).toContainText('Comments');
      await expect(page.locator('button')).toContainText('Post Comment');
    });
  });

  test.describe('Performance', () => {
    test('should load comments efficiently', async ({ page }) => {
      // Measure page load time
      const startTime = Date.now();

      await page.goto('/blog/comments-demo?performance=true');
      await page.waitForSelector('.comments-loaded');

      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large number of comments', async ({ page }) => {
      await page.goto('/blog/comments-demo?count=100');

      // Should display pagination or virtual scrolling
      await expect(page.locator('.pagination, .virtual-scroll')).toBeVisible();

      // Should still be responsive
      const responseStart = Date.now();
      await page.click('button:has-text("2")'); // Go to page 2
      const responseTime = Date.now() - responseStart;

      expect(responseTime).toBeLessThan(1000);
    });
  });
});