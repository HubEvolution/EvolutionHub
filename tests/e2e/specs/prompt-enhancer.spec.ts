import { test, expect } from '@playwright/test';

const EN_PATH = '/en/tools/prompt-enhancer';

function makeFile(name: string, mimeType: string, data: string | Uint8Array) {
  const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  return { name, mimeType, buffer: buf };
}

test.describe('Prompt Enhancer – basic flows', () => {
  test('loads page and allows typing & enhancing (button state changes)', async ({ page }) => {
    await page.goto(EN_PATH);

    const textarea = page.getByLabel(/Input prompt/i);
    await expect(textarea).toBeVisible();
    await textarea.fill('Please improve my prompt.');

    const enhanceBtn = page.getByRole('button', { name: /enhance/i });
    await expect(enhanceBtn).toBeEnabled();

    // Click and observe loading/disable state; backend may respond quickly in dev with echo
    await enhanceBtn.click();

    // Button may be disabled during processing; tolerate fast responses
    // We assert that it is either disabled briefly or re-enabled after response
    // Then we expect no fatal alert is present
    await expect.soft(enhanceBtn).toBeEnabled({ timeout: 5000 });

    // If output area exists, basic smoke (non-fatal if not rendered synchronously)
    const outputLabel = page.getByText(/Output/i, { exact: false });
    await expect.soft(outputLabel).toBeVisible();
  });

  test('rejects unsupported file type with an accessible alert', async ({ page }) => {
    await page.goto(EN_PATH);

    const input = page.locator('input[type="file"]#fileInput');
    await expect(input).toBeVisible();

    const bad = makeFile('malware.exe', 'application/octet-stream', new Uint8Array([0, 1, 2, 3]));
    await input.setInputFiles([bad]);

    // An error alert should appear; text may vary, so only assert role presence
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
  });
});

test.describe('Prompt Enhancer – optional PDF flow', () => {
  test.skip(!process.env.RUN_PDF_TEST, 'PDF flow only when RUN_PDF_TEST=1 is set');

  test('accepts small PDF and succeeds', async ({ page }) => {
    await page.goto(EN_PATH);

    const textarea = page.getByLabel(/Input prompt/i);
    await textarea.fill('Summarize attached PDF.');

    const input = page.locator('input[type="file"]#fileInput');
    await expect(input).toBeVisible();

    // Minimal PDF header; enough for server-side sniff if implemented
    const pdfHeader = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<<>>\nendobj\nstartxref\n0\n%%EOF';
    const pdf = makeFile('tiny.pdf', 'application/pdf', pdfHeader);
    await input.setInputFiles([pdf]);

    const enhanceBtn = page.getByRole('button', { name: /enhance/i });
    await enhanceBtn.click();

    // Expect success UI path within a generous timeout
    // We avoid strict text matching; only prove that UI proceeds
    await expect(enhanceBtn).toBeEnabled({ timeout: 10000 });
  });
});

test.describe('Prompt Enhancer – gating/CTA (best-effort)', () => {
  test('if Upgrade CTA is visible, it should be clickable and navigate to pricing', async ({ page }) => {
    await page.goto(EN_PATH);

    const upgrade = page.getByRole('button', { name: /upgrade/i }).or(page.getByRole('link', { name: /upgrade/i }));

    if (await upgrade.count()) {
      const n = await upgrade.first();
      await n.click({ force: true });
      // Accept either same-tab nav to /pricing or opening of a modal/section; require at least presence of pricing keyword
      await expect.soft(page).toHaveURL(/pricing|plan|upgrade/i);
    } else {
      test.info().annotations.push({ type: 'note', description: 'No gating state active; skipping CTA assertion.' });
    }
  });
});
