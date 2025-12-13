import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EnhancerForm from './EnhancerForm';
import { MAX_FILE_BYTES, MAX_FILES } from '@/config/prompt-enhancer';

// Mock i18n utilities
vi.mock('@/utils/i18n', () => ({
  getI18n: () => (key: string, params?: Record<string, any>) => {
    const map: Record<string, string> = {
      'pages.tools.prompt-enhancer.form.inputLabel': 'Input prompt',
      'pages.tools.prompt-enhancer.form.inputPlaceholder': 'Describe...',
      'pages.tools.prompt-enhancer.form.modeLabel': 'Style',
      'pages.tools.prompt-enhancer.form.enhanceButton': 'Enhance',
      'pages.tools.prompt-enhancer.form.enhancing': 'Enhancing…',
      'pages.tools.prompt-enhancer.form.outputLabel': 'Enhanced prompt',
      'pages.tools.prompt-enhancer.form.copy': 'Copy',
      'pages.tools.prompt-enhancer.form.copied': 'Copied',
      'pages.tools.prompt-enhancer.form.clear': 'Clear',
      'pages.tools.prompt-enhancer.form.error.required': 'Please enter a prompt.',
      'pages.tools.prompt-enhancer.form.error.length': 'Maximum length is 1000 characters.',
      'pages.tools.prompt-enhancer.form.error.rateLimit':
        'Too many requests. Please wait and try again.',
      'pages.tools.prompt-enhancer.form.error.unknown': 'Something went wrong. Please try again.',
      'pages.tools.prompt-enhancer.form.error.network': 'Network error.',
      'pages.tools.prompt-enhancer.form.files.label': 'Files (optional)',
      'pages.tools.prompt-enhancer.form.files.dropHint': 'Drop files here or click to select',
      'pages.tools.prompt-enhancer.form.files.allowedTypes': 'Allowed types',
      'pages.tools.prompt-enhancer.form.files.maxSize': 'Max size',
      'pages.tools.prompt-enhancer.form.files.maxCount': 'Max files: {count}',
      'pages.tools.prompt-enhancer.form.files.remove': 'Remove',
      'pages.tools.prompt-enhancer.form.error.file.invalidType': 'Unsupported file type.',
      'pages.tools.prompt-enhancer.form.error.file.tooLarge': 'File is too large. Max: {max}',
      'pages.tools.prompt-enhancer.form.error.files.tooMany': 'Too many files. Maximum {count}.',
      'pages.tools.prompt-enhancer.form.mode.creative': 'Creative',
      'pages.tools.prompt-enhancer.form.mode.professional': 'Professional',
      'pages.tools.prompt-enhancer.form.mode.concise': 'Concise',
    };
    const value = map[key] || key;
    return value.replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''));
  },
}));
vi.mock('@/lib/i18n', () => ({ getLocale: () => 'en' }));

// Mock useEnhance to avoid network
vi.mock('./hooks/useEnhance', () => ({
  useEnhance: () => ({
    enhance: vi.fn(async () => ({
      success: true,
      data: {
        enhancedPrompt: 'ok',
        usage: { used: 1, limit: 5, resetAt: null },
        limits: { user: 20, guest: 3 },
      },
    })),
  }),
}));

describe('EnhancerForm (files validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error for unsupported file type', async () => {
    render(<EnhancerForm />);
    const dropzone = screen.getByLabelText(/drop files here or click to select/i);
    const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

    const bad = new File([new Blob(['abc'])], 'malware.exe', { type: 'application/x-msdownload' });
    Object.defineProperty(input, 'files', { value: [bad], configurable: true });
    fireEvent.change(input);

    const alert1 = await within(dropzone).findByRole('alert', undefined, { timeout: 5000 });
    expect(alert1).toHaveTextContent(/Unsupported/i);
  });

  it('shows error for too large file', async () => {
    render(<EnhancerForm />);
    const dropzone = screen.getByLabelText(/drop files here or click to select/i);
    const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

    const oversizeBytes = MAX_FILE_BYTES + 1;
    const bigChunk = 'a'.repeat(oversizeBytes);
    const big = new File([bigChunk], 'big.png', { type: 'image/png' });

    Object.defineProperty(input, 'files', { value: [big], configurable: true });
    fireEvent.change(input);

    const alert2 = await within(dropzone).findByRole('alert', undefined, { timeout: 5000 });
    expect(alert2).toHaveTextContent(/too large/i);
  });

  it('does not exceed max files when extra files are added', async () => {
    render(<EnhancerForm />);
    const dropzone = screen.getByLabelText(/drop files here or click to select/i);
    const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

    const files: File[] = [];
    for (let i = 0; i < MAX_FILES; i++) {
      files.push(new File(['x'], `img${i}.png`, { type: 'image/png' }));
    }
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    fireEvent.change(input);

    // Upload one more; component should clamp to MAX_FILES without exceeding
    const extra = new File(['x'], 'extra.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [extra], configurable: true });
    fireEvent.change(input);

    const items = await within(dropzone).findAllByRole('listitem', undefined, { timeout: 3000 });
    expect(items.length).toBeLessThanOrEqual(MAX_FILES);
    expect(within(dropzone).queryByRole('alert')).toBeNull();
  });

  it('submits with valid text and files', async () => {
    render(<EnhancerForm />);
    const textarea = screen.getByLabelText(/input prompt/i);
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    const dropzone = screen.getByLabelText(/drop files here or click to select/i);
    const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;
    const ok = new File(['x'], 'note.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [ok], configurable: true });
    fireEvent.change(input);

    const btn = screen.getByRole('button', { name: /^enhance$/i });
    await userEvent.click(btn);

    // Should render result textarea
    const out = await screen.findByLabelText(/enhanced prompt/i);
    expect(out).toBeInTheDocument();
  });
});
