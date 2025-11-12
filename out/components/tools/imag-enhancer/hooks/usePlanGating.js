'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.usePlanGating = usePlanGating;
const react_1 = require('react');
const gating_1 = require('../gating');
function usePlanGating(params) {
  const {
    modelSupportsScale,
    modelSupportsFace,
    entitlements,
    gatingEnabled,
    scale,
    setScale,
    faceEnhance,
    setFaceEnhance,
  } = params;
  const allowedScales = (0, react_1.useMemo)(
    () => (0, gating_1.computeAllowedScales)(modelSupportsScale, entitlements, gatingEnabled),
    [modelSupportsScale, entitlements, gatingEnabled]
  );
  const canUseFaceEnhance = (0, react_1.useMemo)(
    () => (0, gating_1.computeCanUseFaceEnhance)(modelSupportsFace, entitlements, gatingEnabled),
    [modelSupportsFace, entitlements, gatingEnabled]
  );
  const featureBlockedByPlan = (0, react_1.useMemo)(() => {
    if (!gatingEnabled || !entitlements) return false;
    if (
      modelSupportsScale &&
      typeof scale === 'number' &&
      entitlements.maxUpscale &&
      scale > entitlements.maxUpscale
    ) {
      return true;
    }
    if (modelSupportsFace && faceEnhance && !entitlements.faceEnhance) return true;
    return false;
  }, [gatingEnabled, entitlements, modelSupportsScale, modelSupportsFace, scale, faceEnhance]);
  // Safety clamp
  (0, react_1.useEffect)(() => {
    if (!gatingEnabled || !entitlements) return;
    try {
      if (modelSupportsScale) {
        const max = entitlements.maxUpscale;
        if (scale === 4 && (max ?? 2) < 4) setScale(2);
      }
      if (modelSupportsFace) {
        if (faceEnhance && !entitlements.faceEnhance) setFaceEnhance(false);
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatingEnabled, entitlements, modelSupportsScale, modelSupportsFace]);
  return { allowedScales, canUseFaceEnhance, featureBlockedByPlan };
}
