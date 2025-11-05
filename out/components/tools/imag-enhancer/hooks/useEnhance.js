"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEnhance = useEnhance;
const react_1 = require("react");
const api_1 = require("../api");
const csrf_1 = require("@/lib/security/csrf");
function useEnhance() {
    const enhance = (0, react_1.useCallback)(async (args) => {
        const fd = new FormData();
        fd.set('image', args.file);
        fd.set('model', args.model);
        if (typeof args.scale === 'number' && args.supportsScale)
            fd.set('scale', String(args.scale));
        if (typeof args.faceEnhance === 'boolean' && args.supportsFaceEnhance)
            fd.set('face_enhance', String(args.faceEnhance));
        const csrf = (0, csrf_1.ensureCsrfToken)();
        return (0, api_1.postGenerate)(fd, csrf, args.signal);
    }, []);
    return { enhance };
}
