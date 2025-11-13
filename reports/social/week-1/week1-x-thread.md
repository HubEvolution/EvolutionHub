# Week 1 — X Thread (Architecture & Edge)

Goal: Announce the foundational stack (Astro + Cloudflare Workers) and why it fits Evolution Hub.
Language: EN only

1) We’re building Evolution Hub in public. Here’s why we chose Astro + Cloudflare Workers (edge/serverless) as our foundation.
2) Speed at the edge: critical assets and API endpoints run close to users → lower latency, better UX globally.
3) Astro’s islands give us precise control over hydration. Result: smaller bundles, predictable performance.
4) Security‑first middleware: strict headers, same‑origin, double‑submit CSRF on unsafe methods.
5) Rate limits + quotas: KV/D1‑backed, Retry‑After for clean client backoffs.
6) Consistent APIs: JSON envelopes, Zod validation, OpenAPI contracts.
7) Storage layout: R2 for assets/results, KV for usage and jobs, D1 for accounts and audit trails.
8) Observability: minimal redacted logs, health checks, and focused smokes in CI.
9) Trade‑offs: Edge strengths ≠ silver bullet; we keep complexity low and document decisions.
10) Follow along — weekly build logs + takeaways: [hub-evolution.com](https://hub-evolution.com/?utm_source=x&utm_medium=social&utm_campaign=buildlog-s1&utm_content=week1-thread)

Hashtags: #EvolutionHub #Cloudflare
