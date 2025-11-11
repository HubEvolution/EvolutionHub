---
description: 'Monitoring-Baseline und Runbook für Evolution Hub'
owner: 'Operations Team'
priority: 'medium'
lastSync: '2025-11-03'
codeRefs: 'docs/ops/, scripts/, monitoring providers'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Monitoring & Runbook

This document describes our free-to-use external monitoring baseline and operational runbook for Evolution Hub.

## Scope

- External uptime checks for public endpoints and SSL.

- Heartbeats for scheduled/cron worker tasks.

- Optional OSS status page (Upptime) backed by GitHub Actions/Pages.

## Monitors (authoritative list)

- Homepage: GET <https://hub-evolution.com/>

- API Health: GET <https://hub-evolution.com/api/health>

- SSL Certificate: hub-evolution.com (expiry warning)

- SSL Certificate: login.hub-evolution.com (expiry warning)

- (Optional) SSL Certificate: login-test.hub-evolution.com (expiry warning)

- Critical API: GET <https://hub-evolution.com/api/ai-image/usage>

  - Rationale: read-only, stable, reflects core feature availability.

  - Alternatives: GET /api/voice/usage or GET /api/prompt/usage

Notes

- Use 200 OK as success. Keyword checks optional.

- Expect free-tier intervals around 5 minutes.

## Providers

- UptimeRobot (Free): external checks + iOS push/email, simple status page.

- Healthchecks.io (Free): heartbeats for cron/worker tasks.

- Upptime (OSS): repo-driven status page via GitHub Actions/Pages (optional).

## UptimeRobot – Setup checklist

- Create monitors

  - HTTP(s): Homepage (/), API Health (/api/health), Critical API (/api/ai-image/usage).

  - SSL monitor for hub-evolution.com

  - SSL monitor for login.hub-evolution.com

  - (Optional) SSL monitor for login-test.hub-evolution.com

- Notifications

  - Enable push (iOS app) and email. Optionally Slack/Discord/Webhook (free integrations).

- Status page (optional)

  - Enable public status page and add the four monitors.

## Healthchecks.io – Heartbeats for Cron Worker

Worker integration is in place and gated by env vars. Set these per environment (wrangler.toml):

- HC_PRICING: heartbeat for Pricing smoke task

- HC_AUTH: heartbeat for Prod-Auth health task

- HC_DOCS: heartbeat for Docs inventory task

Behavior

- On task start: ping `${HC_*}/start`

- On success: ping `${HC_*}`

- On failure: ping `${HC_*}/fail`

Optional

- Leave vars unset to disable heartbeats in a given env.

## Upptime (optional) – GitHub OSS status page

- Create a repo from <https://github.com/upptime/upptime> template.

- Configure `.upptimerc.yml` with sites, for example:

  - <https://hub-evolution.com/>

  - <https://hub-evolution.com/api/health>

  - <https://hub-evolution.com/api/ai-image/usage>

- Enable GitHub Pages for the repo.

- (Optional) Add the status URL to README or docs.

Trade-offs

- Free, versioned, but interval bound by GitHub Actions quotas (often 5–15 minutes). No native iOS push.

## Severity & actions

- Sev-1 (Hard DOWN): Multiple monitors fail concurrently (Homepage + /api/health + Critical API)

  - Actions: Acknowledge, create incident note, check recent deploys/CF status, roll back if needed.

- Sev-2 (Partial degradation): Only Critical API fails, homepage OK

  - Actions: Inspect service logs, providers, rate limits; communicate on status page.

- Sev-3 (Informational): SSL expiry warning in <14 days

  - Actions: Renew certificate; verify after issuance.

## Maintenance windows

- Prefer pausing monitors or using provider maintenance windows during planned work to avoid false alerts.

- Record the window in the incident/ops notes if public status is affected.

## Troubleshooting quick checks

- Confirm `/api/health` returns 200 and status "ok" or "degraded" with service details.

- Check `GET /api/ai-image/usage` returns `{ success: true, ... }` and X-Usage-* headers.

- Validate DNS/CF changes; look for recent deploys and middleware/CSP updates.

- For worker tasks, review Healthchecks.io last pings and the Cron Worker KV keys:

  - `pricing:last:<host>`

  - `prod-auth:last:<host>`

  - `docs-registry:last`

## Alert routing (free)

- Start with iOS push and email.

- Add Slack/Discord/Webhook in UptimeRobot as needed.

## Expectations / SLO (free tier)

- Check interval ~5 min → detection delay can be 1–2 intervals.

- For tighter SLOs (1‑min checks, multi-region, on-call), consider paid tiers later.

## Appendix – Environment variables (Cron Worker)

- INTERNAL_HEALTH_TOKEN: shared token to authorize internal/cron endpoints

- BASE_URL: primary site base URL (e.g., <https://hub-evolution.com>)

- BASE_URLS: JSON array of base URLs if multiple hosts

- HC_PRICING / HC_AUTH / HC_DOCS: Healthchecks.io ping URLs (optional)

## Ownership

- Ops: Engineering (Infra)

- Documentation: This file (docs/ops/monitoring.md)
