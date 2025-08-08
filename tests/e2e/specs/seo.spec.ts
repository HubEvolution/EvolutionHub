import { test, expect } from '@playwright/test';

test.describe('SEO Meta Tags', () => {
  test('should have correct meta tags for German locale', async ({ page }) => {
    await page.goto('/de');
    
    // Check title
    await expect(page).toHaveTitle('Entwickle die Zukunft mit KI-gestützten Tools | Evolution Hub');
    
    // Check description
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toBe('Streamline your workflow with our powerful suite of AI tools designed for developers and creators.');
    
    // Check og:title
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    expect(ogTitle).toBe('Entwickle die Zukunft mit KI-gestützten Tools | Evolution Hub');
    
    // Check og:description
    const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
    expect(ogDescription).toBe('Streamline your workflow with our powerful suite of AI tools designed for developers and creators.');
    
    // Check og:image
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    expect(ogImage).toBe('/assets/images/og-image-de.png');
    
    // Check twitter:title
    const twitterTitle = await page.getAttribute('meta[name="twitter:title"]', 'content');
    expect(twitterTitle).toBe('Entwickle die Zukunft mit KI-gestützten Tools | Evolution Hub');
    
    // Check twitter:description
    const twitterDescription = await page.getAttribute('meta[name="twitter:description"]', 'content');
    expect(twitterDescription).toBe('Streamline your workflow with our powerful suite of AI tools designed for developers and creators.');
    
    // Check twitter:image
    const twitterImage = await page.getAttribute('meta[name="twitter:image"]', 'content');
    expect(twitterImage).toBe('/assets/images/og-image-de.png');
    
    // Check hreflang links
    const deHreflang = await page.getAttribute('link[rel="alternate"][hreflang="de"]', 'href');
    expect(deHreflang).toBe('http://localhost:3000/de/');
    
    const enHreflang = await page.getAttribute('link[rel="alternate"][hreflang="en"]', 'href');
    expect(enHreflang).toBe('http://localhost:3000/en/');
    
    const defaultHreflang = await page.getAttribute('link[rel="alternate"][hreflang="x-default"]', 'href');
    expect(defaultHreflang).toBe('http://localhost:3000/');
  });
  
  test('should have correct meta tags for English locale', async ({ page }) => {
    await page.goto('/en');
    
    // Check title
    await expect(page).toHaveTitle('Build the Future with AI-Powered Tools | Evolution Hub');
    
    // Check description
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toBe('Streamline your workflow with our powerful suite of AI tools designed for developers and creators.');
    
    // Check og:title
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    expect(ogTitle).toBe('Build the Future with AI-Powered Tools | Evolution Hub');
    
    // Check og:description
    const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
    expect(ogDescription).toBe('Streamline your workflow with our powerful suite of AI tools designed for developers and creators.');
    
    // Check og:image
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    expect(ogImage).toBe('/assets/images/og-image-en.png');
    
    // Check twitter:title
    const twitterTitle = await page.getAttribute('meta[name="twitter:title"]', 'content');
    expect(twitterTitle).toBe('Build the Future with AI-Powered Tools | Evolution Hub');
    
    // Check twitter:description
    const twitterDescription = await page.getAttribute('meta[name="twitter:description"]', 'content');
    expect(twitterDescription).toBe('Streamline your workflow with our powerful suite of AI tools designed for developers and creators.');
    
    // Check twitter:image
    const twitterImage = await page.getAttribute('meta[name="twitter:image"]', 'content');
    expect(twitterImage).toBe('/assets/images/og-image-en.png');
    
    // Check hreflang links
    const deHreflang = await page.getAttribute('link[rel="alternate"][hreflang="de"]', 'href');
    expect(deHreflang).toBe('http://localhost:3000/de/');
    
    const enHreflang = await page.getAttribute('link[rel="alternate"][hreflang="en"]', 'href');
    expect(enHreflang).toBe('http://localhost:3000/en/');
    
    const defaultHreflang = await page.getAttribute('link[rel="alternate"][hreflang="x-default"]', 'href');
    expect(defaultHreflang).toBe('http://localhost:3000/');
  });
});