---
description: 'PR-Template: Imag-Enhancer Help UI, Fokussteuerung und Tests'
owner: 'Documentation Team'
priority: 'low'
lastSync: '2025-11-04'
codeRefs: 'src/components/tools/ImagEnhancerIsland.tsx, src/components/tools/imag-enhancer/HelpModal.tsx, tests/unit/imag-enhancer/**, test-suite-v2/src/e2e/imag-enhancer.spec.ts'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# PR: Imag‑Enhancer – Help UI, Focus Trap, i18n Keyboard Hint, Tests

## Summary

This PR enhances the Imag‑Enhancer tool with an accessible Help modal, focus management improvements, richer i18n for the keyboard hint, and dedicated tests.

## Changes

- Help modal UI with accessible focus trap and Esc close.

- Restores focus to the Help button after modal close.

- i18n: dedicated keyboardHint (compare) wired with robust fallback; DE strings updated.

- E2E: opens Help (Help/Hilfe), asserts dialog, closes with Esc.

- Unit tests:

  - Keyboard shortcuts on compare handle (arrows, 0, 1, +/-).

  - Focus trap behavior in Help modal (Tab/Shift+Tab) and return focus to opener.

- Changelog entry added under Unreleased.

## Files of Interest

- `src/pages/tools/imag-enhancer/app.astro` – i18n wiring for compare.keyboardHint with safe fallback.

- `src/components/tools/ImagEnhancerIsland.tsx` – consumes i18n, renders Help button and passes ref for focus return.

- `src/components/tools/imag-enhancer/HelpModal.tsx` – new focus trap + focus return.

- `tests/unit/imag-enhancer/keyboard-shortcuts.test.tsx` – keyboard shortcuts.

- `tests/unit/imag-enhancer/help-modal-focus.test.tsx` – focus trap + return focus.

- `test-suite-v2/src/e2e/imag-enhancer.spec.ts` – Help modal smoke.

- `src/locales/de.json` – new translations for keyboardHint and help.*.

- `CHANGELOG.md` – Unreleased notes.

## i18n Keys

- `pages.tools.items.Imag-Enhancer.app.compare.keyboardHint`

- `pages.tools.items.Imag-Enhancer.app.help.button`

- `pages.tools.items.Imag-Enhancer.app.help.title`

- `pages.tools.items.Imag-Enhancer.app.help.close`

- `pages.tools.items.Imag-Enhancer.app.help.sections.upload`

- `pages.tools.items.Imag-Enhancer.app.help.sections.models`

- `pages.tools.items.Imag-Enhancer.app.help.sections.compare`

- `pages.tools.items.Imag-Enhancer.app.help.sections.quota`

Note: EN currently falls back to a descriptive default if keys are missing; DE is translated.

## Testing Notes

- Unit tests pass individually for the new specs.

- The E2E spec includes a non-blocking Help-modal smoke step.

## Accessibility

- Trap focus in the modal; close on Esc and backdrop click.

- Return focus to the invoking Help button on close.

## Risk & Rollout

- Low risk; Help UI is additive.

- i18n fallbacks ensure UI remains descriptive if translations are not present.

## Screenshots

- Consider attaching during review (modal open, focus ring, compare caption with hint).
