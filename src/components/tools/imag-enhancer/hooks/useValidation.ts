import { useCallback, useMemo } from 'react';
import { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES } from '@/config/ai-image';

export interface ValidationToasts {
  unsupportedType: string;
  fileTooLargePrefix: string;
}

interface Options {
  maxBytes?: number;
  allowedTypes?: readonly string[];
}

/**
 * useValidation
 * Encapsulates file validation (MIME type + size) and exposes acceptAttr and maxMb helpers.
 */
export function useValidation(toasts: ValidationToasts, options: Options = {}) {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  const allowed = options.allowedTypes ?? ALLOWED_CONTENT_TYPES;

  const acceptAttr = useMemo(() => allowed.join(','), [allowed]);
  const maxMb = useMemo(() => Math.round(maxBytes / (1024 * 1024)), [maxBytes]);

  const validateFile = useCallback(
    (f: File): string | null => {
      if (!allowed.includes(f.type as (typeof ALLOWED_CONTENT_TYPES)[number])) {
        return toasts.unsupportedType;
      }
      if (f.size > maxBytes) {
        return `${toasts.fileTooLargePrefix} ${maxMb} MB`;
      }
      return null;
    },
    [allowed, maxBytes, maxMb, toasts.fileTooLargePrefix, toasts.unsupportedType]
  );

  return { acceptAttr, maxMb, validateFile } as const;
}
