import { useCallback } from 'react';
import type { EnhanceMVPArgs, ApiSuccess, ApiErrorBody, GenerateResponseData } from '../../types';
import { postGenerate } from '../../api';
import { ensureCsrfToken } from '@/lib/security/csrf';

/**
 * Enhanced hook for MVP image enhancement functionality.
 * Strict typing throughout - no `any` types.
 */
export function useEnhanceMVP() {
  const enhance = useCallback(
    async (
      args: EnhanceMVPArgs
    ): Promise<ApiSuccess<GenerateResponseData> | ApiErrorBody | Response> => {
      const formData = new FormData();
      formData.set('image', args.file);
      formData.set('model', args.model);

      const csrfToken = ensureCsrfToken();
      return postGenerate(formData, csrfToken, args.signal);
    },
    []
  );

  return { enhance };
}
