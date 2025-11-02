import type React from 'react';
import ImagEnhancerIsland from '../../ImagEnhancerIsland';
import ImagEnhancerMVP from './ImagEnhancerMVP';
import type { ImagEnhancerMVPStrings } from './types';

export interface ImagEnhancerRouterProps {
  strings: ImagEnhancerMVPStrings;
  legacyStrings: ImagEnhancerMVPStrings; // Same interface, legacy component
}

/**
 * Router component that selects between MVP and Legacy Image Enhancer
 * based on feature flags. No SSR blocking - client-side only.
 */
export default function ImagEnhancerRouter(props: ImagEnhancerRouterProps): React.ReactElement {
  const { strings, legacyStrings } = props;

  // Feature flag checks (client-side only)
  const isMVPMode = import.meta.env.PUBLIC_ENHANCER_MVP_MODE === '1';
  const isLegacyMode = import.meta.env.PUBLIC_ENHANCER_LEGACY_MODE === '1';

  // Routing logic
  if (isMVPMode && !isLegacyMode) {
    // MVP only mode
    return <ImagEnhancerMVP strings={strings} />;
  }

  if (!isMVPMode && isLegacyMode) {
    // Legacy only mode
    return <ImagEnhancerIsland strings={legacyStrings} />;
  }

  if (isMVPMode && isLegacyMode) {
    // Both enabled - prefer MVP for production, can show toggle for testing
    return <ImagEnhancerMVP strings={strings} />;
  }

  // Fallback to MVP if flags are misconfigured
  return <ImagEnhancerMVP strings={strings} />;
}
