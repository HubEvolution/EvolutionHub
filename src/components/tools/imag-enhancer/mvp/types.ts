/**
 * Type definitions for Image Enhancer MVP components.
 * Strict TypeScript interfaces - no `any` types allowed.
 */

import type { ApiSuccess, ApiErrorBody, GenerateResponseData, UsageInfo } from '../types';

export interface ImagEnhancerMVPStrings {
  dropText: string;
  enhance: string;
  processing: string;
  model: string;
  usage: string;
  result: string;
  original: string;
  allowedTypes: string;
  max: string;
  download: string;
  loading: string;
  quotaBanner: string;
  toasts: {
    loadQuotaError: string;
    loadError: string;
    quotaReached: string;
    unsupportedType: string;
    fileTooLargePrefix: string;
    processingFailed: string;
    successEnhanced: string;
  };
  ui?: {
    fullscreen: string;
    exitFullscreen: string;
    changeModel?: string;
    done?: string;
    startOver?: string;
    upgrade?: string;
  };
}

export interface EnhanceMVPArgs {
  file: File;
  model: string;
  signal?: AbortSignal;
}

// Re-export types from main types file for consistency
export type { ApiSuccess, ApiErrorBody, GenerateResponseData };

export type UsageData = UsageInfo;

export interface ModelOption {
  slug: string;
  label: string;
  provider: 'workers_ai' | 'replicate';
}

export interface ImagEnhancerMVPProps {
  strings: ImagEnhancerMVPStrings;
}
