export type SocialLinks = {
  github: string;
  x: string;
  reddit: string;
  tiktok: string;
  instagram: string;
  linkedin: string;
  pinterest: string;
};

/**
 * Returns social links from public environment variables.
 * Only PUBLIC_ prefixed envs are exposed to the client in Astro/Vite.
 */
export function getSocialLinks(): SocialLinks {
  // Use empty strings when not set; Footer renders links only when non-empty
  return {
    github: (import.meta as any).env.PUBLIC_SOCIAL_GITHUB || '',
    x: (import.meta as any).env.PUBLIC_SOCIAL_X || '',
    reddit: (import.meta as any).env.PUBLIC_SOCIAL_REDDIT || '',
    tiktok: (import.meta as any).env.PUBLIC_SOCIAL_TIKTOK || '',
    instagram: (import.meta as any).env.PUBLIC_SOCIAL_INSTAGRAM || '',
    linkedin: (import.meta as any).env.PUBLIC_SOCIAL_LINKEDIN || '',
    pinterest: (import.meta as any).env.PUBLIC_SOCIAL_PINTEREST || '',
  };
}

/**
 * Fixed render order as requested: GitHub, X, Reddit, TikTok, Instagram, LinkedIn, Pinterest
 */
export const SOCIAL_ORDER: Array<keyof SocialLinks> = [
  'github',
  'x',
  'reddit',
  'tiktok',
  'instagram',
  'linkedin',
  'pinterest',
];
