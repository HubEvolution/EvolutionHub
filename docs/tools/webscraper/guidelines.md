---
description: 'Webscraper Tool – Entwicklungs-Guidelines für Claude Code'
owner: 'Tools Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: 'src/components/tools/webscraper/**, src/lib/services/webscraper-service.ts, src/pages/api/webscraper/**'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Webscraper Tool - Claude Code Entwicklungs-Guidelines

## 🚀 Entwicklungshinweise für Claude Code

**Diese Spezifikation dient als primäre Entwicklungsgrundlage.**

### Entwicklungsansatz

- **Iterative Entwicklung**: Beginnen Sie mit Woche 1 und arbeiten Sie sich vor

- **Test-Driven Development**: Schreiben Sie Tests vor der Implementierung

- **Security-First**: Berücksichtigen Sie Sicherheitsaspekte von Anfang an

- **Performance-Conscious**: Optimieren Sie für Cloudflare Workers Edge Runtime

### Code-Strukturierung

```typescript
// Bevorzugte Projektstruktur:
src/
├── components/tools/webscraper/
│   ├── WebscraperIsland.tsx          // Haupt-UI-Komponente
│   ├── WebscraperForm.tsx            // Eingabeformular
│   ├── WebscraperResults.tsx         // Ergebnis-Display
│   └── types.ts                      // Lokale TypeScript-Interfaces
├── lib/services/
│   └── webscraper-service.ts         // Kernlogik und API-Calls
├── pages/api/webscraper/
│   ├── extract.ts                    // Haupt-API-Endpunkt
│   └── [..slugs].ts                  // Catch-all für zukünftige Endpunkte
└── config/
    └── webscraper.ts                 // Konfiguration und Constants

```text

### Coding Standards (strikt befolgen)

#### TypeScript-Richtlinien

- **Strict Mode**: Immer `strict: true` in tsconfig.json

- **Keine `any` Types**: Verwenden Sie spezifische Interface-Definitionen

- **Error Handling**: Umfassende Fehlerbehandlung mit strukturierten Fehlern

- **Async/Await**: Konsequente Verwendung für alle asynchronen Operationen

#### API-Entwicklung

- **Hono.js Framework**: Verwenden Sie die bestehenden Muster aus dem Projekt

- **Request Validation**: Valideren Sie alle Eingaben mit Zod oder ähnlichen Tools

- **Response Format**: Konsistentes `{ success: true, data: T }` Format

- **Error Responses**: Strukturierte Fehler mit `{ success: false, error: {...} }`

#### Sicherheitsanforderungen

- **CSRF Protection**: Implementieren Sie Double-Submit-Cookie-Muster

- **Rate Limiting**: Begrenzen Sie Anfragen nach Projektstandards

- **Input Sanitization**: Bereinigen Sie alle Benutzereingaben

- **HTTPS Only**: Erzwingen Sie sichere Verbindungen

### Testing-Anforderungen

#### Unit-Tests

```typescript
// Beispiel-Teststruktur
describe('WebscraperService', () => {
  it('should extract content from valid URL', async () => {
    const result = await webscraperService.extract('https://example.com');
    expect(result.success).toBe(true);
    expect(result.data.title).toBeDefined();
  });
});
```

#### Integration-Tests

- Testen Sie die kompletten API-Endpunkte

- Validieren Sie Datenbank-Interaktionen

- Testen Sie Fehlerfälle und Edge-Cases

#### E2E-Tests

- Verwenden Sie Playwright für Browser-Interaktionen

- Testen Sie komplette User-Workflows

- Integrieren Sie visuelle Regression-Tests

### Performance-Optimierung

#### Cloudflare Workers Optimierung

- **Bundle Size**: Halten Sie Bundles unter 1MB

- **Cold Starts**: Minimieren Sie Initialisierungszeit

- **Memory Usage**: Effiziente Speicherverwaltung

- **Network Requests**: Optimieren Sie externe API-Calls

#### Browser-Performance

- **Lazy Loading**: Implementieren Sie für schwere Komponenten

- **Caching**: Nutzen Sie Service Worker für Offline-Fähigkeiten

- **Image Optimization**: Komprimieren Sie automatisch Bilder

### Monitoring & Observability

#### Logging-Standards

```typescript
// Strukturiertes Logging nach Projektstandards
logger.info('Scraping job started', {
  jobId: '123',
  url: 'https://example.com',
  userId: 'user_456'
});

```text

##### Fehlerbehandlung

- **Graceful Degradation**: Fallbacks für fehlgeschlagene Operationen

- **User-Friendly Messages**: Klare Fehlermeldungen für Endbenutzer

- **Debugging Support**: Detaillierte Logs für Entwickler

### 📋 Checklisten für jeden Entwicklungsschritt

#### Vor der Implementierung

- [ ] **Anforderungsanalyse**: Verstehen Sie die Spezifikation vollständig

- [ ] **Architektur-Planung**: Entwerfen Sie die Lösungsarchitektur

- [ ] **Test-Planung**: Definieren Sie Testfälle im Voraus

- [ ] **Sicherheitsbewertung**: Identifizieren Sie potenzielle Risiken

#### Während der Implementierung

- [ ] **Code-Standards**: Befolgen Sie die Projekt-Coding-Standards

- [ ] **Error Handling**: Implementieren Sie umfassende Fehlerbehandlung

- [ ] **Logging**: Fügen Sie strukturiertes Logging hinzu

- [ ] **Dokumentation**: Kommentieren Sie komplexe Logik

#### Vor dem Commit

- [ ] **Tests**: Alle Tests müssen bestehen

- [ ] **Linting**: Code muss ESLint/Prettier-konform sein

- [ ] **Type Checking**: TypeScript-Fehler müssen behoben sein

- [ ] **Security Review**: Prüfen Sie auf Sicherheitslücken

#### Vor dem Deployment

- [ ] #### Integration-Tests: Cross-Tool-Interaktionen testen

- [ ] **Performance-Tests**: Last-Testing durchführen

- [ ] **Accessibility**: WCAG 2.1 AA-Compliance sicherstellen

- [ ] **Documentation**: Aktualisieren Sie Benutzerdokumentation

### 🔧 Nützliche Entwicklungstools

#### Lokale Entwicklung

```bash
# Entwicklungsserver starten
npm run dev

# Tests ausführen
npm run test:unit
npm run test:e2e

# Type-Checking
npm run astro:check

# Linting
npm run lint
```

#### Cloudflare Workers

```bash

# Lokales Testing

npm run wrangler:dev

# Deployment

npm run deploy

# Logs anzeigen

npm run wrangler:tails

```text

### ⚡ Best Practices für KI-gestützte Entwicklung

#### Prompt Engineering

- **Spezifische Anweisungen**: Seien Sie explizit in Ihren Anforderungen

- **Kontext-Bereitstellung**: Stellen Sie relevante Code-Beispiele zur Verfügung

- **Iterative Verfeinerung**: Bauen Sie auf vorherigen Ergebnissen auf

#### Code-Review

- **Selbstkritik**: Hinterfragen Sie generierten Code kritisch

- **Sicherheitsprüfung**: Überprüfen Sie generierten Code auf Sicherheitslücken

- **Performance-Analyse**: Bewerten Sie die Effizienz des Codes

#### Testing

- **Edge-Case-Coverage**: Testen Sie ungewöhnliche Szenarien

- **Error-Scenario-Testing**: Validieren Sie Fehlerbehandlung

- **Performance-Testing**: Messen Sie Antwortzeiten und Ressourcenverbrauch

### 🚨 Wichtige Warnhinweise

#### Sicherheitskritische Aspekte

- **Keine Secrets im Code**: Verwenden Sie Environment Variables

- **Input Validation**: Validieren Sie alle Benutzereingaben streng

- **Rate Limiting**: Implementieren Sie Schutz vor Missbrauch

- **PII Handling**: Achten Sie auf personenbezogene Daten

#### Performance-Kritische Aspekte

- **Memory Leaks**: Vermeiden Sie Speicherlecks in Workers

- **Infinite Loops**: Schützen Sie vor endlosen Schleifen

- **Resource Limits**: Respektieren Sie Cloudflare Workers Limits

- **Cold Start Optimization**: Minimieren Sie Initialisierungszeit

#### Qualitätskritische Aspekte

- **Code Duplication**: Vermeiden Sie wiederholten Code

- **Maintainability**: Schreiben Sie wartbaren und erweiterbaren Code

- **Documentation**: Dokumentieren Sie komplexe Logik

- **Standards Compliance**: Halten Sie sich an Projektstandards

---

*Siehe auch: [spec.md](spec.md), [roadmap.md](roadmap.md), [testing.md](testing.md)*

```text
