#!/usr/bin/env node
import { chromium } from 'playwright';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/dev/verify-enhancer-download.mjs <absolute-path-to-png>');
    process.exit(2);
  }
  const url = 'https://hub-evolution.com/en/tools/imag-enhancer/app';

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  console.log('[step] goto', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Ensure app/root is ready
  await page.waitForSelector('#imag-enhancer-root', { state: 'visible', timeout: 30000 });

  // Find the hidden file input in the dropzone and set the file
  console.log('[step] upload file:', filePath);
  const fileInput = await page.waitForSelector('#imag-enhancer-root input[type="file"]', { timeout: 15000 });
  await fileInput.setInputFiles(filePath);

  // Wait for preview to appear (blob URL image inside dropzone)
  await page.waitForSelector('#imag-enhancer-root img', { timeout: 30000 });
  console.log('[ok] preview image rendered');

  // Choose a Cloudflare model (value starts with @cf/)
  const modelSelect = await page.waitForSelector('select#model', { timeout: 15000 });
  const options = await modelSelect.evaluate((sel) => Array.from(sel.options).map(o => ({ value: o.value, label: o.textContent || '' })));
  const cfOpt = options.find(o => o.value.startsWith('@cf/'));
  if (!cfOpt) {
    console.error('No Cloudflare model option found. Options:', options);
    process.exit(1);
  }
  await modelSelect.selectOption(cfOpt.value);
  console.log('[step] selected model:', cfOpt.value);

  // Click Enhance
  const enhanceBtn = await page.waitForSelector('button:has-text("Enhance")', { timeout: 15000 });
  console.log('[step] click Enhance');
  const apiWait = page.waitForResponse((res) => res.url().includes('/api/ai-image/generate'), { timeout: 180000 });
  await enhanceBtn.click();
  const apiResp = await apiWait;
  const status = apiResp.status();
  const body = await apiResp.json().catch(() => null);
  console.log('[api] /api/ai-image/generate status:', status);
  if (status !== 200 || !body || body.success !== true || !body.data || !body.data.imageUrl) {
    console.error('Enhance failed or unexpected response:', { status, body });
    process.exit(1);
  }
  console.log('[ok] enhance returned imageUrl:', body.data.imageUrl);

  // Wait for result to render (compare view) and the Download link to appear
  await page.waitForSelector('a:has-text("Download")', { timeout: 120000 });

  // Download the result via the Download button
  console.log('[step] click Download');
  const [ download ] = await Promise.all([
    page.waitForEvent('download', { timeout: 180000 }),
    page.click('a:has-text("Download")'),
  ]);

  const dUrl = download.url();
  const suggested = download.suggestedFilename();
  const path = await download.path();
  console.log('[download] url:', dUrl);
  console.log('[download] suggested filename:', suggested);
  if (!path) {
    // In headed mode path() may be null until saveAs; try save to tmp
    const tmp = `./download-${Date.now()}-${suggested || 'image'}`;
    await download.saveAs(tmp);
    console.log('[download] saved as:', tmp);
  } else {
    console.log('[download] saved to:', path);
  }

  // Basic validity: non-zero size
  const stream = await download.createReadStream();
  let total = 0;
  if (stream) {
    for await (const chunk of stream) total += chunk.length;
  }
  if (total <= 0) {
    console.error('Downloaded file is empty (0 bytes)');
    process.exit(1);
  }
  console.log('[ok] downloaded bytes:', total);

  await browser.close();
  console.log('\nSUCCESS: Upload, enhance, and download validated.');
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
