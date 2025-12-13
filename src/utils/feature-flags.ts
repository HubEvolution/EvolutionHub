export function isLandingV2Enabled(): boolean {
  // PUBLIC_ env vars are exposed to the client in Astro.
  const raw = import.meta.env.PUBLIC_LANDING_V2;
  if (raw === undefined || raw === null) return true; // default ON
  const v = String(raw).toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

export function isLandingPromptOrbitEnabled(): boolean {
  const raw = (import.meta.env as Record<string, string | undefined>).PUBLIC_LANDING_PROMPT_ORBIT;
  if (raw === undefined || raw === null) return false; // default OFF for experimental orbit landing
  const v = String(raw).toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

export type LandingBgVariant = 'lattice' | 'techcells' | 'off';

export function getLandingBgVariant(): LandingBgVariant {
  const raw = (
    import.meta.env && 'PUBLIC_LANDING_BG_VARIANT' in import.meta.env
      ? (import.meta.env as Record<string, string | undefined>).PUBLIC_LANDING_BG_VARIANT
      : undefined
  ) as string | undefined;
  if (!raw || typeof raw !== 'string') return 'techcells';
  const v = raw.toLowerCase().trim();
  if (v === 'techcells' || v === 'off' || v === 'lattice') return v as LandingBgVariant;
  return 'techcells';
}

export function isToolsFilterEnabled(): boolean {
  const raw = import.meta.env.PUBLIC_TOOLS_FILTER ?? 'true';
  const value = String(raw).toLowerCase().trim();
  return value === '1' || value === 'true' || value === 'on' || value === 'yes';
}
