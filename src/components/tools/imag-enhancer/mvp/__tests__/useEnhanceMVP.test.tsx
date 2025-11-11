import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnhanceMVP } from '../hooks/useEnhanceMVP';
import { postGenerate } from '../../api';
import { ensureCsrfToken } from '@/lib/security/csrf';
import type { ApiSuccess, ApiErrorBody, GenerateResponseData } from '../types';

// Mock dependencies
vi.mock('../../api');
vi.mock('@/lib/security/csrf');

describe('useEnhanceMVP', () => {
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  const mockModel = '@cf/runwayml/stable-diffusion-v1-5-img2img';
  const mockCsrfToken = 'mock-csrf-token';
  const mockResponse: ApiSuccess<GenerateResponseData> = {
    success: true,
    data: {
      model: mockModel,
      imageUrl: 'https://example.com/result.jpg',
      originalUrl: 'https://example.com/original.jpg',
      usage: { used: 1, limit: 10, resetAt: null },
      limits: { user: 10, guest: 5 },
    },
  };

  type PostGenerateResult = Awaited<ReturnType<typeof postGenerate>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureCsrfToken).mockReturnValue(mockCsrfToken);
  });

  it('returns enhance function', () => {
    const { result } = renderHook(() => useEnhanceMVP());

    expect(typeof result.current.enhance).toBe('function');
  });

  it('calls postGenerate with correct parameters', async () => {
    const { result } = renderHook(() => useEnhanceMVP());

    vi.mocked(postGenerate).mockResolvedValue(mockResponse as PostGenerateResult);

    const formData = new FormData();
    formData.set('image', mockFile);
    formData.set('model', mockModel);

    await act(async () => {
      await result.current.enhance({
        file: mockFile,
        model: mockModel,
      });
    });

    expect(ensureCsrfToken).toHaveBeenCalled();
    expect(postGenerate).toHaveBeenCalledWith(formData, mockCsrfToken, undefined);
  });

  it('passes abort signal to postGenerate when provided', async () => {
    const { result } = renderHook(() => useEnhanceMVP());

    vi.mocked(postGenerate).mockResolvedValue(mockResponse);

    const abortController = new AbortController();

    await act(async () => {
      await result.current.enhance({
        file: mockFile,
        model: mockModel,
        signal: abortController.signal,
      });
    });

    expect(postGenerate).toHaveBeenCalledWith(
      expect.any(FormData),
      mockCsrfToken,
      abortController.signal
    );
  });

  it('returns the response from postGenerate', async () => {
    const { result } = renderHook(() => useEnhanceMVP());

    vi.mocked(postGenerate).mockResolvedValue(mockResponse);

    const response = await act(async () => {
      return await result.current.enhance({
        file: mockFile,
        model: mockModel,
      });
    });

    expect(response).toEqual(mockResponse);
  });

  it('handles error responses from postGenerate', async () => {
    const { result } = renderHook(() => useEnhanceMVP());

    const mockErrorResponse: ApiErrorBody = {
      success: false,
      error: {
        type: 'validation_error' as const,
        message: 'Invalid file format',
      },
    };

    vi.mocked(postGenerate).mockResolvedValue(mockErrorResponse as PostGenerateResult);

    const response = await act(async () => {
      return await result.current.enhance({
        file: mockFile,
        model: mockModel,
      });
    });

    expect(response).toEqual(mockErrorResponse);
  });

  it('handles Response objects (like rate limiting)', async () => {
    const { result } = renderHook(() => useEnhanceMVP());

    const mockRateLimitResponse = new Response('Rate limited', { status: 429 });

    vi.mocked(postGenerate).mockResolvedValue(mockRateLimitResponse as PostGenerateResult);

    const response = await act(async () => {
      return await result.current.enhance({
        file: mockFile,
        model: mockModel,
      });
    });

    expect(response).toEqual(mockRateLimitResponse);
  });
});
