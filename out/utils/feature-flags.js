"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLandingV2Enabled = isLandingV2Enabled;
exports.getLandingBgVariant = getLandingBgVariant;
function isLandingV2Enabled() {
    // PUBLIC_ env vars are exposed to the client in Astro.
    const raw = import.meta.env.PUBLIC_LANDING_V2;
    if (raw === undefined || raw === null)
        return true; // default ON
    const v = String(raw).toLowerCase().trim();
    return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}
function getLandingBgVariant() {
    const raw = (import.meta.env && 'PUBLIC_LANDING_BG_VARIANT' in import.meta.env
        ? import.meta.env.PUBLIC_LANDING_BG_VARIANT
        : undefined);
    if (!raw || typeof raw !== 'string')
        return 'techcells';
    const v = raw.toLowerCase().trim();
    if (v === 'techcells' || v === 'off' || v === 'lattice')
        return v;
    return 'techcells';
}
