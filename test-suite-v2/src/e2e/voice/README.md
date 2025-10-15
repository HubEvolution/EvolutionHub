# Voice E2E (SSE + Poll) — Smoke

This folder contains a minimal end-to-end smoke test to verify that the Voice Transcriptor streaming endpoints are wired correctly in local dev and CI.

## What it tests

- Connect to `GET /api/voice/stream` (SSE) using an explicit `jobId` supplied by the client.
- Confirm the server responds (connected event) and keeps the connection alive.
- Query `GET /api/voice/poll?jobId=...` and assert a valid JSON snapshot is returned.

File: `stream-and-poll.spec.ts`

## Required flags (dev/CI)

The smoke expects streaming to be enabled and provider calls to be bypassed in dev:

- `VOICE_STREAM_SSE=1`
- `VOICE_STREAM_POLL=1`
- `VOICE_DEV_ECHO=1`
- Optional: `VOICE_R2_ARCHIVE=0`

These are configured for CI in `wrangler.ci.toml` and for local development under `[env.development.vars]` in `wrangler.toml`.

## How to run locally

```bash
# Run only this smoke
npm run test:e2e -- test-suite-v2/src/e2e/voice/stream-and-poll.spec.ts

# Open the last HTML report
npx playwright show-report test-suite-v2/reports/playwright-html-report
```

## Notes

- The spec generates its own `jobId` and passes it to `/api/voice/stream` to avoid relying on parsing server-sent data across different browsers.
- If flags are off, the spec tolerates `not_found`/`validation_error` shapes for `/api/voice/poll` and exits early.
- The canonical local dev origin is `http://localhost:8787` (auto-started by the Playwright config).
