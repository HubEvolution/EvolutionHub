---
trigger: always_on
scope: frontend
extends:
  - api-and-security.md
  - observability.md
  - tooling-and-style.md
  - project-structure.md
  - testing-and-ci.md
priority: medium
---

# Frontend State Rules

## Zweck

Konsistente, robuste State‑ und Data‑Fetching‑Patterns für Astro + React Islands (inkl. Admin/Tools/Notifications) – mit klaren Loading/Error‑States, sicheren Fetches, Abbruch/Timeout‑Handling und minimalem UI‑Jank.

## Muss

- State-Scope klar halten
  - **Lokal (Component State)**: `useState`/`useReducer` für UI‑State (Dialog offen, selected tab, form fields, toast flags).
  - **Shared (Store)**: nur wenn mehrere Komponenten/Islands denselben Zustand brauchen oder komplexe Übergänge vorliegen.
    - Im Repo existieren Stores unter `src/stores/**` (z. B. Zustand).
  - Keine “Global Stores” für kurzlebigen UI‑State.

- Data Fetching: Loading/Error/Empty explizit
  - Jeder Fetch‑Flow muss explizit behandeln:
    - `loading` (initial / refresh / loadMore)
    - `error` (user‑friendly message)
    - `empty` (keine Daten)
  - Keine “silent failures” ohne UI‑Signal (außer bewusst: z. B. non‑critical stats refresh).

- Abort & Cleanup (Memory‑Leaks vermeiden)
  - Für Fetches in Hooks/Islands: **AbortController** nutzen und bei Unmount abbrechen.
    - Pattern existiert z. B. in Admin Hooks (`useAdminStatus`, `useAdminUserList`).
  - Bei timers (`setTimeout`, `setInterval`) immer cleanup (`clearTimeout`, `clearInterval`).

- Retry-After / Rate-Limits UI‑konform
  - Bei `429` sollen UI‑Flows `Retry-After` respektieren:
    - Entweder “Retry in X” anzeigen oder timed retry (mit Abort‑Handling).
    - Pattern existiert in Admin Hooks (`AdminApiError` + `retryAfterSec`).

- Same-Origin Requests
  - Requests zu internen APIs laufen mit `credentials: 'same-origin'` (wenn Session/Cookies relevant sind).
  - Keine Cross‑Origin Fetches auf interne Endpunkte.

- API Response Shapes
  - Client-Code soll die einheitlichen API‑Shapes berücksichtigen (`success: true|false`, `error`, `data`) und nicht “blind” `response.json()` als beliebiges Objekt behandeln.
  - Prefer: “narrowing”/assert helpers (z. B. `assertApiResponse(...)` Pattern in UI), statt `any`.

## Sollte

- Standardisierte Hook-Patterns
  - Für wiederkehrende Data‑Fetch Patterns pro Feature:
    - Hook `useXyz()` liefert `{ data, loading, error, refresh }`.
    - Optional: `loadingMore`, `hasMore`, `nextCursor`.
  - Refresh‑Strategien:
    - Bei Tools/Usage: refresh on `focus`, `visibilitychange`, `pageshow`, `storage` / `auth:changed` (Pattern existiert z. B. in `useUsage`).

- Timeouts defensiv
  - Für nicht‑kritische/UX‑sensitive Fetches (z. B. Admin Dashboard Widgets) kurze client‑side Timeouts nutzen, um UI nicht zu blockieren.
  - Keine endlosen “spinner states”.

- Polling bewusst & sparsam
  - Polling nur wenn nötig (z. B. Notifications):
    - interval klar dokumentieren (z. B. 30s),
    - cleanup on unmount,
    - errors nicht permanent toasten (optional silent log).
  - Prefer: Event‑basiert (pageshow/focus) statt aggressiver intervals.

- Stores & Normalisierung
  - Wenn Stores genutzt werden (z. B. `src/stores/*`):
    - klare Status‑Enum/Union (`idle|loading|success|error`),
    - error als string oder typed error,
    - keine großen, unbounded arrays ohne Pagination/Cap.

- Client Logging (Debug)
  - UI‑Debug Logs nur über `src/lib/client-logger.ts` und nur wenn `PUBLIC_ENABLE_DEBUG_PANEL === 'true'`.
  - Kein `console.log` in Hot‑Paths; wenn nötig, hinter Debug‑Flag.

## Nicht

- Keine State‑Updates nach Unmount
  - Keine `setState` im `finally`/`then` ohne “mounted/abort” Guard.
  - Keine `useEffect(async () => ...)` Patterns (stattdessen inner async function + cleanup).

- Keine untyped JSON‑Parsing Fallbacks
  - Kein `const data = (await res.json()) as any` in zentralen Hooks/Stores.
  - Keine “catch → {}” Patterns, die echte Fehler maskieren (außer bewusst non‑critical).

- Keine Global‑Stores für Security‑kritische Daten
  - Keine Tokens/Secrets in Client State.
  - Sensitive Identifiers (emails) nicht in Stores persistieren, wenn nicht zwingend.

## Checkliste

- [ ] Jeder Fetch hat `loading/error/empty` Handling.
- [ ] AbortController + cleanup sind vorhanden (oder begründet nicht nötig).
- [ ] 429 / Retry‑After wird UX‑konform behandelt.
- [ ] `credentials: 'same-origin'` gesetzt, wenn Cookies relevant sind.
- [ ] Keine `setState` nach Unmount (mountedRef/Abort guard).
- [ ] Stores sind klein, typed, capped/paginated.

## Code‑Anker

- Stores:
  - `src/stores/*` (z. B. `quickActionStore.ts`, `comment-store.ts`, `projectStore.ts`)
- Admin Hooks (Abort/Retry Patterns):
  - `src/components/admin/dashboard/hooks/useAdminStatus.ts`
  - `src/components/admin/dashboard/hooks/useAdminUserList.ts`
- Tool Hooks (Refresh on focus/visibility/auth-change):
  - `src/components/tools/imag-enhancer/hooks/useUsage.ts`
  - `src/components/tools/prompt-enhancer/hooks/useUsage.ts`
- Notifications (Polling Pattern):
  - `src/components/notifications/NotificationCenter.tsx`

## CI/Gates

- `npm run lint`
- `npm run test`
- Bei Änderungen an UI‑kritischen Flows zusätzlich:
  - `npm run test:e2e` (mindestens relevante Smokes)

## Referenzen

- [.windsurf/rules/api-and-security.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/api-and-security.md:0:0-0:0)
- [.windsurf/rules/observability.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/observability.md:0:0-0:0)
- [.windsurf/rules/testing-and-ci.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/testing-and-ci.md:0:0-0:0)
- [.windsurf/rules/tooling-and-style.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/tooling-and-style.md:0:0-0:0)
- [.windsurf/rules/project-structure.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/project-structure.md:0:0-0:0)

## Changelog

- 2025-12-16: Erstfassung Frontend State (Islands/Stores, Fetching, Abort/Cleanup, Retry-After, Anti-Patterns).
