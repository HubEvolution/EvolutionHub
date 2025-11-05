---
description: 'SEO Read-only Launch – Statusbericht 2025-10-28 und nächste Schritte'
owner: 'SEO & Ops Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: 'src/layouts/BaseLayout.astro, src/lib/seo.ts, src/pages/sitemap.xml.ts, wrangler.toml'
---

<!-- markdownlint-disable MD051 -->

# SEO Read‑only Launch — Status & Next Steps (2025‑10‑28)

## Scope

- Variante A: Nur Suche/SEO sichtbar machen (keine Analytics, keine intrusive Änderungen).

- Maßnahmen ausschließlich read‑only bzw. idempotente API‑Calls.

## Current State (nach Launch)

- robots.txt: erlaubt Indexierung, `Sitemap: https://hub-evolution.com/sitemap.xml`.

- Sitemap (`/sitemap.xml`): dynamisch; enthält `/` und `/en/` inkl. `xhtml:link` hreflang.

- Canonical/hreflang: in `BaseLayout.astro` korrigierter Origin‑Fallback (PUBLIC_SITE_URL → Request‑Origin). Keine `127.0.0.1`‑Leaks mehr.

- `/` (Welcome) bleibt absichtlich `noindex`.

- Production envs: `BASE_URL=https://hub-evolution.com`, `PUBLIC_SITE_URL=https://hub-evolution.com` gesetzt (wrangler.toml).

- Search Console (per API):

  - Domain verifiziert via DNS‑TXT + Site Verification API.

  - Domain‑Property angelegt: `sc-domain:hub-evolution.com`.

  - Sitemap eingereicht: `https://hub-evolution.com/sitemap.xml` (pending, 2 URLs, 0 indexiert — erwartbar direkt nach Einreichung).

## Verification Notes

- Curl‑Checks nach Deploy: robots/sitemap ok; `/en/` canonical + hreflang → `https://hub-evolution.com/...`; `/` canonical ok, `noindex` weiterhin aktiv.

## Next Steps (Owner: Ops/SEO)

- In der Search Console (UI):

  - URL‑Prüfung für `/` und `/en/` → „Indexierung beantragen“.

  - Indexierungsberichte in den nächsten 24–72h beobachten (Fehler/Ausschlüsse).

- PageSpeed Insights (read‑only):

  - DE: [Report für /](https://pagespeed.web.dev/report?url=https%3A%2F%2Fhub-evolution.com%2F)

  - EN: [Report für /en/](https://pagespeed.web.dev/report?url=https%3A%2F%2Fhub-evolution.com%2Fen%2F)

- Optional, später (nicht Teil Read‑only):

  - Structured Data (JSON‑LD) für Hauptseiten anreichern.

  - E2E‑Smoke für canonical/hreflang ergänzen.

## Re‑run Checklist

- `curl -sS https://hub-evolution.com/robots.txt`

- `curl -sS -H 'Accept: application/xml' https://hub-evolution.com/sitemap.xml | head -n 20`

- `curl -sSL https://hub-evolution.com/ | grep -E 'rel="canonical"|hreflang=|robots' -i`

- `curl -sSL https://hub-evolution.com/en/ | grep -E 'rel="canonical"|hreflang=|og:url' -i`

## References

- Code: `src/layouts/BaseLayout.astro`, `src/lib/seo.ts`, `src/pages/sitemap.xml.ts`.

- Config: `wrangler.toml` (env.production.vars `BASE_URL`, `PUBLIC_SITE_URL`).

- Docs: `docs/seo.md`.
