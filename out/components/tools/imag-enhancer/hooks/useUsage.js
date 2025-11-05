"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUsage = useUsage;
const react_1 = require("react");
const api_1 = require("../api");
function useUsage() {
    const [usage, setUsage] = (0, react_1.useState)(null);
    const [ownerType, setOwnerType] = (0, react_1.useState)(null);
    const [plan, setPlan] = (0, react_1.useState)(null);
    const [entitlements, setEntitlements] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const isDebug = (0, react_1.useMemo)(() => {
        try {
            const url = new URL(window.location.href);
            const qp = url.searchParams;
            return qp.get('debug_usage') === '1' || localStorage.getItem('debug_usage') === '1';
        }
        catch {
            return false;
        }
    }, []);
    const refresh = (0, react_1.useCallback)(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await (0, api_1.getUsage)(isDebug);
            if ('success' in data && data.success) {
                setUsage(data.data.usage);
                setOwnerType(data.data.ownerType);
                setPlan(data.data.plan ?? null);
                try {
                    setEntitlements(data.data.entitlements || null);
                }
                catch {
                    setEntitlements(null);
                }
            }
            else {
                setError(data.error?.message || 'Failed to load usage');
            }
        }
        catch (_e) {
            setError('Failed to load usage');
        }
        finally {
            setLoading(false);
        }
    }, [isDebug]);
    // Initial load
    (0, react_1.useEffect)(() => {
        void refresh();
    }, [refresh]);
    // Auto-refresh on focus/visibility/auth-change/storage/pageshow
    (0, react_1.useEffect)(() => {
        const onFocus = () => {
            void refresh();
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                void refresh();
            }
        };
        const onAuthChanged = () => {
            void refresh();
        };
        const onStorage = (e) => {
            if (e.key === 'auth:changed') {
                void refresh();
            }
        };
        const onPageShow = () => {
            void refresh();
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('auth:changed', onAuthChanged);
        window.addEventListener('storage', onStorage);
        window.addEventListener('pageshow', onPageShow);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('auth:changed', onAuthChanged);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('pageshow', onPageShow);
        };
    }, [refresh]);
    return { usage, ownerType, plan, entitlements, loading, error, refresh };
}
