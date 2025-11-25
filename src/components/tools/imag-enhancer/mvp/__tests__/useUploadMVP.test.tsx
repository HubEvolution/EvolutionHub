import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type React from 'react';
import { useUploadMVP } from '../hooks/useUploadMVP';
import type { ImagEnhancerMVPStrings } from '../types';

describe('useUploadMVP', () => {
  const mockStrings: ImagEnhancerMVPStrings = {
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
      changeModel: 'Change model',
      done: 'Done',
      startOver: 'Start over',
      upgrade: 'Upgrade',
    },
  };

  const mockOnFileSelect = vi.fn();

  const defaultProps = {
    strings: mockStrings,
    onFileSelect: mockOnFileSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct initial state', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    expect(result.current.acceptAttr).toBe('image/jpeg,image/png,image/webp');
    expect(result.current.maxMb).toBe(10);
    expect(result.current.isDragOver).toBe(false);
  });

  it('validates file type correctly', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    expect(result.current.validateFile(validFile)).toBe(null);
    expect(result.current.validateFile(invalidFile)).toBe('Unsupported file type.');
  });

  it('validates file size correctly', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    const smallFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(smallFile, 'size', { value: 1024 * 1024 }); // 1MB

    const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB

    expect(result.current.validateFile(smallFile)).toBe(null);
    expect(result.current.validateFile(largeFile)).toBe('File is too large. Max: 10MB');
  });

  it('calls onFileSelect with valid file', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.onSelectFile(validFile);
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
  });

  it('calls onFileSelect with null for invalid file', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    act(() => {
      result.current.onSelectFile(invalidFile);
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(null);
  });

  it('handles drag over correctly', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.onDragOver(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.isDragOver).toBe(true);
  });

  it('handles drag leave correctly', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    // First set drag over
    act(() => {
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent<HTMLDivElement>;
      result.current.onDragOver(mockEvent);
    });

    // Then drag leave
    act(() => {
      result.current.onDragLeave();
    });

    expect(result.current.isDragOver).toBe(false);
  });

  it('handles drop with valid file', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [validFile],
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.onDrop(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.isDragOver).toBe(false);
    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
  });

  it('handles drop with no files', () => {
    const { result } = renderHook(() => useUploadMVP(defaultProps));

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [],
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.onDrop(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.isDragOver).toBe(false);
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });
});
