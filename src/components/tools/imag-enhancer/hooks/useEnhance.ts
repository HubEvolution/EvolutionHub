import { useCallback } from 'react';
import type { ApiErrorBody, ApiSuccess, GenerateResponseData } from '../types';
import { postGenerate } from '../api';
import { ensureCsrfToken } from '@/lib/security/csrf';

export interface EnhanceArgs {
  file: File;
  model: string;
  scale?: number;
  faceEnhance?: boolean;
  supportsScale: boolean;
  supportsFaceEnhance: boolean;
  signal?: AbortSignal;
}

export function useEnhance() {
  const enhance = useCallback(async (args: EnhanceArgs): Promise<ApiSuccess<GenerateResponseData> | ApiErrorBody | Response> => {
    const fd = new FormData();
    fd.set('image', args.file);
    fd.set('model', args.model);
    if (typeof args.scale === 'number' && args.supportsScale) fd.set('scale', String(args.scale));
    if (typeof args.faceEnhance === 'boolean' && args.supportsFaceEnhance) fd.set('face_enhance', String(args.faceEnhance));
    const csrf = ensureCsrfToken();
    return postGenerate(fd, csrf, args.signal);
  }, []);

  return { enhance };
}
