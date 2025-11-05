"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDownload = useDownload;
const react_1 = require("react");
/**
 * useDownload
 * Programmatic blob download with graceful new-tab fallback to avoid full-page navigation.
 *
 * Usage:
 * const download = useDownload();
 * <a href={url} download onClick={(e) => download(e, url, filename)} />
 */
function useDownload() {
    const download = (0, react_1.useCallback)(async (e, url, suggestedFilename) => {
        try {
            if (e)
                e.preventDefault();
            if (!url)
                return;
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            try {
                let filename = suggestedFilename || 'enhanced-image';
                try {
                    const u = new URL(url, window.location.origin);
                    const last = u.pathname.split('/').pop() || '';
                    if (!suggestedFilename && last)
                        filename = last;
                }
                catch {
                    // ignore URL parsing errors
                }
                a.href = objectUrl;
                a.download = filename;
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
            }
            finally {
                a.remove();
                URL.revokeObjectURL(objectUrl);
            }
        }
        catch (_err) {
            // As a last resort, open in a new tab to avoid full-page navigation
            if (url)
                window.open(url, '_blank', 'noopener');
        }
    }, []);
    return download;
}
