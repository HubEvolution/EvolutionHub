'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useValidation = useValidation;
const react_1 = require('react');
const ai_image_1 = require('@/config/ai-image');
/**
 * useValidation
 * Encapsulates file validation (MIME type + size) and exposes acceptAttr and maxMb helpers.
 */
function useValidation(toasts, options = {}) {
  const maxBytes = options.maxBytes ?? ai_image_1.MAX_UPLOAD_BYTES;
  const allowed = options.allowedTypes ?? ai_image_1.ALLOWED_CONTENT_TYPES;
  const acceptAttr = (0, react_1.useMemo)(() => allowed.join(','), [allowed]);
  const maxMb = (0, react_1.useMemo)(() => Math.round(maxBytes / (1024 * 1024)), [maxBytes]);
  const validateFile = (0, react_1.useCallback)(
    (f) => {
      if (!allowed.includes(f.type)) {
        return toasts.unsupportedType;
      }
      if (f.size > maxBytes) {
        return `${toasts.fileTooLargePrefix} ${maxMb} MB`;
      }
      return null;
    },
    [allowed, maxBytes, maxMb, toasts.fileTooLargePrefix, toasts.unsupportedType]
  );
  return { acceptAttr, maxMb, validateFile };
}
