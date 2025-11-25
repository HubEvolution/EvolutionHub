import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancerActionsMVP } from '../EnhancerActionsMVP';
import type { ModelOption, UsageData } from '../types';

describe('EnhancerActionsMVP', () => {
  const mockStrings = {
    dropText: 'Drop an image here or click to select',
    enhance: 'Enhance',
    processing: 'Processing…',
    model: 'Model',
    usage: 'Usage',
    monthlyUsage: 'Monthly usage',
    creditsBalance: 'Credits balance',
    usageDetailsTitle: 'Usage & credits',
    resetLabel: 'Resets at',
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
    ui: {
      fullscreen: 'Enter fullscreen',
      exitFullscreen: 'Exit fullscreen',
    },
  };

  const mockModels: readonly ModelOption[] = [
    {
      slug: '@cf/runwayml/stable-diffusion-v1-5-img2img',
      label: 'Enhance (SD 1.5 img2img)',
      provider: 'workers_ai',
    },
    {
      slug: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      label: 'Enhance XL (SDXL img2img)',
      provider: 'workers_ai',
    },
  ];

  const mockUsage: UsageData = {
    used: 5,
    limit: 20,
    resetAt: Date.UTC(2025, 0, 1),
  };

  const defaultProps: Parameters<typeof EnhancerActionsMVP>[0] = {
    strings: mockStrings,
    model: '@cf/runwayml/stable-diffusion-v1-5-img2img',
    models: mockModels,
    onChangeModel: vi.fn(),
    canSubmit: true,
    loading: false,
    onEnhance: vi.fn(),
    usage: mockUsage,
    quotaExceeded: false,
    ownerType: 'user',
    plan: 'free',
    planLabel: 'Free',
    monthlyUsage: mockUsage,
    creditsBalanceTenths: 250,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders model selection with Workers AI models only', () => {
    render(<EnhancerActionsMVP {...defaultProps} />);

    expect(screen.getByLabelText('Model')).toBeInTheDocument();

    // Should only show Workers AI models
    expect(screen.getByText('Enhance (SD 1.5 img2img)')).toBeInTheDocument();
    expect(screen.getByText('Enhance XL (SDXL img2img)')).toBeInTheDocument();

    const select = screen.getByLabelText('Model');
    expect(select).toHaveValue('@cf/runwayml/stable-diffusion-v1-5-img2img');
  });

  it('calls onChangeModel when model selection changes', async () => {
    const user = userEvent.setup();
    render(<EnhancerActionsMVP {...defaultProps} />);

    const select = screen.getByLabelText('Model');
    await user.selectOptions(select, '@cf/stabilityai/stable-diffusion-xl-base-1.0');

    expect(defaultProps.onChangeModel).toHaveBeenCalledWith(
      '@cf/stabilityai/stable-diffusion-xl-base-1.0'
    );
  });

  it('calls onEnhance when enhance button is clicked', async () => {
    const user = userEvent.setup();
    render(<EnhancerActionsMVP {...defaultProps} />);

    const enhanceButton = screen.getByRole('button', { name: 'Enhance' });
    await user.click(enhanceButton);

    expect(defaultProps.onEnhance).toHaveBeenCalledTimes(1);
  });

  it('shows processing state when loading', () => {
    render(<EnhancerActionsMVP {...defaultProps} loading={true} />);

    const enhanceButton = screen.getByRole('button', { name: 'Processing…' });
    expect(enhanceButton).toBeDisabled();
  });

  it('disables enhance button when cannot submit', () => {
    const propsDisabled = { ...defaultProps, canSubmit: false };
    render(<EnhancerActionsMVP {...propsDisabled} />);

    const enhanceButton = screen.getByRole('button', { name: 'Enhance' });
    expect(enhanceButton).toBeDisabled();
  });

  it('shows quota exceeded message when quota exceeded', () => {
    const propsQuotaExceeded = { ...defaultProps, quotaExceeded: true };
    render(<EnhancerActionsMVP {...propsQuotaExceeded} />);

    expect(screen.getByText('Usage limit reached.')).toBeInTheDocument();
    expect(screen.getByText('Usage limit reached.')).toHaveClass('text-red-600');
  });

  it('shows normal usage when quota not exceeded', () => {
    render(<EnhancerActionsMVP {...defaultProps} />);

    expect(screen.getByText('Usage: 5/20')).toBeInTheDocument();
    expect(screen.getByText('Usage: 5/20')).toHaveClass('text-gray-600');
  });

  it('disables enhance button when quota exceeded', () => {
    const propsQuotaExceeded = { ...defaultProps, quotaExceeded: true };
    render(<EnhancerActionsMVP {...propsQuotaExceeded} />);

    const enhanceButton = screen.getByRole('button', { name: 'Enhance' });
    expect(enhanceButton).toBeDisabled();
  });

  it('does not display usage info when usage is null', () => {
    const propsWithoutUsage = { ...defaultProps, usage: null };
    render(<EnhancerActionsMVP {...propsWithoutUsage} />);

    expect(screen.queryByText(/Usage:/)).not.toBeInTheDocument();
  });
});
