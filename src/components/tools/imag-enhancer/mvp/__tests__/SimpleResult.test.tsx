import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimpleResult } from '../SimpleResult';
import type { SimpleResultProps } from '../SimpleResult';
import type { UsageData } from '../types';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SimpleResult', () => {
  const mockStrings = {
    dropText: 'Drop an image here or click to select',
    enhance: 'Enhance',
    processing: 'Processing…',
    model: 'Model',
    usage: 'Usage',
    result: 'Result',
    original: 'Original',
    allowedTypes: 'Allowed: JPG, PNG, WEBP',
    max: 'Max size',
    download: 'Download',
    loading: 'Loading…',
    quotaBanner: 'Usage limit reached.',
    toasts: {
      loadQuotaError: 'Failed to load quota information.',
      loadError: 'Failed to load. Please try again.',
      quotaReached: 'You have reached your usage limit.',
      unsupportedType: 'Unsupported file type.',
      fileTooLargePrefix: 'File is too large. Max:',
      processingFailed: 'Processing failed. Please try again.',
      successEnhanced: 'Image enhanced successfully!',
    },
  };

  const mockUsage: UsageData = {
    used: 5,
    limit: 20,
    resetAt: Date.UTC(2025, 0, 1),
  };

  const defaultProps: SimpleResultProps = {
    previewUrl: 'https://example.com/preview.jpg',
    resultUrl: 'https://example.com/result.jpg',
    strings: mockStrings,
    usage: mockUsage,
    onDownload: vi.fn(),
    onStartOver: vi.fn(),
    loading: false,
    processingLabel: 'Processing…',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders before and after images', () => {
    render(<SimpleResult {...defaultProps} />);

    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();

    const originalImage = screen.getByAltText('Original');
    const resultImage = screen.getByAltText('Result');

    expect(originalImage).toHaveAttribute('src', 'https://example.com/preview.jpg');
    // result has a cache-buster appended; accept any URL that starts with the base
    expect(resultImage).toHaveAttribute(
      'src',
      expect.stringContaining('https://example.com/result.jpg')
    );
  });

  it('shows loading state when processing', () => {
    render(<SimpleResult {...defaultProps} loading={true} />);

    expect(screen.getByText('Processing…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Start Over/i })).toBeDisabled();
  });

  it('calls onDownload when download button is clicked', async () => {
    const user = userEvent.setup();
    render(<SimpleResult {...defaultProps} />);

    const downloadButton = screen.getByRole('button', { name: 'Download' });
    await user.click(downloadButton);

    expect(defaultProps.onDownload).toHaveBeenCalledTimes(1);
  });

  it('calls onStartOver when start over button is clicked', async () => {
    const user = userEvent.setup();
    render(<SimpleResult {...defaultProps} />);

    const startOverButton = screen.getByRole('button', { name: /Start Over/i });
    await user.click(startOverButton);

    expect(defaultProps.onStartOver).toHaveBeenCalledTimes(1);
  });

  it('displays usage information when provided', () => {
    render(<SimpleResult {...defaultProps} />);

    expect(screen.getByText('Usage: 5/20')).toBeInTheDocument();
  });

  it('does not display usage information when not provided', () => {
    const propsWithoutUsage = { ...defaultProps, usage: null };
    render(<SimpleResult {...propsWithoutUsage} />);

    expect(screen.queryByText(/Usage:/)).not.toBeInTheDocument();
  });

  it('disables buttons during loading', () => {
    render(<SimpleResult {...defaultProps} loading={true} />);

    const downloadButton = screen.getByRole('button', { name: 'Download' });
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });

    expect(downloadButton).toBeDisabled();
    expect(startOverButton).toBeDisabled();
  });

  it('enables buttons when not loading', () => {
    render(<SimpleResult {...defaultProps} loading={false} />);

    const downloadButton = screen.getByRole('button', { name: 'Download' });
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });

    expect(downloadButton).not.toBeDisabled();
    expect(startOverButton).not.toBeDisabled();
  });
});
