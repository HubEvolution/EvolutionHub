'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useEnhanceMVP = useEnhanceMVP;
const react_1 = require('react');
const api_1 = require('../../api');
const csrf_1 = require('@/lib/security/csrf');
/**
 * Enhanced hook for MVP image enhancement functionality.
 * Strict typing throughout - no `any` types.
 */
function useEnhanceMVP() {
  const enhance = (0, react_1.useCallback)(async (args) => {
    const formData = new FormData();
    formData.set('image', args.file);
    formData.set('model', args.model);
    const csrfToken = (0, csrf_1.ensureCsrfToken)();
    return (0, api_1.postGenerate)(formData, csrfToken, args.signal);
  }, []);
  return { enhance };
}
