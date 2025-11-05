import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function captureScreenshots() {
  const outputDir = resolve('docs/media');
  await ensureDir(outputDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto('https://hub-evolution.com/tools', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: resolve(outputDir, 'evolution-hub-tools.png'), fullPage: true });

    await page.goto(`file://${resolve('docs/media/lottie-preview.html')}`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: resolve(outputDir, 'imag-enhancer-preview.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch((error) => {
  console.error('Failed to capture screenshots:', error);
  process.exitCode = 1;
});
