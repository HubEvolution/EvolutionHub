# Tests Cleanup Plan

## Branch Template

- `chore/test-audit-<YYYYMMDD>` (e.g., `chore/test-audit-20251108`)

## Summary Table

| Priority | Item | Action | Risk / Nutzen | Coverage / Runtime Impact |
| --- | --- | --- | --- | --- |
| Remove | Duplicate logger suite (`test-suite-v2/src/unit/utils/logger.test.ts`) | Delete file; keep canonical `tests/unit/utils/logger.test.ts` | Low – identical content, no unique assertions | Slight runtime reduction; coverage unchanged |
| Consolidate | Parallel unit suites under `test-suite-v2/src/unit/**` vs. `tests/unit/**` | Inventory overlaps, migrate remaining unique cases into `tests/unit/**`, archive v2 copies | Medium – ensure no v2-only fixtures lost | Shorter unit runtime once duplicates removed |
| Update | Playwright OAuth specs (`test-suite-v2/src/e2e/auth/oauth/*.spec.ts`) | Replace global `test.skip` with env-gated helpers; document required secrets | Medium – re-enabling flows touches Stytch/GitHub OAuth | Higher E2E coverage when secrets present |
| Update | Integration setup port handling (`tests/integration/setup/global-setup.ts`) | Add guard to skip `killProcessOnPort` when `TEST_BASE_URL` set; document serialized execution | Low – respects existing behavior | Reduces flakiness for concurrent CI runs |
| Update | Rate-limited tool specs (AI Image/Webscraper) | Enforce `--workers=1` via Playwright project config or CLI docs; add explicit waits | Low – configuration-only | Stabilizes runtime; no coverage change |
| Keep | Playwright v1 legacy specs | Maintain until formal deprecation plan ready (ensures fallback harness) | Low – legacy maintenance cost | No change |

## Next Steps (post-approval)

1. **Kickoff branch** `chore/test-audit-<date>` and remove duplicate logger suite.
2. Assess remaining v2 unit suites, migrate unique tests, and delete redundant copies.
3. Refactor OAuth Playwright skips to conditional gating; verify with staging secrets.
4. Tweak integration setup and document serialized execution (README or report).
5. Apply rate-limit safeguards to Playwright configs.
6. Prepare follow-up PR summarizing removals/updates and attach updated reports.
