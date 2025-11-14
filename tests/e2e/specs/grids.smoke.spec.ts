import { test, expect, Page } from '@playwright/test';

async function countColumnsByPositions(
  page: Page,
  containerSelector: string,
  itemSelector?: string
) {
  return await page.evaluate(
    ({ containerSelector, itemSelector }: { containerSelector: string; itemSelector?: string }) => {
      const container = document.querySelector(containerSelector) as HTMLElement | null;
      if (!container) return -1;
      const items = Array.from(
        (itemSelector ? container.querySelectorAll(itemSelector) : container.children) as any
      ) as HTMLElement[];
      if (!items.length) return 0;
      const firstRowTop = items[0].offsetTop;
      const firstRow = items.filter((el) => el.offsetTop === firstRowTop);
      // Unique left positions within first row
      const lefts = new Set(firstRow.map((el) => el.offsetLeft));
      return lefts.size || firstRow.length;
    },
    { containerSelector, itemSelector }
  );
}

async function countColumnsByComputedStyle(page: Page, containerSelector: string) {
  return await page.evaluate(({ containerSelector }: { containerSelector: string }) => {
    const el = document.querySelector(containerSelector) as HTMLElement | null;
    if (!el) return -1;
    const cs = window.getComputedStyle(el);
    const tracks = cs.gridTemplateColumns; // e.g., "200px 200px" or "none"
    if (!tracks || tracks === 'none') return 0;
    // Split on spaces that separate track sizes. Compress multiple spaces first.
    const parts = tracks.trim().replace(/\s+/g, ' ').split(' ');
    return parts.length;
  }, { containerSelector });
}

// Pricing grid: grid-cols-1 (mobile) → md:grid-cols-4 (tablet/desktop)
// We locate container heuristically via role of plan cards inside the pricing page and expect 1 and 4 columns.

test.describe('Responsive Grids (smoke)', () => {
  test('pricing grid is 1 col on mobile and 4 cols on md+', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pricing');

    // The pricing grid container with plans is the first .grid after mount
    const gridSelector = 'div.grid.mt-6';
    await page.waitForSelector(gridSelector);

    const colsMobile = await countColumnsByPositions(page, gridSelector);
    expect(colsMobile).toBe(1);

    // Tablet/Desktop (md)
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForTimeout(50);
    const colsMd = await countColumnsByPositions(page, gridSelector);
    expect(colsMd).toBe(4);
  });

  test('footer grid is 1 (mobile), 2 (md), 5 (lg) columns', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const footerGrid = 'footer .grid.mb-12';
    await page.waitForSelector(footerGrid);

    // Prefer computed track count; fallback to positional count
    let colsMobile = await countColumnsByComputedStyle(page, footerGrid);
    if (colsMobile <= 0) colsMobile = await countColumnsByPositions(page, footerGrid);
    expect(colsMobile).toBe(1);

    // md: 768px → 2 columns
    await page.setViewportSize({ width: 768, height: 800 });
    await page.waitForTimeout(50);
    let colsMd = await countColumnsByComputedStyle(page, footerGrid);
    if (colsMd <= 0) colsMd = await countColumnsByPositions(page, footerGrid);
    expect(colsMd).toBe(2);

    // lg: 1024px → 5 columns
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForTimeout(50);
    let colsLg = await countColumnsByComputedStyle(page, footerGrid);
    if (colsLg <= 0) colsLg = await countColumnsByPositions(page, footerGrid);
    expect(colsLg).toBe(5);
  });
});
