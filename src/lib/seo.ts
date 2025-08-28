import type { Locale } from './i18n';

interface SEOData {
  title: string;
  description: string;
  ogImage: string;
}

const seoData: Record<Locale, SEOData> = {
  de: {
    title: 'Entwickle die Zukunft mit KI-gestützten Tools',
    description: 'Streamline your workflow with our powerful suite of AI tools designed for developers and creators.',
    ogImage: '/assets/images/og-image-de.png'
  },
  en: {
    title: 'Build the Future with AI-Powered Tools',
    description: 'Streamline your workflow with our powerful suite of AI tools designed for developers and creators.',
    ogImage: '/assets/images/og-image-en.png'
  }
};

export function getSEOData(locale: Locale): SEOData {
  return seoData[locale];
}

export function getAlternateUrls(pathname: string): Record<Locale, string> {
  // Normalize by stripping any existing locale prefix and ensuring a leading slash
  const base = pathname.replace(/^\/(de|en)(\/(|$))?/, '/');
  const normalized = base === '' ? '/' : base; // safety: ensure root is '/'
  return {
    de: normalized,
    en: normalized === '/' ? '/en/' : `/en${normalized}`,
  };
}