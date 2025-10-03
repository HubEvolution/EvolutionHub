# Performance- und Load-Tests

Diese Test-Suite führt umfassende Performance-Tests für die Rate-Limiting-Grenzen und Last-Tests für alle migrierten APIs durch.

## 📋 Übersicht

Die Performance-Tests bestehen aus drei Hauptkomponenten:

1. **Rate-Limiting-Tests** - Testet die korrekte Durchsetzung der Rate-Limits
2. **Stress-Tests** - Testet das System unter extremer Last
3. **Benchmark-Tests** - Misst die grundlegende Performance

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18+
- Cloudflare Wrangler (für lokale Entwicklung)
- Eine laufende Anwendung (lokal oder remote)

### Einfache Ausführung

```bash
# Rate-Limiting-Tests ausführen
npm run test:performance:rate-limit

# Stress-Tests ausführen
npm run test:performance:stress

# Benchmark-Tests ausführen
npm run test:performance:benchmark

# Alle Performance-Tests ausführen
npm run test:performance:all
```

### Mit benutzerdefinierten Parametern

```bash
# Teste spezifischen Endpunkt
tsx tests/performance/run-load-tests.ts rate-limit development newsletter

# Teste andere Umgebungen
tsx tests/performance/run-load-tests.ts benchmark staging

# Burst-Traffic-Test
tsx tests/performance/run-load-tests.ts stress development burst
```

## 📊 Rate-Limiting-Konfiguration

Die Tests verwenden die in den globalen Regeln definierten Rate-Limits:

| API-Endpunkt | Limit | Fenster | Beschreibung |
|-------------|-------|---------|-------------|
| Newsletter | 15/Minute | 1m | Newsletter-Anmeldungen |
| Lead-Magnet | 15/Minute | 1m | Lead-Magnet-Downloads |
| Avatar-Upload | 5/Minute | 1m | Profilbild-Uploads |
| Billing | 10/Minute | 1m | Zahlungsvorgänge |
| Dashboard | 30/Minute | 1m | Dashboard-Zugriffe |
| Projects | 20/Minute | 1m | Projekt-Operationen |

## 🧪 Test-Szenarien

### Rate-Limiting-Tests

**Normal Load** (z.B. Newsletter):
- 1 Request/Sekunde für 60 Sekunden
- Erwartet: 0 Rate-Limited-Requests
- Testet normale Benutzung

**High Load** (z.B. Newsletter):
- 5 Requests/Sekunde für 30 Sekunden
- Erwartet: ~50% Rate-Limited-Requests
- Testet hohe, aber realistische Last

**Burst Load** (z.B. Dashboard):
- 20 Requests/Sekunde für 10 Sekunden
- Erwartet: ~80% Rate-Limited-Requests
- Testet plötzliche Lastspitzen

### Stress-Tests

**Burst-Traffic**:
- Parallele Anfragen an mehrere Endpunkte gleichzeitig
- 50 Requests pro Endpunkt
- Testet das System unter extremer paralleler Last

**Sustained Load**:
- 25 Requests/Sekunde über 2 Minuten
- Testet anhaltende hohe Last

**Mixed Workload**:
- Verschiedene Endpunkte mit unterschiedlichen Gewichtungen
- 20 Requests/Sekunde über 90 Sekunden
- Testet realistische Mischlast

### Benchmark-Tests

- 100 parallele Requests an verschiedene Endpunkte
- Misst durchschnittliche Antwortzeiten
- Prüft Performance-Thresholds

## 📈 Performance-Thresholds

Die Tests prüfen automatisch diese Grenzwerte:

- **Max. durchschnittliche Antwortzeit**: 2000ms
- **Max. 95. Perzentil**: 5000ms
- **Min. Requests/Sekunde**: 5 RPS
- **Max. Fehlerquote**: 5%
- **Max. Speicherverbrauch**: 128MB
- **Max. CPU-Auslastung**: 80%

## 🔧 Konfiguration

### Umgebungen

**Development** (`localhost:8787`):
- Lokaler Cloudflare-Worker
- Höhere Timeouts für Debugging
- Mehr Retries für Stabilität

**Staging** (Staging-URL):
- Staging-Umgebung
- Produktionsnahe Konfiguration
- Mittlere Timeouts

**Production** (Produktions-URL):
- Live-Umgebung
- Strikteste Timeouts
- Minimal Retries

### Test-Daten

Die Tests verwenden vorbereitete Test-Daten:

```json
{
  "users": [
    { "email": "test1@example.com", "name": "Test User 1" }
  ],
  "projects": [
    { "name": "Load Test Projekt", "description": "Für Performance-Tests" }
  ],
  "leadMagnets": [
    "ki-tools-checkliste-2025",
    "new-work-transformation-guide"
  ]
}
```

## 📋 Test-Ergebnisse

### Beispiel-Ausgabe

```
🚀 Starte Rate-Limiting-Performance-Tests...

📊 Teste newsletter Rate-Limiting...
  └─ Normal_Load: 1 RPS für 60s
    ✅ Rate-Limiting funktioniert korrekt (0/60 Rate-Limited)
    📈 Performance: 150.23ms avg, 6.65 RPS

📊 Teste leadMagnet Rate-Limiting...
  └─ High_Load: 10 RPS für 20s
    ✅ Rate-Limiting funktioniert korrekt (85/200 Rate-Limited)
    📈 Performance: 245.67ms avg, 8.12 RPS
```

### Ergebnis-Dateien

Die Tests speichern detaillierte Ergebnisse als JSON:

```
load-test-results-rate-limit-development-2025-10-01T10-30-00-000Z.json
```

Jede Ergebnis-Datei enthält:
- Test-Metadaten (Zeit, Umgebung, Typ)
- Einzelne Testergebnisse
- Performance-Kennzahlen
- Rate-Limiting-Statistiken

## 🚨 Fehlerbehebung

### Häufige Probleme

**Server startet nicht**:
```bash
# Prüfe ob Port 8787 bereits verwendet wird
lsof -i :8787
# Töte den Prozess falls nötig
kill -9 <PID>
```

**Timeoutefehler**:
- Erhöhe Timeout in `load-test-config.json`
- Prüfe Netzwerk-Konfiguration
- Teste mit kleinerer paralleler Last

**Rate-Limiting funktioniert nicht**:
- Prüfe KV-Bindings in `wrangler.toml`
- Stelle sicher, dass Rate-Limiter-Middleware aktiv ist
- Prüfe Umgebungsvariablen

### Debugging

```bash
# Aktiviere detailliertes Logging
DEBUG=* npm run test:performance

# Teste einzelnen Endpunkt
tsx tests/performance/run-load-tests.ts rate-limit development newsletter

# Prüfe Server-Logs
wrangler dev --log-level debug
```

## 🔍 Monitoring

Die Tests überwachen automatisch:

- **Response Times** - Durchschnittliche und maximale Antwortzeiten
- **Throughput** - Requests pro Sekunde
- **Error Rates** - Anteil fehlgeschlagener Requests
- **Rate Limit Hits** - Anzahl Rate-Limitierter Requests
- **Resource Usage** - Speicher- und CPU-Auslastung

## 📚 Erweiterte Nutzung

### Eigenen Test hinzufügen

1. Erweitere `load-test-config.json`:
```json
{
  "rateLimitTests": {
    "myNewApi": {
      "endpoint": "/api/my-endpoint",
      "method": "POST",
      "limit": 10,
      "window": "1m",
      "testScenarios": [...]
    }
  }
}
```

2. Implementiere Test-Logik in `run-load-tests.ts`

3. Führe den neuen Test aus:
```bash
tsx tests/performance/run-load-tests.ts rate-limit development myNewApi
```

### CI/CD-Integration

Für kontinuierliche Performance-Überwachung:

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Täglich um 2 Uhr
  push:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:performance:benchmark
```

## 🎯 Best Practices

1. **Starte mit kleinen Lasten** und erhöhe diese graduell
2. **Teste alle Umgebungen** (Dev, Staging, Prod)
3. **Überwache Ressourcen** während der Tests
4. **Dokumentiere Performance-Regressions**
5. **Setze realistische Erwartungen** für Rate-Limiting
6. **Teste auch Fehlerfälle** (Network-Timeouts, etc.)

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfe die Logs auf Fehlermeldungen
2. Teste mit kleineren Lasten zuerst
3. Prüfe die Konfiguration in `load-test-config.json`
4. Stelle sicher, dass alle Dependencies installiert sind

Die Performance-Tests helfen dabei, die Stabilität und Skalierbarkeit der APIs sicherzustellen und frühzeitig Performance-Probleme zu identifizieren.