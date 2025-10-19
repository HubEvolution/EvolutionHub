import { renderHook } from '@testing-library/react';
import { vi, expect, test } from 'vitest';
import { useGlobalShortcuts } from '@/components/tools/imag-enhancer/hooks/useGlobalShortcuts';

function dispatchKey(key: string, opts: Partial<KeyboardEvent> = {}) {
  const e = new KeyboardEvent('keydown', { key, ...opts });
  window.dispatchEvent(e);
}

test('useGlobalShortcuts triggers callbacks when enabled', () => {
  const onReset = vi.fn();
  const onDownload = vi.fn();
  const onToggleLoupe = vi.fn();
  renderHook(() => useGlobalShortcuts({ enabled: true, onReset, onDownload, onToggleLoupe }));

  dispatchKey('r');
  expect(onReset).toHaveBeenCalledTimes(1);

  dispatchKey('s', { metaKey: true });
  expect(onDownload).toHaveBeenCalledTimes(1);

  dispatchKey('l');
  expect(onToggleLoupe).toHaveBeenCalledTimes(1);
});

test('useGlobalShortcuts ignores events from editable targets', () => {
  const onReset = vi.fn();
  const onDownload = vi.fn();
  const onToggleLoupe = vi.fn();
  renderHook(() => useGlobalShortcuts({ enabled: true, onReset, onDownload, onToggleLoupe }));

  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();

  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
  expect(onReset).not.toHaveBeenCalled();
});
