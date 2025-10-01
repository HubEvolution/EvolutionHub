# Documentation Style Guide

This guide defines conventions for authoring and maintaining docs in Evolution Hub.

## Routes and Links

- Use code spans for file paths and routes: `src/pages/index.astro`, `/api/auth/magic/request`.
- Do not append line suffixes to links (avoid `(path:1)`).
- Prefer relative links that resolve from the current doc. Example:
  - `../../src/pages/index.astro` from a doc in `docs/frontend/`.
- Legacy UI routes are forbidden in docs text and examples:
  - Disallow: `/auth/login`, `/auth/password-*`, `/reset-password` (UI).
  - Allowed: Deprecated API references under `/api/auth/*` with 410 Gone context.

## Auth flow

- Current auth is Magic Link only. Reference:
  - `POST /api/auth/magic/request`
  - `GET /api/auth/callback`
- When mentioning deprecated endpoints, explicitly state 410 Gone and include `details.Allow` where relevant.

## Markdown formatting

- Headings should be sentence case and consistent with the ToC anchors.
- Surround lists and fenced code blocks with blank lines (markdownlint MD031/MD032).
- Specify a language for fenced code blocks (MD040). Use `mermaid` for diagrams.
- Escape tokens that look like links: write `/[locale]/...` in backticks.

## Diagrams

- Mermaid blocks must start with ` ```mermaid` on its own line.
- Keep diagrams logically synced with the codebase. If a diagram becomes historical, add a note: "Hinweis (historisch): ..." and link to the current flow doc.

## CI enforcement

- `docs:routes:normalize` keeps `routes.md` link targets normalized.
- `scripts/docs-link-audit.mjs` blocks disallowed legacy links and `localhost:4321`.

## PR checklist for docs

- Validate links resolve (relative paths correct).
- No legacy UI routes.
- Auth references match Magic Link flow.
- Markdownlint passes locally (use `npm run format:check`).
