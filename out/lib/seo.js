'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getSEOData = getSEOData;
exports.getAlternateUrls = getAlternateUrls;
const seoData = {
  de: {
    title: 'Entwickle die Zukunft mit KI-gestützten Tools',
    description:
      'Streamline your workflow with our powerful suite of AI tools designed for developers and creators.',
    ogImage: '/assets/images/og-image-de.png',
  },
  en: {
    title: 'Build the Future with AI-Powered Tools',
    description:
      'Streamline your workflow with our powerful suite of AI tools designed for developers and creators.',
    ogImage: '/assets/images/og-image-en.png',
  },
};
function getSEOData(locale) {
  return seoData[locale];
}
function getAlternateUrls(pathname) {
  // Normalize by stripping any existing locale prefix and ensuring a leading slash
  const base = pathname.replace(/^\/(de|en)(\/(|$))?/, '/');
  const normalized = base === '' ? '/' : base; // safety: ensure root is '/'
  return {
    de: normalized,
    en: normalized === '/' ? '/en/' : `/en${normalized}`,
  };
}
