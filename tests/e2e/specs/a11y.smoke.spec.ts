import { test } from '@playwright/test';

// Allow a bit more time for full-page loads + axe evaluation in dev
test.setTimeout(60_000);

const routes = ['/', '/en', '/pricing', '/en/tools/ai-image-enhancer'];

test.describe('A11y (axe) smoke', () => {
  for (const route of routes) {
    test(`axe check (warn-only) on ${route}`, async ({ page }) => {
      // Pre-inject axe via init script to avoid navigation races
      await page.addInitScript({
        content: `
          (function(){
            try {
              var s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js';
              s.async = true;
              (document.head || document.documentElement).appendChild(s);
            } catch (e) {}
          })();
        `,
      });

      await page.goto(route, { waitUntil: 'load' });
      // Wait until axe is available (best-effort)
      await page.waitForFunction(() => (window as any).axe, { timeout: 4000 }).catch(() => {});

      const results = await page.evaluate(async () => {
        const axe: any = (window as any).axe;
        if (!axe) return { violations: [] };
        return await axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          resultTypes: ['violations'],
        });
      });
      const violations = (results?.violations || []) as Array<{ id: string; impact?: string; help?: string; nodes?: Array<{ target?: string[] }> }>;
      const seriousOrWorse = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      if (seriousOrWorse.length > 0) {
        console.warn(`[axe][${route}] ${seriousOrWorse.length} serious/critical issue(s)`);
        for (const v of seriousOrWorse.slice(0, 5)) {
          const sel = v.nodes && v.nodes[0] && Array.isArray(v.nodes[0].target) ? v.nodes[0].target[0] : '';
          console.warn(`- rule=${v.id} impact=${v.impact} sel=${sel} help=${v.help || ''}`);
        }
      }
    });
  }
});
