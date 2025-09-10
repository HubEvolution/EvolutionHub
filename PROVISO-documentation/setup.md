# Setup und Installation

Diese Anleitung beschreibt den vollständigen Setup-Prozess für EvolutionHub, einschließlich lokaler Entwicklungsumgebung und Deployment auf Cloudflare.

## Voraussetzungen

Bevor Sie beginnen, stellen Sie sicher, dass folgende Tools installiert sind:

- **Node.js**: Version 18 oder höher. [Download](https://nodejs.org/)
- **npm** oder **yarn**: Package-Manager (npm ist empfohlen).
- **Cloudflare Wrangler CLI**: Für Cloudflare Workers. Installieren Sie mit:
  ```
  npm install -g wrangler
  ```
- **Git**: Zum Klonen des Repositories.
- **TypeScript**: Wird automatisch über npm installiert.
- **Vitest** und **Playwright**: Für Tests (werden über npm installiert).
- **Prettier** und **ESLint**: Für Code-Formatierung und -Qualität (im Projekt integriert).

## Repository klonen

Klonen Sie das Projekt aus GitHub:

```
git clone https://github.com/your-username/evolution-hub.git
cd evolution-hub
```

## Abhängigkeiten installieren

Installieren Sie alle notwendigen Packages:

```
npm install
```

Dies installiert Astro, TypeScript, Hono, Drizzle ORM und weitere Dependencies aus `package.json`.

## Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env`-Datei basierend auf `.env.example`:

```
cp .env.example .env
```

Füllen Sie sensible Werte ein, z. B.:

- `DATABASE_URL`: Verbindung zur D1-Datenbank (Cloudflare).
- `STYTCH_API_KEY`: Für Authentifizierung (Stytch).
- `CLOUDFLARE_ACCOUNT_ID`: Ihr Cloudflare Account-ID.
- `R2_BUCKET_NAME`: Name des R2-Buckets für Speicherung.
- `KV_SESSION_NAMESPACE`: KV-Namespace für Sessions.
- `BASE_URL`: Basis-URL für die Anwendung (z. B. `http://localhost:8787` für Dev).

**Wichtig**: Speichern Sie niemals Secrets im Code. Verwenden Sie `.gitignore` für `.env`.

## Lokale Entwicklung starten

Für die lokale Entwicklung mit Wrangler (Cloudflare Dev-Server):

```
npx wrangler dev
```

Dies startet den Server auf `http://localhost:8787`. Der Server emuliert Cloudflare Bindings (D1, KV, R2).

Für Astro-spezifische Builds (falls benötigt):

```
npm run dev
```

## Datenbank-Migrationen ausführen

Führen Sie Migrationen für die D1-Datenbank aus:

```
npx wrangler d1 execute evolutionhub-db --local --file=./migrations/0001_initial.sql
```

Führen Sie alle Migrationen in `migrations/` aus. Für lokale Tests verwenden Sie `--local`.

## Tests ausführen

### Unit- und Integrationstests

```
npm run test:unit
```

Oder für Coverage:

```
npm run test:coverage
```

Verwenden Sie Vitest für Unit-Tests und Integrationstests gegen den Dev-Server.

### E2E-Tests

```
npm run test:e2e
```

Dies verwendet Playwright. Setzen Sie `TEST_BASE_URL` für remote Tests.

## Deployment

### Auf Cloudflare Pages/Workers

1. Authentifizieren Sie sich bei Cloudflare:
   ```
   npx wrangler login
   ```

2. Deployen Sie:
   ```
   npx wrangler deploy
   ```

   Für separate Environments (dev, staging, prod) verwenden Sie `wrangler.toml` mit `[env.dev]` usw.

3. Post-Deploy Health-Check: Führen Sie Smoke-Tests aus, um den Status zu überprüfen.

## Troubleshooting

- **Port-Konflikt**: Ändern Sie den Port in `wrangler.toml`.
- **D1-Bindings fehlen**: Stellen Sie sicher, dass Bindings in `wrangler.toml` definiert sind.
- **TypeScript-Fehler**: Führen Sie `npm run type-check` aus.
- **Tests scheitern**: Überprüfen Sie `TEST_BASE_URL` und starten Sie den Dev-Server.

Falls Probleme auftreten, konsultieren Sie die [Bekannten Einschränkungen](./limitations.md).

## Nächste Schritte

Nach dem Setup können Sie mit der Entwicklung beginnen. Sehen Sie sich die [Architektur](./architecture.md) an, um das System zu verstehen.

---

*Letzte Aktualisierung: 2025-09-07*