"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAllowedScales = computeAllowedScales;
exports.computeCanUseFaceEnhance = computeCanUseFaceEnhance;
/**
 * Compute allowed scales (subset of [2, 4]) based on model capability, feature-flag and entitlements.
 */
function computeAllowedScales(modelSupportsScale, entitlements, gatingEnabled) {
    if (!modelSupportsScale)
        return [];
    if (!gatingEnabled || !entitlements)
        return [2, 4];
    const max = entitlements.maxUpscale;
    const arr = [];
    if (2 <= max)
        arr.push(2);
    if (4 <= max)
        arr.push(4);
    return arr;
}
/**
 * Decide if face enhance is allowed based on model capability, feature-flag and entitlements.
 */
function computeCanUseFaceEnhance(modelSupportsFaceEnhance, entitlements, gatingEnabled) {
    if (!modelSupportsFaceEnhance)
        return false;
    if (!gatingEnabled || !entitlements)
        return modelSupportsFaceEnhance;
    return Boolean(entitlements.faceEnhance);
}
