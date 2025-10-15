# KiloCode MCP Configuration and Secrets Policy

This folder contains local tooling configuration used by developer assistants (MCP servers, rules, etc.).

## Stripe MCP Server — Do NOT Commit Secrets

- Never include a Stripe API key in repo-tracked files.
- In `.kilocode/mcp.json`, do not pass `--api-key=...` to `@stripe/mcp`.
- Configure API keys via environment instead:
  - Shell env: `export STRIPE_API_KEY=sk_live_...`
  - Or use a `.env` entry loaded by your MCP runner (never commit `.env`).
- If a secret was accidentally committed:
  1. Rotate it immediately in the Stripe dashboard.
  2. Remove it from all branches/commits to satisfy GitHub push protection.

## Local Safety Checks

- Before pushing, we run a lightweight secrets scan:
  - `npm run security:scan`
  - Hooked into `.husky/pre-push`.
- You can run it locally anytime to verify no obvious keys are present.

## Playwright in Git Hooks

- Git hooks set `PW_NO_SERVER=1` to avoid starting a new local server during pre-push.
- E2E smoke runs only if `TEST_BASE_URL` is reachable to prevent port conflicts.

## Contact

If you encounter issues with MCP servers or push protection, remove any inline secrets and prefer environment-based configuration.

## Sync (auto)

```sync:kilocode:<filename>
# deltas/naming/interfaces/pfade für dieses Kilocode-Modul
```
