---
description: i18n Audit – findet Fallback-Leaks (leere Werte, Parität, Marker) und prüft Kernrouten
auto_execution_mode: 3
---

# i18n Audit

Dieser Workflow prüft die i18n-Implementierung auf Fallback-Leaks (leere Werte, Parität/Schemas, Marker) und optional auf SSR-Ausgaben mit Fallback-Markern.

1. Vorbereitungen

- BASE_URL festlegen (Standard: <http://127.0.0.1:8787>)
- Dev-Worker lokal starten, falls Laufzeit-Scan genutzt wird:

```sh
npm run dev:worker:dev
```

// turbo

1. Leere Werte reporten

```sh
npm run i18n:report
```

- Erwartung: "en: 0 empty values", "de: 0 empty values"
- Wenn >0: zuerst übersetzen, dann erneut prüfen

// turbo

1. Paritäts-/Schemascan

```sh
npm run i18n:validate
```

- Erwartung: "[i18n:validate] OK ..." für nav, nav_language, cta, comingSoon, pages.\*

1. Diffs anzeigen (Diagnose, nicht-blockend)

// turbo

```sh
npm run i18n:diff || true
```

1. Codebase nach Fallback-Markern scannen (sollte nur in Tests vorkommen)

// turbo

```sh
rg -n "_fallback_not_found|Falling back to English|Key \".*\" not found in locale" src/ tests/ || true
```

- Erwartung: Keine Treffer außer in Tests (z. B. `tests/unit/i18n.test.ts`)
- Hinweis (ohne ripgrep):

```sh
grep -R "_fallback_not_found\|Falling back to English\|Key \".*\" not found in locale" src/ tests/ || true
```

1. Laufzeit-HTML auf Fallback-Marker scannen (SSR-Leaks)

// turbo

```sh
export BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"
ROUTES=(
  "/"
  "/en/"
  "/blog"
  "/en/blog"
  "/pricing"
  "/en/pricing"
  "/tools"
  "/en/tools"
  "/tools/voice-visualizer"
  "/en/tools/voice-visualizer"
)
for r in "${ROUTES[@]}"; do
  echo "GET $BASE_URL$r";
  out="$(curl -fsS "$BASE_URL$r" || true)";
  if echo "$out" | rg -q "_fallback_not_found"; then
    echo "LEAK: $r enthält Fallback-Marker";
  fi
done

1. Exit-Kriterien

- Wenn Schritt 2–3 OK und Schritt 5–6 keine LEAKs ausgeben → i18n-Audit bestanden
- Bei LEAKs: fehlende Keys/Übersetzungen in `src/locales/*.json` ergänzen und Audit erneut ausführen
```
