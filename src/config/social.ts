export type SocialLinks = {
  github: string;
  x: string;
  reddit: string;
  tiktok: string;
  instagram: string;
  linkedin: string;
  pinterest: string;
  facebook: string;
};

/**
 * Returns social links from public environment variables.
 * Only PUBLIC_ prefixed envs are exposed to the client in Astro/Vite.
 */
export function getSocialLinks(): SocialLinks {
  // Use empty strings when not set; Footer renders links only when non-empty
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  return {
    github: env.PUBLIC_SOCIAL_GITHUB || '',
    x: env.PUBLIC_SOCIAL_X || '',
    reddit: env.PUBLIC_SOCIAL_REDDIT || '',
    tiktok: env.PUBLIC_SOCIAL_TIKTOK || '',
    instagram: env.PUBLIC_SOCIAL_INSTAGRAM || '',
    linkedin: env.PUBLIC_SOCIAL_LINKEDIN || '',
    pinterest: env.PUBLIC_SOCIAL_PINTEREST || '',
    facebook: env.PUBLIC_SOCIAL_FACEBOOK || '',
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
  'facebook',
];
