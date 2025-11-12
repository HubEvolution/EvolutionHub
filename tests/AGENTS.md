# AGENTS.md (Tests)

Geltung: Alle Tests in diesem Repository.

## Struktur & Konventionen

- Dateinamen: `*.test.ts[x]` entsprechend bestehender Ordnerstruktur (`tests`, `test-suite-v2`, `tests/src`).
- Integrationstests verwenden `tests/shared/http.ts`.
- Performance‑Tests liegen unter `tests/performance` und laufen zielgerichtet.

## Qualität

- Keine Zeit‑/Sleep‑basierten Flakes; deterministische Mocks/Stubs verwenden.
- Testet beobachtbares Verhalten, nicht Implementierungsdetails.
- Keine direkten `JSON.parse`‑Aufrufe in Tests; `tests/shared/http.ts` → `safeParseJson<T>()` nutzen.
- Fixtures/Seeds aus `tests/integration/setup/*` oder `src/pages/api/test/*` wiederverwenden.

## Abdeckung

- Mindestabdeckung: V8 Coverage ≥ 70% für `src/**/*.{ts,tsx}` (CI‑Gate).
- Fokus auf geänderte Bereiche; keine künstliche Coverage‑Jagd.

## Integration

- Same‑Origin Header und (wo erforderlich) Double‑Submit CSRF in API‑Tests setzen.
