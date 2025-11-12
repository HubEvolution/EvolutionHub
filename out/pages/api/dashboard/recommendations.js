'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const tools_data_1 = require('@/lib/tools-data');
const docRecommendations = {
  en: [
    {
      title: 'Imag-Enhancer UI upgrade checklist',
      description: 'Best practices for shipping the latest Imag-Enhancer improvements.',
      url: '/docs/frontend/imag-enhancer-ui-upgrade',
      tag: 'Guide',
    },
    {
      title: 'Stripe setup for teams',
      description: 'Step-by-step instructions for configuring billing environments.',
      url: '/docs/development/stripe-setup',
      tag: 'Billing',
    },
  ],
  de: [
    {
      title: 'Imag-Enhancer UI-Upgrade Prüfliste',
      description: 'Best Practices für den Rollout der neuesten Imag-Enhancer-Features.',
      url: '/docs/frontend/imag-enhancer-ui-upgrade',
      tag: 'Leitfaden',
    },
    {
      title: 'Stripe-Setup für Teams',
      description: 'Schritt-für-Schritt-Anleitung zur Einrichtung deiner Billing-Umgebung.',
      url: '/docs/development/stripe-setup',
      tag: 'Billing',
    },
  ],
};
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
  const opStart = Date.now();
  const url = new URL(context.request.url);
  const localeParam = (url.searchParams.get('locale') ?? '').toLowerCase();
  const locale = localeParam === 'de' ? 'de' : 'en';
  const genStart = Date.now();
  const tools = (0, tools_data_1.getAllTools)(locale)
    .filter((tool) => !tool.comingSoon)
    .slice(0, 3)
    .map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      url: tool.url,
      iconKey: tool.iconKey,
    }));
  const genDur = Date.now() - genStart;
  const resp = (0, api_middleware_1.createApiSuccess)({
    tools,
    docs: docRecommendations[locale],
  });
  try {
    const total = Date.now() - opStart;
    const timing = `gen;dur=${genDur}, total;dur=${total}`;
    resp.headers.set('Server-Timing', timing);
  } catch {}
  return resp;
});
