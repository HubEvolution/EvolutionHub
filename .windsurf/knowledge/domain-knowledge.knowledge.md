# Domänenwissen — Features & Cluster (belegt)

- **Titel & Geltungsbereich**
  - Domänen-Cluster anhand implementierter Routen/Services: Auth, Prompt‑Enhancer, Voice Transcriptor, AI Image Enhancer, Kommentare, Billing/Dashboard.

- **Cluster & zentrale Artefakte**
  - **Auth**
    - API: `src/pages/api/auth/**` (Login/Magic/OAuth/verify/forgot/reset etc.)
    - Middleware: `src/middleware.ts` setzt Session‑Kontext und Redirects (Login→Dashboard, Verify‑Gate).
    - Services: `src/lib/services/auth-service.ts` + Impl `auth-service-impl.ts` (bcrypt, D1 Sessions via `@/lib/auth-v2`).
  - **Prompt Enhancer**
    - API: `src/pages/api/prompt-enhance.ts` (greppbar); Service: `src/lib/services/prompt-enhancer-service.ts` (KV‑Quoten, OpenAI, deterministic fallback).
    - Config: `src/config/prompt-enhancer.ts` (Model/Params Konstanten; implizit importiert).
  - **Voice Visualizer/Transcriptor**
    - APIs erwartet: `src/pages/api/voice/transcribe.ts`, `voice/usage.ts`; Service: `src/lib/services/voice-transcribe-service.ts` (KV, OpenAI Whisper, DEV‑Echo, R2 optional). Streaming Aggregator: `src/lib/services/voice-stream-aggregator.ts`.
    - Middleware öffnet Mikrofon‑Policy selektiv.
  - **AI Image Enhancer**
    - APIs: `src/pages/api/ai-image/**` (usage, generate, jobs CRUD/poll). Services: `src/lib/services/ai-image-service.ts`, `ai-jobs-service.ts`.
    - Config: `src/config/ai-image.ts` (Model‑Flags, Limits, R2 Pfade), Provider‑Mapping `src/lib/services/provider-error.ts`.
  - **Kommentare/Blog**
    - APIs: `src/pages/api/comments/**` (CRUD/Moderation/Performance/Count/Recent).
    - Services: `src/lib/services/comment-service.ts`, `comment-service-extended.ts` (vorhanden per Listing), plus Notification‑Pfad `notification-service.ts`.
  - **Billing/Dashboard**
    - APIs: `src/pages/api/billing/**` (stripe‑webhook, session, credits, sync), `src/pages/api/dashboard/**` (activity, billing‑summary, notifications).

- **Cross-Domain-Beziehungen**
  - Einheitliche API‑Schicht via `src/lib/api-middleware.ts` (Rate‑Limiting, CSRF/Origin, Security‑Header, Fehler‑Mapping) für Prompt/Voice/AI/Billing/Comments.
  - Storage‑Boundaries: D1 (Sessions, ai_jobs), KV (Quoten/Metriken), R2 (AI‑Assets, Voice‑Archiv). Wrangler Bindings in `wrangler.toml` definieren env‑spezifische Ressourcen.

- **Bekannte Risiken/Code‑Smells**
  - **R2‑Proxy vorhanden**: Route `src/pages/r2-ai/[...path].ts` ist implementiert (Uploads öffentlich, Results owner‑gated); Absicherung durch Tests empfohlen.
  - **Heterogene Quoten**: Drei getrennte KV‑Namespaces (Prompt/AI/Voice) mit ähnlichen Mustern; Konsolidierung/Utility könnte Duplizierung reduzieren.
  - **Auth‑Altartefakte**: Mehrere veraltete Auth‑APIs könnten als 410‑Stubs existieren; Konsistenz prüfen gegen aktuelle Flows (Magic/OAuth).

- **Empfohlene Best Practices**
  - **API‑Kohärenz**: Alle API‑Routen über `withApiMiddleware()`/`withAuthApiMiddleware()`/`withRedirectMiddleware()` führen; 405/Allow zentral mit `createMethodNotAllowed()`.
  - **Provider‑Fehlerpfad**: Für LLM/Replicate/Whisper Fehler konsequent `buildProviderError()` verwenden, damit API‑Layer korrekt mappt (validation/forbidden/server).
  - **Entitlements & Limits**: Plan‑basierte Limits (User vs. Guest, monatlich + täglich + Credits) im Service bereits vorgesehen – sicherstellen, dass API‑Routen plan‑Overrides setzen und dokumentieren.
