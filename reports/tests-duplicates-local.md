# Test Duplicates – Local Environment

## Confirmed Duplicates

- `tests/unit/utils/logger.test.ts` & `test-suite-v2/src/unit/utils/logger.test.ts`
  - Identical describe/it blocks, including `.skip` branches
  - Both load legacy logger helper `tests/src/legacy/utils/logger`
  - Recommendation: Keep canonical location in `tests/unit/**`, remove v2 copy

## Suspected Duplicates (Need Deeper Review)

- Utility/tests mirrored under `tests/unit/**` and `test-suite-v2/src/unit/**` (e.g., hooks/services)
  - Pattern suggests earlier migration; verify before removal

## Non-Duplicates (Reviewed)

- Playwright v1 vs v2 E2E specs cover different harnesses; keep until legacy deprecation approved
