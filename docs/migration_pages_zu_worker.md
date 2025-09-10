---
title: Migrate from Pages to Workers · Cloudflare Workers docs
description: A guide for migrating from Cloudflare Pages to Cloudflare Workers.
  Includes a compatibility matrix for comparing the features of Cloudflare
  Workers and Pages.
lastUpdated: 2025-07-01T16:58:44.000Z
chatbotDeprioritize: false
source_url:
  html: https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/
  md: https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/index.md
---

## Status der Migration: "pages zu worker"

Die Migration von Cloudflare Pages zu Cloudflare Workers für das Projekt EvolutionHub ist derzeit noch nicht abgeschlossen. Die folgenden Abschnitte dokumentieren den aktuellen Stand, die offenen Fragen und die Entscheidungspunkte, die vor der eigentlichen Umsetzung der Migration geklärt und bearbeitet werden müssen.

## EvolutionHub: Projektvorbereitung (nur Dokumentation)

Diese Ergänzung beschreibt die projektspezifische Vorbereitung für die Migration von Cloudflare Pages zu Cloudflare Workers – rein dokumentarisch. Es werden keine Änderungen an Code, Build, CI/CD oder Cloudflare-Konfiguration durchgeführt.

### Ist‑Zustand EvolutionHub (Referenz)

* API‑Endpunkte unter `src/pages/api/`, zentrale Middleware in `src/lib/api-middleware.ts` (`withApiMiddleware()`, `withAuthApiMiddleware()`).
* Rate‑Limiting: `standardApiLimiter` ≈ 50 req/min für Middleware‑geschützte Endpunkte.
* Security‑Headers: `applySecurityHeaders()` in `src/lib/security-headers.ts` (CSP, HSTS, u. a.).
* Ausnahmen/Spezialfälle:
  * Newsletter: `src/pages/api/newsletter/subscribe.ts`, `confirm.ts` (kein Middleware‑Wrapper; Double‑Opt‑in Flow).
  * Lead Magnets: `src/pages/api/lead-magnets/download.ts` (GET/POST/OPTIONS, CORS/Preflight explizit).
  * Debug‑Login: `src/pages/api/debug-login.ts` (nur Dev; setzt `session_id` Cookie; in Prod blockiert).
  * Logout v1/v2: `src/pages/api/user/logout*.ts` (Custom Handler, kein Middleware‑Wrapper).
  * Avatar: `src/pages/api/user/avatar.ts` (nutzt direkt `applySecurityHeaders()`).

### Pre‑Migration Checklist (Doc‑only)

* Wrangler‑Konfiguration (Platzhalter, noch nicht ausführen/committen):
  * Name vereinheitlichen (z. B. `evolution-hub`).
  * Einheitliches `compatibility_date` festlegen (z. B. aktuelles Datum; endgültig bei Umsetzung).
  * `assets.directory` auf finalen Build‑Pfad setzen (typisch `./dist/client` bei Astro; prüfen).
  * Optional: `assets.run_worker_first = true`, falls Auth/Logging vor Assets nötig ist.
  * `preview_urls = true` für Previews; optional `workers_dev = true`.
* Bindings inventarisieren (nur dokumentieren):
  * R2 (Avatar‑Upload): Binding für `R2_AVATARS` vorbereiten.
  * D1 (falls aktiv genutzt): `DB`‑Binding skizzieren (Name/ID TBD).
  * Weitere (KV/Queues/Service Bindings): aktuell keine verbindliche Nutzung – als TODO vormerken.
* Routing/Serving:
  * SPA‑Verhalten vs. Custom‑404 (`not_found_handling`) festlegen.
  * `_headers`/`_redirects` in Asset‑Verzeichnis belassen.
  * Optional `assets.binding = "ASSETS"` benennen, falls im Worker benötigt.
* Environments & Builds:
  * Workers Builds aktivieren; Non‑Prod Branch Builds und Preview‑URLs nutzen.
  * Optional: Access‑Schutz für Preview‑URLs dokumentieren.
* Security & Rate‑Limiting:
  * Wenn `run_worker_first = true`, greifen Middleware‑Security‑Header/Rate‑Limit auch für Assets.
  * Wenn nicht, `_headers` für statische Assets pflegen; Rate‑Limit dann nur für API‑Handler.

### Beispiel: `wrangler.toml` Skeleton (Platzhalter/TODOs)

```toml
# wrangler.toml (Beispiel – mit aktuellen/proj.spezifischen Werten)
name = "evolution-hub"                    # TODO: finalen Namen bestätigen
compatibility_date = "2025-08-12"        # Aktuelles Datum
preview_urls = true
# workers_dev = true                       # optional

[assets]
directory = "./dist/client"              # Standard für Astro-Builds, muss aber verifiziert werden
# not_found_handling = "single-page-application"  # oder "404-page"
# run_worker_first = true                  # falls Auth/Logging vor Assets gewünscht
# binding = "ASSETS"                      # optionaler Assets‑Binding‑Name

[placement]
mode = "smart"

# compatibility_flags = ["nodejs_compat"] # nur falls notwendig

## R2 (z. B. Avatare) – nur dokumentiert
## [[r2_buckets]]
## binding = "R2_AVATARS"
## bucket_name = "evolutionhub-avatars"   # TODO: tatsächlichen Bucket-Namen eintragen

## D1 – nur dokumentiert
## [[d1_databases]]
## binding = "DB"
## database_name = "evolutionhub"         # TODO: tatsächlichen Namen eintragen
## database_id = "..."                    # TODO: tatsächliche ID eintragen
```

### Entscheidungspunkte vor Umsetzung

* Assets‑first vs. Worker‑first (Auswirkung auf Auth/Logging/Rate‑Limit für statische Antworten).
* Einheitliches `compatibility_date` und ggf. `nodejs_compat` Bedarf.
* Preview‑Strategie (Branch‑Builds, Access‑Schutz) und `workers_dev` Nutzung.
* Beibehalt von `_headers`/`_redirects` vs. Header aus Worker (wenn Worker‑first).

### Offene Fragen (für die eigentliche Migration)

* Finaler Build‑Output‑Pfad (Astro‑Konfiguration) und ggf. SSR‑Anteile.
* Verbindliche Liste aktiver Bindings (R2/D1/KV/Queues) inkl. Namenskonventionen.
* Genaue Abdeckung der Security‑Header für statische Antworten (Page Rules vs. Worker).
* Eventuelle Konsolidierung Legacy vs. v2‑Auth im Zuge der Migration (Zeitpunkt/Scope).

You can deploy full-stack applications, including front-end static assets and back-end APIs, as well as server-side rendered pages (SSR), with [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/).

Like Pages, requests for static assets on Workers are free, and Pages Functions invocations are charged at the same rate as Workers, so you can expect [a similar cost structure](https://developers.cloudflare.com/workers/platform/pricing/#workers).

Unlike Pages, Workers has a distinctly broader set of features available to it, (including Durable Objects, Cron Triggers, and more comprehensive Observability). A complete list can be found at [the bottom of this page](#compatibility-matrix). Workers will receive the focus of Cloudflare's development efforts going forwards, so we therefore [are recommending using Cloudflare Workers over Cloudflare Pages for any new projects](http://blog.cloudflare.com/full-stack-development-on-cloudflare-workers).

## Migration

Migrating from Cloudflare Pages to Cloudflare Workers is often a straightforward process. The following are some of the most common steps you will need to take to migrate your project.

### Frameworks

If your Pages project uses [a popular framework](https://developers.cloudflare.com/workers/framework-guides/), most frameworks already have adapters available for Cloudflare Workers. Switch out any Pages-specific adapters for the Workers equivalent and follow any guidance that they provide.

### Project configuration

If your project doesn't already have one, create a [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/) (either `wrangler.jsonc`, `wrangler.json` or `wrangler.toml`) in the root of your project. The two mandatory fields are:

* [`name`](https://developers.cloudflare.com/workers/wrangler/configuration/#inheritable-keys)

  Set this to the name of the Worker you wish to deploy to. This can be the same as your existing Pages project name, so long as it conforms to Workers' name restrictions (e.g. max length).

* [`compatibility_date`](https://developers.cloudflare.com/workers/configuration/compatibility-dates/).

  If you were already using [Pages Functions](https://developers.cloudflare.com/pages/functions/wrangler-configuration/#inheritable-keys), set this to the same date configured there. Otherwise, set it to the current date.

#### Build output directory

Where you previously would configure a "build output directory" for Pages (in either a [Wrangler configuration file](https://developers.cloudflare.com/pages/functions/wrangler-configuration/#inheritable-keys) or in [the Cloudflare dashboard](https://developers.cloudflare.com/pages/configuration/build-configuration/#build-commands-and-directories)), you must now set the [`assets.directory`](https://developers.cloudflare.com/workers/static-assets/binding/#directory) value for a Worker project.

Before, with **Cloudflare Pages**:

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-pages-project",
    "pages_build_output_dir": "./dist/client/"
  }
  ```

* wrangler.toml

  ```toml
  name = "my-pages-project"
  pages_build_output_dir = "./dist/client/"
  ```

Now, with **Cloudflare Workers**:

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "assets": {
      "directory": "./dist/client/"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"


  [assets]
  directory = "./dist/client/"
  ```

#### Serving behavior

Pages would automatically determine the type of project you deployed. It would look for `404.html` and `index.html` files as signals for whether the project was likely a [Single Page Application (SPA)](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering) or if it should [serve custom 404 pages](https://developers.cloudflare.com/pages/configuration/serving-pages/#not-found-behavior).

In Workers, to prevent accidental misconfiguration, this behavior is explicit and [must be set up manually](https://developers.cloudflare.com/workers/static-assets/routing/).

For a Single Page Application (SPA):

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "assets": {
      "directory": "./dist/client/",
      "not_found_handling": "single-page-application"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"


  [assets]
  directory = "./dist/client/"
  not_found_handling = "single-page-application"
  ```

For custom 404 pages:

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "assets": {
      "directory": "./dist/client/",
      "not_found_handling": "404-page"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"


  [assets]
  directory = "./dist/client/"
  not_found_handling = "404-page"
  ```

##### Ignoring assets

Pages would automatically exclude some files and folders from being uploaded as static assets such as `node_modules`, `.DS_Store`, and `.git`. If you wish to also avoid uploading these files to Workers, you can create an [`.assetsignore` file](https://developers.cloudflare.com/workers/static-assets/binding/#ignoring-assets) in your project's static asset directory.

```txt
**/node_modules
**/.DS_Store
**/.git
```

#### Pages Functions

##### Full-stack framework

If you use a full-stack framework powered by Pages Functions, ensure you have [updated your framework](#frameworks) to target Workers instead of Pages.

##### Pages Functions with an "advanced mode" `_worker.js` file

If you use Pages Functions with an ["advanced mode" `_worker.js` file](https://developers.cloudflare.com/pages/functions/advanced-mode/), you must first ensure this script doesn't get uploaded as a static asset. Either move `_worker.js` out of the static asset directory (recommended), or create [an `.assetsignore` file](https://developers.cloudflare.com/workers/static-assets/binding/#ignoring-assets) in the static asset directory and include `_worker.js` within it.

```txt
_worker.js
```

Then, update your configuration file's `main` field to point to the location of this Worker script:

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "main": "./dist/client/_worker.js", // or some other location if you moved the script out of the static asset directory
    "assets": {
      "directory": "./dist/client/"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"
  main = "./dist/client/_worker.js"


  [assets]
  directory = "./dist/client/"
  ```

##### Pages Functions with a `functions/` folder

If you use **Pages Functions with a [folder of `functions/`](https://developers.cloudflare.com/pages/functions/)**, you must first compile these functions into a single Worker script with the [`wrangler pages functions build`](https://developers.cloudflare.com/workers/wrangler/commands/#functions-build) command.

* npm

  ```sh
  npx wrangler pages functions build --outdir=./dist/worker/
  ```

* yarn

  ```sh
  yarn wrangler pages functions build --outdir=./dist/worker/
  ```

* pnpm

  ```sh
  pnpm wrangler pages functions build --outdir=./dist/worker/
  ```

Although this command will remain available to you to run at any time, we do recommend considering using another framework if you wish to continue to use file-based routing. [HonoX](https://github.com/honojs/honox) is one popular option.

Once the Worker script has been compiled, you can update your configuration file's `main` field to point to the location it was built to:

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "main": "./dist/worker/index.js",
    "assets": {
      "directory": "./dist/client/"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"
  main = "./dist/worker/index.js"


  [assets]
  directory = "./dist/client/"
  ```

##### `_routes.json` and Pages Functions middleware

If you authored [a `_routes.json` file](https://developers.cloudflare.com/pages/functions/routing/#create-a-_routesjson-file) in your Pages project, or used [middleware](https://developers.cloudflare.com/pages/functions/middleware/) in Pages Functions, you must pay close attention to the configuration of your Worker script. Pages would default to serving your Pages Functions ahead of static assets and `_routes.json` and Pages Functions middleware allowed you to customize this behavior.

Workers, on the other hand, will default to serving static assets ahead of your Worker script, unless you have configured [`assets.run_worker_first`](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/#run-your-worker-script-first). This option is required if you are, for example, performing any authentication checks or logging requests before serving static assets.

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "main": "./dist/worker/index.js",
    "assets": {
      "directory": "./dist/client/",
      "run_worker_first": true
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"
  main = "./dist/worker/index.js"


  [assets]
  directory = "./dist/client/"
  run_worker_first = true
  ```

##### Starting from scratch

If you wish to, you can start a new Worker script from scratch and take advantage of all of Wrangler's and the latest runtime features (e.g. [`WorkerEntrypoint`s](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/), [TypeScript support](https://developers.cloudflare.com/workers/languages/typescript/), [bundling](https://developers.cloudflare.com/workers/wrangler/bundling), etc.):

* JavaScript

  ```js
  import { WorkerEntrypoint } from "cloudflare:workers";


  export default class extends WorkerEntrypoint {
    async fetch(request) {
      return new Response("Hello, world!");
    }
  }
  ```

* TypeScript

  ```ts
  import { WorkerEntrypoint } from "cloudflare:workers";


  export default class extends WorkerEntrypoint {
    async fetch(request: Request) {
      return new Response("Hello, world!");
    }
  }
  ```

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "main": "./worker/index.ts",
    "assets": {
      "directory": "./dist/client/"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"
  main = "./worker/index.ts"


  [assets]
  directory = "./dist/client/"
  ```

#### Assets binding

Pages automatically provided [an `ASSETS` binding](https://developers.cloudflare.com/pages/functions/api-reference/#envassetsfetch) to access static assets from Pages Functions. In Workers, the name of this binding is customizable and it must be manually configured:

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "main": "./worker/index.ts",
    "assets": {
      "directory": "./dist/client/",
      "binding": "ASSETS"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"
  main = "./worker/index.ts"


  [assets]
  directory = "./dist/client/"
  binding = "ASSETS"
  ```

#### Runtime

If you had customized [placement](https://developers.cloudflare.com/workers/configuration/smart-placement/), or set a [compatibility date](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) or any [compatibility flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/) in your Pages project, you can define the same in your Wrangler configuration file:

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "compatibility_flags": ["nodejs_compat"],
    "main": "./worker/index.ts",
    "placement": {
      "mode": "smart"
    },
    "assets": {
      "directory": "./dist/client/",
      "binding": "ASSETS"
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"
  compatibility_flags = [ "nodejs_compat" ]
  main = "./worker/index.ts"


  [placement]
  mode = "smart"


  [assets]
  directory = "./dist/client/"
  binding = "ASSETS"
  ```

### Variables, secrets and bindings

[Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) and [bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/) can be set in your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/) and are made available in your Worker's environment (`env`). [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) can uploaded with Wrangler or defined in the Cloudflare dashboard for [production](https://developers.cloudflare.com/workers/configuration/secrets/#adding-secrets-to-your-project) and [`.dev.vars` for local development](https://developers.cloudflare.com/workers/configuration/secrets/#local-development-with-secrets).

If you are [using Workers Builds](#builds), ensure you also [configure any variables relevant to the build environment there](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/). Unlike Pages, Workers does not share the same set of runtime and build-time variables.

### Wrangler commands

Where previously you used [`wrangler pages dev`](https://developers.cloudflare.com/workers/wrangler/commands/#dev-1) and [`wrangler pages deploy`](https://developers.cloudflare.com/workers/wrangler/commands/#deploy-1), now instead use [`wrangler dev`](https://developers.cloudflare.com/workers/wrangler/commands/#dev) and [`wrangler deploy`](https://developers.cloudflare.com/workers/wrangler/commands/#deploy). Additionally, if you are using a Vite-powered framework, [our new Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/) may be able offer you an even simpler development experience.

### Builds

If you are using Pages' built-in CI/CD system, you can swap this for Workers Builds by first [connecting your repository to Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/#get-started) and then [disabling automatic deployments on your Pages project](https://developers.cloudflare.com/pages/configuration/git-integration/#disable-automatic-deployments).

### Preview environment

Pages automatically creates a preview environment for each project, and can be indepenedently configured.

To get a similar experience in Workers, you must:

1. Ensure [preview URLs](https://developers.cloudflare.com/workers/configuration/previews/) are enabled (they are on by default).

    * wrangler.jsonc

      ```jsonc
      {
        "name": "my-worker",
        "compatibility_date": "2025-04-01",
        "main": "./worker/index.ts",
        "assets": {
          "directory": "./dist/client/"
        },
        "preview_urls": true
      }
      ```

    * wrangler.toml

      ```toml
      name = "my-worker"
      compatibility_date = "2025-04-01"
      main = "./worker/index.ts"
      preview_urls = true


      [assets]
      directory = "./dist/client/"
      ```

2. [Enable non-production branch builds](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/#configure-non-production-branch-builds) in Workers Builds.

Optionally, you can also [protect these preview URLs with Cloudflare Access](https://developers.cloudflare.com/workers/configuration/previews/#manage-access-to-preview-urls).

Note

Unlike Pages, Workers does not natively support defining different bindings in production vs. non-production builds. This is something we are actively exploring, but in the meantime, you may wish to consider using [Wrangler Environments](https://developers.cloudflare.com/workers/wrangler/environments/) and an [appropriate Workers Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/#wrangler-environments) to achieve this.

### Headers and redirects

[`_headers`](https://developers.cloudflare.com/workers/static-assets/headers/) and [`_redirects`](https://developers.cloudflare.com/workers/static-assets/redirects/) files are supported natively in Workers with static assets. Ensure that, just like for Pages, these files are included in the static asset directory of your project.

### pages.dev

Where previously you were offered a `pages.dev` subdomain for your Pages project, you can now configure a personalized `workers.dev` subdomain for all of your Worker projects. You can [configure this subdomain in the Cloudflare dashboard](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/#configure-workers-dev), and opt-in to using it with the [`workers_dev` option](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/#disabling-workersdev-in-the-wrangler-configuration-file) in your configuration file.

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-worker",
    "compatibility_date": "2025-04-01",
    "main": "./worker/index.ts",
    "workers_dev": true
  }
  ```

* wrangler.toml

  ```toml
  name = "my-worker"
  compatibility_date = "2025-04-01"
  main = "./worker/index.ts"
  workers_dev = true
  ```

### Custom domains

If your domain's nameservers are managed by Cloudflare, you can, like Pages, configure a [custom domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) for your Worker. Additionally, you can also configure a [route](https://developers.cloudflare.com/workers/configuration/routing/routes/) if you only wish to some subset of paths to be served by your Worker.

Note

Unlike Pages, Workers does not support any domain whose nameservers are not managed by Cloudflare.

### Rollout

Once you have validated the behavior of Worker, and are satisfied with the development workflows, and have migrated all of your production traffic, you can delete your Pages project in the Cloudflare dashboard or with Wrangler:

* npm

  ```sh
  npx wrangler pages project delete
  ```

* yarn

  ```sh
  yarn wrangler pages project delete
  ```

* pnpm

  ```sh
  pnpm wrangler pages project delete
  ```

## Migrate your project using an AI coding assistant

You can add the following [experimental prompt](https://developers.cloudflare.com/workers/prompts/pages-to-workers.txt) in your preferred coding assistant (e.g. Claude Code, Cursor) to make your project compatible with Workers:

```plaintext
https://developers.cloudflare.com/workers/prompts/pages-to-workers.txt
```

You can also use the Cloudflare Documentation [MCP server](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/docs-vectorize) in your coding assistant to provide better context to your LLM when building with Workers, which includes this prompt when you ask to migrate from Pages to Workers.

## Compatibility matrix

This compatibility matrix compares the features of Workers and Pages. Unless otherwise stated below, what works in Pages works in Workers, and what works in Workers works in Pages. Think something is missing from this list? [Open a pull request](https://github.com/cloudflare/cloudflare-docs/edit/production/src/content/docs/workers/static-assets/compatibility-matrix.mdx) or [create a GitHub issue](https://github.com/cloudflare/cloudflare-docs/issues/new).

**Legend**
✅: Supported
⏳: Coming soon
🟡: Unsupported, workaround available
❌: Unsupported

| | Workers | Pages |
| - | - | - |
| **Writing, Testing, and Deploying Code** | | |
| [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/) | ✅ | ❌ |
| [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/) | ✅ | ✅ |
| [Gradual Deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/) | ✅ | ❌ |
| [Preview URLs](https://developers.cloudflare.com/workers/configuration/previews) | ✅ | ✅ |
| [Testing tools](https://developers.cloudflare.com/workers/testing) | ✅ | ✅ |
| [Local Development](https://developers.cloudflare.com/workers/development-testing/) | ✅ | ✅ |
| [Remote Development (`--remote`)](https://developers.cloudflare.com/workers/wrangler/commands/) | ✅ | ❌ |
| [Quick Editor in Dashboard](https://blog.cloudflare.com/improved-quick-edit) | ✅ | ❌ |
| **Static Assets** | | |
| [Early Hints](https://developers.cloudflare.com/pages/configuration/early-hints/) | ❌ | ✅ |
| [Custom HTTP headers for static assets](https://developers.cloudflare.com/workers/static-assets/headers/) | ✅ | ✅ |
| [Middleware](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first) | ✅ [1](#user-content-fn-1) | ✅ |
| [Redirects](https://developers.cloudflare.com/workers/static-assets/redirects/) | ✅ | ✅ |
| [Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement/) | ✅ | ✅ |
| [Serve assets on a path](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/) | ✅ | ❌ |
| **Observability** | | |
| [Workers Logs](https://developers.cloudflare.com/workers/observability/) | ✅ | ❌ |
| [Logpush](https://developers.cloudflare.com/workers/observability/logs/logpush/) | ✅ | ❌ |
| [Tail Workers](https://developers.cloudflare.com/workers/observability/logs/tail-workers/) | ✅ | ❌ |
| [Real-time logs](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/) | ✅ | ✅ |
| [Source Maps](https://developers.cloudflare.com/workers/observability/source-maps/) | ✅ | ❌ |
| **Runtime APIs & Compute Models** | | |
| [Node.js Compatibility Mode](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) | ✅ | ✅ |
| [Durable Objects](https://developers.cloudflare.com/durable-objects/api/) | ✅ | 🟡 [2](#user-content-fn-2) |
| [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) | ✅ | ❌ |
| **Bindings** | | |
| [AI](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/#2-connect-your-worker-to-workers-ai) | ✅ | ✅ |
| [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine) | ✅ | ✅ |
| [Assets](https://developers.cloudflare.com/workers/static-assets/binding/) | ✅ | ✅ |
| [Browser Rendering](https://developers.cloudflare.com/browser-rendering) | ✅ | ✅ |
| [D1](https://developers.cloudflare.com/d1/worker-api/) | ✅ | ✅ |
| [Email Workers](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/) | ✅ | ❌ |
| [Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) | ✅ | ✅ |
| [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) | ✅ | ✅ |
| [Image Resizing](https://developers.cloudflare.com/images/transform-images/bindings/) | ✅ | ❌ |
| [KV](https://developers.cloudflare.com/kv/) | ✅ | ✅ |
| [mTLS](https://developers.cloudflare.com/workers/runtime-apis/bindings/mtls/) | ✅ | ✅ |
| [Queue Producers](https://developers.cloudflare.com/queues/configuration/configure-queues/#producer-worker-configuration) | ✅ | ✅ |
| [Queue Consumers](https://developers.cloudflare.com/queues/configuration/configure-queues/#consumer-worker-configuration) | ✅ | ❌ |
| [R2](https://developers.cloudflare.com/r2/) | ✅ | ✅ |
| [Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) | ✅ | ❌ |
| [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) | ✅ | ✅ |
| [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) | ✅ | ✅ |
| [Vectorize](https://developers.cloudflare.com/vectorize/get-started/intro/#3-bind-your-worker-to-your-index) | ✅ | ✅ |
| **Builds (CI/CD)** | | |
| [Monorepos](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/) | ✅ | ✅ |
| [Build Watch Paths](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/) | ✅ | ✅ |
| [Build Caching](https://developers.cloudflare.com/workers/ci-cd/builds/build-caching/) | ✅ | ✅ |
| [Deploy Hooks](https://developers.cloudflare.com/pages/configuration/deploy-hooks/) | ⏳ | ✅ |
| [Branch Deploy Controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/) | 🟡 [3](#user-content-fn-3) | ✅ |
| [Custom Branch Aliases](https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/) | ⏳ | ✅ |
| **Pages Functions** | | |
| [File-based Routing](https://developers.cloudflare.com/pages/functions/routing/) | 🟡 [4](#user-content-fn-4) | ✅ |
| [Pages Plugins](https://developers.cloudflare.com/pages/functions/plugins/) | 🟡 [5](#user-content-fn-5) | ✅ |
| **Domain Configuration** | | |
| [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#add-a-custom-domain) | ✅ | ✅ |
| [Custom subdomains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#set-up-a-custom-domain-in-the-dashboard) | ✅ | ✅ |
| [Custom domains outside Cloudflare zones](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-cname-record) | ❌ | ✅ |
| [Non-root routes](https://developers.cloudflare.com/workers/configuration/routing/routes/) | ✅ | ❌ |

## Footnotes

1. Middleware can be configured via the [`run_worker_first`](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first) option, but is charged as a normal Worker invocation. We plan to explore additional related options in the future. [↩](#user-content-fnref-1)
2. To [use Durable Objects with your Cloudflare Pages project](https://developers.cloudflare.com/pages/functions/bindings/#durable-objects), you must create a separate Worker with a Durable Object and then declare a binding to it in both your Production and Preview environments. Using Durable Objects with Workers is simpler and recommended. [↩](#user-content-fnref-2)
3. Workers Builds supports enabling [non-production branch builds](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/#configure-non-production-branch-builds), though does not yet have the same level of configurability as Pages does. [↩](#user-content-fnref-3)
4. Workers [supports popular frameworks](https://developers.cloudflare.com/workers/framework-guides/), many of which implement file-based routing. Additionally, you can use Wrangler to [compile your folder of `functions/`](#folder-of-functions) into a Worker to help ease the migration from Pages to Workers. [↩](#user-content-fnref-4)
5. As in 4, Wrangler can [compile your Pages Functions into a Worker](#folder-of-functions). Or if you are starting from scratch, everything that is possible with Pages Functions can also be achieved by adding code to your Worker or by using framework-specific plugins for relevant third party tools. [↩](#user-content-fnref-5)
