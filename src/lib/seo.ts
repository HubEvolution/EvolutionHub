import type { Locale } from './i18n';

interface SEOData {
  title: string;
  description: string;
  ogImage: string;
}

const seoData: Record<Locale, SEOData> = {
  de: {
    title: 'Entwickle die Zukunft mit KI-gestützten Tools',
    description:
      'Streamline your workflow with our powerful suite of AI tools designed for developers and creators.',
    ogImage: '/images/blog/default-og.svg',
  },
  en: {
    title: 'Build the Future with AI-Powered Tools',
    description:
      'Streamline your workflow with our powerful suite of AI tools designed for developers and creators.',
    ogImage: '/images/blog/default-og.svg',
  },
};

export function getSEOData(locale: Locale): SEOData {
  return seoData[locale];
}

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  if (pathname === '/') return '/';
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
}

export function getAlternateUrls(pathname: string): Record<Locale, string> {
  // Normalize by stripping any existing locale prefix and ensuring a leading slash
  const base = pathname.replace(/^\/(de|en)(\/(|$))?/, '/');
  const normalized = normalizePath(base === '' ? '/' : base); // safety: ensure root is '/'
  return {
    de: normalized,
    en: normalized === '/' ? '/en' : `/en${normalized}`,
  };
}
