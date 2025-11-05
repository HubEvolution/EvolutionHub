"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEnhance = useEnhance;
const react_1 = require("react");
const api_1 = require("../api");
const csrf_1 = require("@/lib/security/csrf");
function useEnhance() {
    const isEnabled = import.meta.env.PUBLIC_PROMPT_ENHANCER_V1 !== 'false';
    const enhance = (0, react_1.useCallback)(async (args) => {
        if (!isEnabled) {
            return Promise.reject(new Error('Feature not enabled'));
        }
        // Map mode to service options
        const serviceMode = args.mode === 'concise' ? 'concise' : 'agent';
        const csrf = (0, csrf_1.ensureCsrfToken)();
        return (0, api_1.postEnhance)(args.text, serviceMode, csrf, args.signal, args.files);
    }, [isEnabled]);
    return { enhance, isEnabled };
}
