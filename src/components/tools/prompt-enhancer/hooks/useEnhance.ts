import { useCallback } from 'react';
import type { ApiErrorBody, ApiSuccess, EnhanceResponseData } from '../types';
import { postEnhance } from '../api';
import { ensureCsrfToken } from '../../../../lib/security/csrf';

export interface EnhanceArgs {
  text: string;
  mode: 'creative' | 'professional' | 'concise';
  signal?: AbortSignal;
  files?: File[];
}

export function useEnhance() {
  const isEnabled = import.meta.env.PUBLIC_PROMPT_ENHANCER_V1 !== 'false';

  const enhance = useCallback(async (args: EnhanceArgs): Promise<ApiSuccess<EnhanceResponseData> | ApiErrorBody | Response> => {
    if (!isEnabled) {
      return Promise.reject(new Error('Feature not enabled'));
    }

    // Map mode to service options
    const serviceMode = args.mode === 'concise' ? 'concise' : 'agent';

    const csrf = ensureCsrfToken();
    return postEnhance(args.text, serviceMode, csrf, args.signal, args.files);
  }, [isEnabled]);

  return { enhance, isEnabled };
}