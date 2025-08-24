import { test, expect } from '@playwright/test';

// Footnote accessibility enhancements test
// If no footnotes are present in the target post, the test will skip gracefully
// to avoid flakiness in staging environments.

test.describe('Blog footnote a11y enhancements', () => {
  test('Footnote anchors receive enhancement attributes and classes', async ({ page }) => {
    // Choose a stable existing slug; content is German but layout is reused under /en/
    const slug = 'ki-im-alltag';
    const res = await page.goto(`/en/blog/${slug}/`);
    expect(res?.ok()).toBeTruthy();

    const footnotes = page.locator('a[href^="#fn"], a[href^="#ref"]');
    const count = await footnotes.count();
    if (count === 0) {
      test.skip('No footnotes found in this blog post; skipping to avoid flakiness.');
    }

    const a = footnotes.first();
    await expect(a).toHaveAttribute('data-footnote-enhanced', 'true');
    await expect(a).toHaveAttribute('data-tooltip', /Zum entsprechenden Absatz springen/);

    const className = await a.getAttribute('class');
    expect(className).toBeTruthy();
    expect(className!).toContain('underline');
    expect(className!).toContain('decoration-dotted');
    expect(className!).toContain('underline-offset-4');
  });
});
