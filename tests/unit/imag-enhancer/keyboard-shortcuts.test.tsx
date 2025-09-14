import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImagEnhancerIsland from '@/components/tools/ImagEnhancerIsland';

// Minimal i18n strings for the component
const strings = {
  dropText: 'Drop or click to upload',
  enhance: 'Enhance',
  processing: 'Processing…',
  model: 'Model',
  usage: 'Usage',
  result: 'Result',
  original: 'Original',
  allowedTypes: 'Allowed types',
  max: 'Max',
  download: 'Download',
  loading: 'Loading…',
  quotaBanner: 'Quota reached',
  toasts: {
    loadQuotaError: 'Failed to load quota',
    loadError: 'Failed to load',
    quotaReached: 'Quota reached',
    unsupportedType: 'Unsupported type',
    fileTooLargePrefix: 'Too large',
    processingFailed: 'Failed',
    successEnhanced: 'Success!',
  },
  compare: {
    sliderLabel: 'Compare',
    before: 'Before',
    after: 'After',
    handleAriaLabel: 'Drag to compare',
    keyboardHint: 'Use arrows to adjust; 0 to center; + / - to zoom; 1 to reset zoom',
    reset: 'Reset',
    loupeLabel: 'Loupe',
  },
  ui: {
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit',
    changeModel: 'Change model',
    done: 'Done',
    startOver: 'Start over',
    faceEnhance: 'Face enhance',
    upgrade: 'Upgrade',
    help: {
      button: 'Help',
      title: 'How to use',
      close: 'Close',
      sections: { upload: 'Upload', models: 'Models', compare: 'Compare & Inspect', quota: 'Quota' },
    },
  },
} as const;

describe('ImagEnhancerIsland keyboard shortcuts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock fetch for usage and enhance
    global.fetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      if (url.includes('/api/ai-image/usage')) {
        return new Response(
          JSON.stringify({ success: true, data: { ownerType: 'guest', usage: { used: 0, limit: 20, resetAt: null }, limits: { user: 20, guest: 3 } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ) as any;
      }
      if (url.includes('/api/ai-image/generate')) {
        return new Response(
          JSON.stringify({ success: true, data: { model: 'm', originalUrl: 'blob:mock', imageUrl: 'blob:mock', usage: { used: 1, limit: 20, resetAt: null }, limits: { user: 20, guest: 3 } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ) as any;
      }
      return new Response('{}', { status: 200 }) as any;
    }) as any;
  });

  it('adjusts slider with Arrow keys and resets with 0 / 1', async () => {
    render(<ImagEnhancerIsland strings={strings as any} />);

    // Choose a file via the hidden input
    // Query file input (dropzone)
    let input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!input) {
      input = document.querySelector('[aria-label="Image upload dropzone"] input[type="file"]') as HTMLInputElement | null;
    }
    expect(input).toBeTruthy();

    const file = new File([new Uint8Array([137, 80, 78, 71])], 'sample.png', { type: 'image/png' });
    // Fire change event
    fireEvent.change(input as Element, { target: { files: [file] } });

    // Click Enhance
    const enhanceBtn = await screen.findByRole('button', { name: /Enhance/i });
    expect(enhanceBtn).toBeEnabled();
    fireEvent.click(enhanceBtn);

    // Wait for slider to appear
    const slider = await screen.findByRole('slider');

    // Initial value
    const parseNow = () => Number(slider.getAttribute('aria-valuenow') || '0');
    const v0 = parseNow();

    slider.focus();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await waitFor(() => expect(parseNow()).toBeGreaterThan(v0));

    fireEvent.keyDown(slider, { key: '0' });
    await waitFor(() => expect(parseNow()).toBe(50));

    // Zoom reset with key "1"
    fireEvent.keyDown(slider, { key: '1' });
    // Not directly visible in aria, but should not throw
  });
});
