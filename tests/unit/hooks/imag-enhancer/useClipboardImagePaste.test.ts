import { renderHook } from '@testing-library/react';
import { vi, expect, test } from 'vitest';
import { useClipboardImagePaste } from '@/components/tools/imag-enhancer/hooks/useClipboardImagePaste';

function dispatchPasteWithFile(file: File) {
  const e = new Event('paste', { bubbles: true }) as unknown as ClipboardEvent & {
    clipboardData: DataTransfer;
  };
  (e as any).clipboardData = {
    items: [
      {
        kind: 'file',
        getAsFile: () => file,
      },
    ],
  } as any;
  window.dispatchEvent(e);
}

test('useClipboardImagePaste calls onSelectFile for image file', () => {
  const onSelectFile = vi.fn();
  renderHook(() => useClipboardImagePaste(onSelectFile));

  const img = new File(['x'], 'img.png', { type: 'image/png' });
  dispatchPasteWithFile(img);

  expect(onSelectFile).toHaveBeenCalledTimes(1);
  expect(onSelectFile).toHaveBeenCalledWith(img);
});
