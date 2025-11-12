# Validierte Arbeitsbereich-Regeln für Evolution Hub

## Übersicht

Diese Arbeitsbereich-Regeln sind speziell für Evolution Hub optimiert und basieren auf der tatsächlichen Projektstruktur und bewährten Praktiken.

## Projekt-spezifische Testing-Standards

### Test-Organisation nach Features

#### AI Image Enhancer Tests

**Validierte Struktur:**

- Unit Tests: `tests/unit/ai-jobs-provider-mapping.test.ts`
- Integration: `tests/integration/` (AI-spezifische Endpunkte)
- E2E: `test-suite-v2/src/e2e/tools/` (Image Enhancement Workflows)

#### Prompt Enhancer Tests

**Validierte Struktur:**

- Unit Tests: `tests/unit/hooks/useEnhance.test.tsx`, `tests/unit/hooks/useUsage.test.tsx`, `tests/unit/hooks/useRateLimit.test.tsx`
- Integration: `tests/integration/prompt-enhance-multipart.test.ts`
- E2E: `tests/e2e/specs/prompt-enhancer.spec.ts`

#### Authentication Tests

**Validierte Struktur:**

- Unit Tests: Auth-Utilities und Helper-Funktionen
- Integration: `tests/integration/auth.test.ts`, `tests/integration/magic-link.test.ts`
- E2E: `test-suite-v2/src/e2e/auth/` (Vollständige Auth-Flows)

### Test-Fixtures und Helpers

#### Wiederverwendbare Fixtures

**Aus test-suite-v2/fixtures/:**

- `auth-helpers.ts` - Authentication Setup und Utilities
- `common-helpers.ts` - Gemeinsame Test-Hilfsmittel
- `tool-helpers.ts` - Tool-spezifische Test-Utilities

#### Best Practices für Fixtures

- **Isolation**: Jede Fixture für sich allein verwendbar
- **Cleanup**: Automatische Ressourcen-Bereinigung
- **Realismus**: Production-ähnliche Testdaten
- **Wartbarkeit**: Klare Struktur und Dokumentation

## CI/CD-Optimierung für Evolution Hub

### Aktuelle Pipeline-Performance

#### Parallelisierungsmöglichkeiten

**Aktuelle Jobs (aus unit-tests.yml):**

- `docs-routes-normalize` - Kann parallel zu allen anderen Jobs laufen
- `docs-link-audit` - Unabhängig von Code-Änderungen
- `lint` - Kann parallel zu `security` und `unit` laufen
- `security` - Unabhängig von Tests
- `unit` - Kann parallel zu `e2e` laufen
- `e2e` - Browser-Tests können auf verschiedenen Maschinen laufen
- `check` - Kann parallel zu anderen Jobs laufen
- `openapi` - Unabhängig von Code-Tests

#### Optimierungsvorschläge

```yaml
# Empfohlene Matrix-Strategie für Browser-Tests
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
    include:
      - browser: chromium
        os: ubuntu-latest
      - browser: firefox
        os: ubuntu-latest
      - browser: webkit
        os: macos-latest
```

### Build-Optimierung

#### Worker-Build-Strategien

**Aus package.json scripts:**

- `build:worker` - Produktions-Build mit Asset-Optimierung
- `build:worker:staging` - Staging-spezifischer Build
- `build:worker:dev` - Entwicklungs-Build mit Debug-Features

#### Empfohlene Caching-Strategie

```yaml
- name: Cache Node Modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache Playwright
  uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
```

## Quality Gates für Evolution Hub

### Erweiterte Quality Checks

#### Performance-Metriken

- **Bundle Size**: <500KB für Worker-Build
- **Lighthouse Score**: ≥90 für alle Metriken
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **API Response Time**: <50ms für Worker-Endpunkte

#### Sicherheits-Metriken

- **Dependency Audit**: Moderate Level bestanden
- **Security Headers**: Alle empfohlenen Header implementiert
- **Rate Limiting**: Korrekte Implementierung für alle Endpunkte
- **Input Validation**: Umfassende Sanitization

### Dokumentations-Standards

#### Code-Dokumentation

- **JSDoc**: Für alle öffentlichen APIs
- **README**: In jedem Hauptverzeichnis
- **Inline Comments**: Für komplexe Business-Logik
- **API-Dokumentation**: OpenAPI-Spezifikation aktuell

#### Projekt-Dokumentation

- **Entwicklungs-Guide**: `docs/development/`
- **API-Referenz**: `docs/api/`
- **Architektur-Docs**: `docs/architecture/`
- **Tool-Dokumentation**: `docs/tools/`

## Evolution Hub-spezifische Best Practices

### Error Handling

**Validierte Patterns:**

- **API Errors**: `createApiSuccess`/`createApiError` verwenden
- **Client Errors**: Strukturierte Error Boundaries
- **Logging**: Security-Logger für sensible Operationen
- **Monitoring**: Health Checks für alle kritischen Services

### State Management

**Validierte Patterns:**

- **Server State**: Cloudflare KV für session-übergreifende Daten
- **Client State**: React Hooks mit lokaler Persistierung
- **Form State**: Validierte Form-Handler mit Error-Feedback
- **Cache State**: Intelligente Cache-Strategien für Performance

### Internationalisierung

**Validierte Standards:**

- **Translation Files**: `src/locales/de.json`, `src/locales/en.json`
- **Key Management**: Konsistente Naming-Konventionen
- **Fallbacks**: Sichere Fallback-Strategien
- **Testing**: i18n-spezifische Test-Coverage

## Migration und Wartung

### Test-Migration

**Von Legacy zu Modern:**

- **Vitest Migration**: Bestehende Tests zu Vitest konvertieren
- **Playwright v2**: Neue E2E-Struktur implementieren
- **Fixture-Migration**: Alte Fixtures zu neuen Standards migrieren
- **Coverage-Erweiterung**: Neue Bereiche mit Tests abdecken

### Performance-Optimierung

**Kontinuierliche Verbesserung:**

- **Bundle Analysis**: Regelmäßige Bundle-Size-Überprüfung
- **Database Optimization**: Query-Performance überwachen
- **CDN Optimization**: Asset-Delivery optimieren
- **Cache Strategy**: Cache-Effektivität messen

## Troubleshooting für Evolution Hub

### Häufige Probleme und Lösungen

#### Testing Issues

- **Flaky E2E Tests**: Retry-Mechanismen implementieren
- **Coverage Gaps**: Systematische Lücken identifizieren und schließen
- **Environment Issues**: Vollständige Testumgebungen sicherstellen
- **Browser Compatibility**: Cross-Browser-Probleme früh erkennen

#### Deployment Issues

- **Build Failures**: Detaillierte Error-Logs und Rollback-Strategien
- **Performance Regression**: Automatische Performance-Überwachung
- **Security Issues**: Sofortige Alerts bei Sicherheitsproblemen
- **Database Issues**: Backup- und Recovery-Strategien

### Debug-Strategien

#### Lokale Entwicklung

- **Debug Mode**: Umfassende Logging-Optionen
- **Hot Reload**: Schnelle Iteration mit Astro Dev Server
- **Network Inspection**: API-Calls und Responses überwachen
- **State Inspection**: React DevTools für State-Debugging

#### Produktions-Debugging

- **Remote Logging**: Strukturierte Logs für Produktions-Issues
- **Performance Monitoring**: Real User Monitoring implementieren
- **Error Tracking**: Zentralisierte Error-Aggregation
- **Health Monitoring**: Automatische Gesundheitschecks

## Compliance und Standards

### Datenschutz (GDPR)

- **User Consent**: Cookie-Einverständniserklärung implementiert
- **Data Processing**: Transparente Datenverarbeitung
- **User Rights**: Recht auf Datenlöschung und -export
- **Security Measures**: Verschlüsselung und sichere Übertragung

### Accessibility (WCAG)

- **Keyboard Navigation**: Vollständige Tastatur-Unterstützung
- **Screen Reader**: ARIA-Labels und semantische HTML
- **Color Contrast**: WCAG AA konforme Farbkontraste
- **Focus Management**: Sichtbare Focus-Indikatoren

## Team-Workflows

### Code Review Standards

- **Testing Requirements**: Jede PR muss Tests enthalten
- **Documentation Updates**: Begleitende Dokumentationsänderungen
- **Security Review**: Sicherheitsrelevante Änderungen prüfen
- **Performance Impact**: Performance-Auswirkungen bewerten

### Release Management

- **Semantic Versioning**: Konsistente Versionsnummern
- **Release Notes**: Automatische Generierung aus Commits
- **Rollback Strategy**: Schnelle Rücknahme bei Problemen
- **Communication**: Stakeholder über Releases informieren

## Ressourcen und Tools

### Entwicklungsumgebung

- **Editor Setup**: Einheitliche Editor-Konfiguration
- **Debug Tools**: Integrierte Debugging-Werkzeuge
- **Testing Tools**: Lokale Test-Ausführung optimiert
- **Build Tools**: Schnelle Build- und Deploy-Prozesse

### Monitoring und Analytics

- **Application Monitoring**: Performance und Error-Tracking
- **User Analytics**: Nutzungsstatistiken und User-Journeys
- **Business Metrics**: Conversion und Engagement-Metriken
- **Security Monitoring**: Sicherheits-Events und Alerts

## Fazit

Diese Arbeitsbereich-Regeln sind speziell auf Evolution Hub zugeschnitten und basieren auf der tatsächlichen Projektstruktur. Sie sollen:

1. **Konsistenz fördern**: Einheitliche Standards für alle Team-Mitglieder
2. **Qualität sicherstellen**: Robuste Testing- und Deployment-Prozesse
3. **Wartbarkeit verbessern**: Klare Strukturen und Dokumentation
4. **Innovation ermöglichen**: Raum für neue Features und Verbesserungen

**Basierend auf:**

- ✅ Aktuelle GitHub-Workflows und CI/CD-Pipeline
- ✅ Bestehende Test-Strukturen und -Dateien
- ✅ Package.json und tsconfig.json Konfigurationen
- ✅ Dokumentations-Standards und Projektorganisation
- ✅ Sicherheitsrichtlinien und Best Practices
