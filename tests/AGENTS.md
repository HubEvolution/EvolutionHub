# AGENTS.md (Tests)

Geltung: Alle Tests in diesem Repository.

## Struktur & Konventionen

- Dateinamen: `*.test.ts[x]` entsprechend bestehender Ordnerstruktur (`tests`, `test-suite-v2`, `tests/src`).
- Integrationstests verwenden `tests/shared/http.ts`.
- Performance‑Tests liegen unter `tests/performance` und laufen zielgerichtet.

## Qualität

- Keine Zeit‑/Sleep‑basierten Flakes; deterministische Mocks/Stubs verwenden.
- Testet beobachtbares Verhalten, nicht Implementierungsdetails.
- Fixtures/Seeds aus `tests/integration/setup/*` oder `src/pages/api/test/*` wiederverwenden.

## Abdeckung

- Fokus auf geänderte Bereiche; keine künstliche Coverage‑Jagd.
