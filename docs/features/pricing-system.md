---
description: 'Pricing-System: Stripe-Integration, Architektur und API-Referenz'
owner: 'Billing Team'
priority: 'high'
lastSync: '2025-11-10'
codeRefs: 'src/pages/api/billing/**, src/components/pricing/**, docs/development/stripe-setup.md'
feature: 'pricing-system'
status: 'shipped'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Pricing System Documentation

## Übersicht

Das Pricing-System von Evolution Hub ist eine vollständig implementierte, produktionsreife Lösung mit Stripe-Integration, die bereits echte zahlende Kunden bedient. Dieses Dokument dient als Single Source of Truth für alle Aspekte des Pricing-Systems.

## Customer incentives

- Trial conversions are tracked via Stripe Checkout sessions; upgrade funnels follow the same pricing table to avoid quote drift.
- Embedded upgrade prompts highlight remaining credits and the next tier's benefits with contextual modals instead of popups.
- Entitlement service exposes a read-only `GET /api/account/entitlements` endpoint so apps can toggle premium features without bundling price logic.
- Referral programme: each customer receives a personal invite link (visible in the dashboard). When a referred user signs up and verifies their account, the referrer earns bonus credits that appear in the referral card. Additional rewards unlock once referrals convert to paid plans, encouraging long-term advocacy.

## Live-Status (Stand: 10. Oktober 2025)

### 📊 **Aktuelle Kennzahlen**

- **3 aktive zahlende Kunden**

- **€7.174+ generierter Umsatz**

- **3 laufende Subscriptions**:
  - 2x Pro Monatlich (€14,99)

  - 1x Premium Jährlich (€249,90)

- **Automatische Verlängerungen**: Vollständig funktionsfähig

### 💳 **Stripe-Integration**

- **Produkte**: 3 aktive Produkte in Stripe konfiguriert

- **Preise**: Vollständig mit Codebase synchronisiert

- **Webhooks**: Automatische Subscription-Synchronisation

- **Payouts**: Erfolgreiche Auszahlungen an Bankkonto

## Architektur

### System-Komponenten

````mermaid
graph TB
    A[Pricing Page] --> B[PricingTable Component]
    A --> C[FeatureComparison Component]

    B --> D[Client-side JavaScript 289 lines]
    D --> E[CSRF Token Generation]
    D --> F[Workspace ID Management]
    D --> G[Checkout Session Creation]

    G --> H[/api/billing/session]
    H --> I[Stripe Checkout Session]
    I --> J[Stripe Payment Processing]
    J --> K[Webhook to /api/billing/stripe-webhook]

    K --> L[Database Updates D1]
    L --> M[User Plan Update]
    L --> N[Subscription Record]
    L --> O[Stripe Customer Link]

    H --> P[/api/billing/sync]
    P --> Q[Post-Payment Synchronization]
    Q --> L

    R[Credits Purchase] --> S[/api/billing/credits]
    S --> T[Stripe Payment Session]
    T --> U[KV Credit Storage]

```text

### Technologie-Stack

- **Frontend**: Astro 5 + React 18 + TypeScript 5 + Tailwind CSS 3

- **Backend**: Cloudflare Workers + D1 (SQLite) + KV + R2

- **Payment**: Stripe (Subscriptions + Payment Intents)

- **Testing**: Vitest + Playwright + ESLint + Prettier

## Frontend-Komponenten

### PricingTable (`src/components/pricing/PricingTable.astro`)

#### ✅ **Stärken**

- **Responsive Design**: Vollständige Mobile-Unterstützung

- **Internationalisierung**: DE/EN Sprachunterstützung

- **Accessibility**: WCAG AA konforme semantische HTML

- **Progressive Enhancement**: Graceful Degradation ohne JavaScript

#### ⚠️ **Verbesserungspotenzial**

- **Bundle-Größe**: 289 Zeilen client-seitiges JavaScript

- **Inline-Script**: Sollte in separate Datei ausgelagert werden

- **Modularisierung**: JavaScript-Logik könnte aufgeteilt werden

**Datei**: `src/components/pricing/PricingTable.astro:289`
**Zeilen**: 372 Gesamt, 289 JavaScript

### PricingDetails Modal (`src/components/pricing/PricingDetailsProvider.tsx`)

#### ✅ **Stärken**

- **Split-Panel Layout**: Logo/plan metadata links, Preis-Karte rechts; Highlights darunter in bis zu drei Spalten → keine Überlappung mehr.
- **Dynamische Preise**: Monats-/Jahrespreise werden über Provider-Context aktualisiert und auf Karten & Modals gespiegelt.
- **Event-Bridging**: Delegierter Listener (`PricingDetailsBootstrap`) sorgt dafür, dass alle `[data-pricing-detail-trigger]` Buttons modal-sicher sind.
- **Internationalisierung**: Texte & Bullets über i18n (`pages.pricing.details.*`) gepflegt; Modal zeigt erweiterte Strings, Karten verkürzte Fassungen.

#### ⚠️ **Verbesserungspotenzial**

- **Screenshot aktualisieren**: Neues Layout (Preisblock rechts) noch nicht im Asset-Ordner dokumentiert.
- **Tests**: Fehlen Playwright-Smokes für Modal-Layout (Desktop/Mobile) → zukünftiger Task.

**Dateien**: `src/components/pricing/PricingDetailsProvider.tsx`, `src/components/pricing/PricingDetailsBootstrap.tsx`

### FeatureComparison (`src/components/pricing/FeatureComparison.astro`)

#### ✅ **Stärken** (2)

- **Übersichtliche Darstellung**: Klare Feature-Matrix

- **Responsive Tabellen**: Horizontales Scrolling auf Mobile

- **Konsistente Formatierung**: Einheitliches Design-System

- **SEO-freundlich**: Semantische HTML-Tabellen

**Datei**: `src/components/pricing/FeatureComparison.astro`
**Zeilen**: 149

## API-Endpunkte

### `/api/billing/session` (`src/pages/api/billing/session.ts`)

**Zweck**: Erstellt Stripe Checkout-Sessions für Subscriptions

#### ✅ **Sicherheitsfeatures**

- **CSRF-Schutz**: Token-basierte Validierung

- **Rate Limiting**: 30 Requests/Minute (via `apiRateLimiter`)

- **Input Validation**: Umfassende Parameter-Prüfung

- **Audit-Logging**: Vollständige Aktivitätsprotokollierung

- **Error Handling**: Strukturierte Fehlerantworten

#### ✅ **Funktionalität**

- **Multi-Modell**: Monatliche und jährliche Subscriptions

- **Workspace-Unterstützung**: Mehrbenutzer-Umgebungen

- **Environment-Konfiguration**: Flexible Preis-Mapping

- **Fallback-Mechanismen**: Robuste Fehlerbehandlung

**Datei**: `src/pages/api/billing/session.ts:108`
**Sicherheitslevel**: Hoch

### `/api/billing/credits` (`src/pages/api/billing/credits.ts`)

**Zweck**: Einmalige Credit-Käufe (200/1000 Bilder)

#### ✅ **Sicherheitsfeatures** (2)

- **Rate Limiting**: 30 Requests/Minute (via `apiRateLimiter`)

- **Input Validation**: Strikte Pack-Größen-Prüfung

- **Audit-Logging**: Käufe werden protokolliert

- **Environment-Sicherheit**: API-Keys aus Environment-Variablen

#### ✅ **Funktionalität** (2)

- **Flexible Pack-Größen**: 200 oder 1000 Credits

- **KV-Speicherung**: Sofortige Credit-Gutschrift

- **Metadata-Tracking**: Vollständige Transaktionshistorie

**Datei**: `src/pages/api/billing/credits.ts:75`
**Sicherheitslevel**: Hoch

### `/api/billing/stripe-webhook` (`src/pages/api/billing/stripe-webhook.ts`)

**Zweck**: Verarbeitet Stripe Webhook-Events

#### ✅ **Sicherheitsfeatures** (3)

- **Signatur-Verifikation**: Schutz vor gefälschten Events

- **Rate Limiting**: 100 Requests/Minute (spezialisierter Limiter)

- **Event-Filtering**: Nur relevante Events werden verarbeitet

- **Error-Handling**: Umfassende Fehlerprotokollierung

#### ✅ **Funktionalität** (3)

- **Subscription-Lifecycle**: Create, Update, Delete Events

- **Credit-System**: Automatische Gutschrift bei Käufen

- **Pending Association**: Behandlung unvollständiger User-Kontexte

- **Datenbank-Synchronisation**: Automatische User-Plan-Updates

**Datei**: `src/pages/api/billing/stripe-webhook.ts:285`
**Sicherheitslevel**: Kritisch

### `/api/billing/sync` (`src/pages/api/billing/sync.ts`)

**Zweck**: Post-Payment-Synchronisation nach erfolgreichem Checkout

#### ✅ **Sicherheitsfeatures** (4)

- **User-Matching**: Strikte Validierung der User-Identität

- **Session-Validierung**: Prüfung der Stripe-Session-Integrität

- **Rate Limiting**: 30 Requests/Minute (via `apiRateLimiter`)

- **Error-Redirect**: Sichere Weiterleitung bei Fehlern

#### ✅ **Funktionalität** (4)

- **Subscription-Sync**: Datenbank-Aktualisierung nach Payment

- **Plan-Management**: Automatische User-Plan-Zuweisung

- **Fallback-Handling**: Robuste Fehlerbehandlung

**Datei**: `src/pages/api/billing/sync.ts:147`
**Sicherheitslevel**: Hoch

## Datenbankschema

### `stripe_customers` Tabelle

```sql
CREATE TABLE stripe_customers (
  user_id TEXT NOT NULL,
  customer_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
````

### `subscriptions` Tabelle

````sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY, -- stripe subscription id
  user_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free','pro','premium','enterprise')),
  status TEXT NOT NULL,
  current_period_end INTEGER NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

```text

### Optimierte Indizes

- `idx_subscriptions_user`: Schnelle User-Subscription-Lookups

- `idx_subscriptions_customer`: Stripe-Customer-zu-User-Mapping

- `idx_subscriptions_status`: Filtering nach Subscription-Status

## Sicherheit

### Rate Limiting Konfiguration

| Endpunkt | Limit | Fenster | Zweck |
|----------|-------|---------|-------|
| `/api/billing/*` | 30/min | 1 Minute | Standard-API-Schutz |
| `/api/billing/stripe-webhook` | 100/min | 1 Minute | Webhook-Verarbeitung |
| Auth-Endpunkte | 10/min | 1 Minute | Brute-Force-Schutz |
| Sensitive Actions | 5/h | 1 Stunde | Kritische Operationen |

### Security Headers

- **X-Content-Type-Options**: `nosniff`

- **X-Frame-Options**: `DENY`

- **X-XSS-Protection**: `1; mode=block`

- **Referrer-Policy**: `strict-origin-when-cross-origin`

- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains; preload`

- **Permissions-Policy**: Kamera, Mikrofon, Geolocation blockiert

### CSRF-Schutz

- **Double-Submit-Cookie**: X-CSRF-Token Header == csrf_token Cookie

- **Origin-Validierung**: Schutz vor Cross-Site-Request-Forgery

- **Automatische Token-Generierung**: Sichere 128-Bit-Tokens

## Business-Modell

### Preisstruktur

| Plan | Monatlich | Jährlich | Beschreibung |
|------|-----------|----------|-------------|
| **Pro** | €14,99 | €149,90 | Erweiterte AI-Features |
| **Premium** | €24,99 | €249,90 | Maximale Performance |
| **Enterprise** | Custom | Custom | Individuelle Lösungen |

### Credit-System

- **200 Credits**: €2,99 (Einmalzahlung)

- **1000 Credits**: €9,99 (Einmalzahlung)

- **Speicherung**: KV-basierte persistente Speicherung

- **Verfolgung**: Vollständiges Audit-Trail

## Testing

### Aktuelle Test-Coverage

- ✅ **Unit Tests**: Hooks und Utilities abgedeckt

- ✅ **Integration Tests**: Auth-Flows und API-Endpunkte

- ✅ **E2E Tests**: Vollständige User-Journeys

- ⚠️ **Pricing-spezifische Tests**: Fehlende Component-Tests

### Empfohlene Test-Ergänzungen

1. **PricingTable Component Tests**: UI-Interaktionen
1. **Stripe Webhook E2E Tests**: Event-Verarbeitung
1. **Credit-System Tests**: Kauf- und Verbrauchslogik
1. **Error Scenario Tests**: Ausfall- und Wiederherstellung

## Performance

### Aktuelle Metriken

- **Bundle-Größe**: ~500KB (innerhalb Limits)

- **API-Response-Time**: <50ms (Ziel erreicht)

- **Database-Queries**: Optimierte Prepared Statements

- **Caching**: KV für Credit-System

### Optimierungspotenzial

1. **JavaScript-Bundle**: 289 Zeilen client-seitiger Code
1. **Code-Splitting**: Pricing-Logik modularisieren
1. **Lazy Loading**: Komponenten nach Bedarf laden

## Compliance

### GDPR-Konformität

- ✅ **Privacy by Design**: Datensparsame Architektur

- ✅ **User Consent**: Cookie-Einverständniserklärung

- ✅ **Data Processing Transparency**: Klare Dokumentation

- ✅ **User Rights**: Datenlöschung und -export

### Payment Security (PCI DSS)

- ✅ **SAQ A Compliance**: Keine direkte Kartenverarbeitung

- ✅ **Stripe Level 1**: Höchste Sicherheitsstandards

- ✅ **Datenverschlüsselung**: TLS 1.3 für alle Transaktionen

## Deployment & Monitoring

### Umgebungen

- **Production**: `hub-evolution.com`

- **Staging**: `staging.hub-evolution.com`

- **Testing**: `ci.hub-evolution.com`

### Health Checks

- **API Health**: `GET /api/health`

- **Database Connectivity**: Automatische Verbindungsprüfung

- **Stripe Integration**: Webhook und API-Verfügbarkeit

### Monitoring

- **Error Tracking**: Strukturierte Fehlerprotokollierung

- **Performance Monitoring**: Response-Time-Tracking

- **Business Metrics**: Conversion und Revenue-Tracking

## Roadmap & Verbesserungen

### Sofortmaßnahmen (P0)

1. **JavaScript modularisieren**: Script aus `PricingTable.astro` auslagern
1. **Bundle-Optimierung**: Client-seitigen Code minimieren
1. **Test-Ergänzungen**: Pricing-spezifische Tests hinzufügen

### Kurzfristig (P1 - 1 Monat)

1. **Subscription-Events-Tabelle**: Bessere Audit-Trails
1. **Credit-Usage-Tracking**: Detaillierte Verbrauchsanalyse
1. **A/B-Testing-Framework**: Pricing-Experimente

### Mittelfristig (P2 - 3 Monate)

1. **Erweiterte Analytics**: Conversion-Funnel-Optimierung
1. **Customer Success Tools**: Bessere Kundenbindung
1. **Mobile Payment UX**: Optimierte mobile Erfahrung

## Troubleshooting

### Häufige Probleme

1. **Webhook-Fehler**: KV-Speicherung kann fehlschlagen
1. **Subscription-Sync**: Timing-Issues zwischen Stripe und lokaler DB
1. **Credit-Gutschriften**: Race Conditions bei gleichzeitigen Käufen

### Debug-Strategien

1. **Stripe Dashboard**: Webhook-Logs und Event-Historie
1. **Browser DevTools**: Client-seitige Fehleranalyse
1. **Server-Logs**: Strukturierte Fehlerprotokollierung

## Support & Maintenance

### Kritische Kontakte

- **Stripe Support**: Webhook und Payment-Issues

- **Cloudflare Support**: Worker und D1-Probleme

- **Domain-Registrar**: DNS und SSL-Zertifikate

### Backup-Strategien

- **Database**: Automatische D1-Backups

- **KV-Daten**: Redundante Speicherung

- **Stripe-Daten**: Automatische Synchronisation

---

**Letzte Aktualisierung**: 10. Oktober 2025
**Status**: Produktionsreif mit aktivem Kundenstamm
**Verantwortlich**: Evolution Hub Development Team
**Dokumentation**: Single Source of Truth für Pricing-System

```text
````
