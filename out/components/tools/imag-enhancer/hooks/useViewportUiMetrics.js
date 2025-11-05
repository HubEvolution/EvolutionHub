"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useViewportUiMetrics = useViewportUiMetrics;
const react_1 = require("react");
function useViewportUiMetrics({ actionsRef, topReserveRef }) {
    const [isMobile, setIsMobile] = (0, react_1.useState)(false);
    const [actionsHeight, setActionsHeight] = (0, react_1.useState)(0);
    const [topReserveHeight, setTopReserveHeight] = (0, react_1.useState)(0);
    const [safeAreaBottom, setSafeAreaBottom] = (0, react_1.useState)(0);
    // Detect mobile viewport
    (0, react_1.useEffect)(() => {
        try {
            const hasMM = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
            if (!hasMM) {
                setIsMobile(false);
                return;
            }
            const mq = window.matchMedia('(max-width: 768px)');
            const onChange = () => setIsMobile(!!mq && !!mq.matches);
            onChange();
            mq.addEventListener('change', onChange);
            return () => mq.removeEventListener('change', onChange);
        }
        catch {
            setIsMobile(false);
        }
    }, []);
    // Measure sticky actions height dynamically
    (0, react_1.useEffect)(() => {
        const el = actionsRef.current;
        if (!el) {
            setActionsHeight(0);
            return;
        }
        const ro = new ResizeObserver(() => {
            setActionsHeight(el.getBoundingClientRect().height | 0);
        });
        ro.observe(el);
        // Initial measure
        setActionsHeight(el.getBoundingClientRect().height | 0);
        return () => ro.disconnect();
    }, [actionsRef]);
    // Measure the height of the content above the image container
    (0, react_1.useEffect)(() => {
        const el = topReserveRef.current;
        if (!el) {
            setTopReserveHeight(0);
            return;
        }
        const ro = new ResizeObserver(() => {
            setTopReserveHeight((el.getBoundingClientRect().height | 0) + 4);
        });
        ro.observe(el);
        setTopReserveHeight((el.getBoundingClientRect().height | 0) + 4);
        return () => ro.disconnect();
    }, [topReserveRef]);
    // Try to read iOS safe-area inset bottom
    (0, react_1.useEffect)(() => {
        try {
            const probe = document.createElement('div');
            probe.style.position = 'fixed';
            probe.style.inset = '0';
            probe.style.paddingBottom = 'env(safe-area-inset-bottom)';
            probe.style.visibility = 'hidden';
            document.body.appendChild(probe);
            const cs = window.getComputedStyle(probe);
            const pb = parseFloat(cs.paddingBottom || '0');
            setSafeAreaBottom(Number.isFinite(pb) ? pb : 0);
            document.body.removeChild(probe);
        }
        catch {
            setSafeAreaBottom(0);
        }
    }, []);
    return { isMobile, actionsHeight, topReserveHeight, safeAreaBottom };
}
