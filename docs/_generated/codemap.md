# Evolution Hub Codemap (Deep Import Graph)

Generated: 2025-10-14

This document provides a deep import graph with TypeScript alias edges and per-feature subgraphs. Groups follow your requested globs.

- API: `src/pages/api/**`, `openapi.yaml`
- R2: `src/pages/r2/**`, `src/pages/r2-ai/**`
- Middleware: `src/middleware.ts`
- UI/Pages: `src/components/**`, `src/pages/**`, `src/layouts/**`
- Lib/Config: `src/lib/**`, `src/config/**`, `src/utils/**`
- Tests: `tests/integration/**`, `tests/e2e/**`, `test-suite-v2/src/e2e/**`, `src/**/*.{test,spec}.*`, `playwright.config.ts`, `test-suite-v2/playwright*.config.ts`, `vitest.config.ts`

Ignored: `node_modules`, `dist`, `reports/`, `.backups/**`

---

## All-Edges Graph (Condensed)

```mermaid
flowchart LR
  %% Core groups
  subgraph Middleware
    M1["src/middleware.ts\n- Security headers, locale, gates\n- Microphone policy for voice tool\n- Exempts /r2-ai/**"]
  end

  subgraph R2
    R1["src/pages/r2/[...path].ts\n- Public R2 proxy"]
    R2N["src/pages/r2-ai/[...path].ts\n- Public R2 AI proxy\n- Owner gating for results"]
  end

  subgraph Lib_Config
    L1["src/lib/api-middleware.ts"]
    L2["src/lib/rate-limiter.ts"]
    L3["src/lib/security/csrf.ts"]
    L4["src/lib/response-helpers.ts"]
    L5["src/lib/services/voice-transcribe-service.ts"]
    L6["src/lib/services/ai-image-service.ts"]
    L7["src/lib/services/ai-jobs-service.ts"]
    L8["src/lib/services/prompt-enhancer-service.ts"]
    C1["src/config/voice/index.ts"]
    C2["src/config/ai-image.ts"]
    C3["src/config/ai-image/entitlements.ts"]
    C4["src/config/prompt-enhancer.ts"]
  end

  subgraph UI_Pages
    Uv1["src/pages/{de|en}/tools/voice-visualizer/app.astro"]
    Uv2["src/components/tools/voice-visualizer/api.ts"]
    Uv3["src/components/tools/voice-visualizer/hooks/useMicrophone.ts"]

    Ui1["src/pages/{de|en}/tools/imag-enhancer/app.astro"]
    Ui2["src/components/tools/ImagEnhancerIsland.tsx"]

    Up1["src/pages/{de|en}/tools/prompt-enhancer/app.astro"]
    Up2["src/components/tools/prompt-enhancer/EnhancerForm.tsx"]
  end

  subgraph API
    AvT["src/pages/api/voice/transcribe.ts\n- POST\n- withApiMiddleware + CSRF\n- voiceTranscribeLimiter"]
    AvU["src/pages/api/voice/usage.ts\n- GET\n- withApiMiddleware"]
    AvS["src/pages/api/voice/stream.ts\n- GET\n- withRedirectMiddleware (SSE)"]

    AiG["src/pages/api/ai-image/generate.ts\n- POST\n- withApiMiddleware + CSRF\n- aiGenerateLimiter"]
    AiJ["src/pages/api/ai-image/jobs/index.ts\n- POST\n- withApiMiddleware + CSRF"]
    AiJId["src/pages/api/ai-image/jobs/[id].ts\n- GET\n- withApiMiddleware"]
    AiJC["src/pages/api/ai-image/jobs/[id]/cancel.ts\n- POST\n- withApiMiddleware + CSRF"]
    AiU["src/pages/api/ai-image/usage.ts\n- GET\n- withApiMiddleware"]

    ApE["src/pages/api/prompt-enhance.ts\n- POST\n- withApiMiddleware + CSRF\n- per-route limiter"]

    AbSes["src/pages/api/billing/session.ts\n- POST\n- withAuthApiMiddleware"]
    AbCr["src/pages/api/billing/credits.ts\n- POST\n- withAuthApiMiddleware"]
    AbCan["src/pages/api/billing/cancel.ts\n- POST\n- withAuthApiMiddleware"]
    AbWh["src/pages/api/billing/stripe-webhook.ts\n- POST\n- withApiMiddleware"]
    AbSyn["src/pages/api/billing/sync.ts\n- GET\n- withAuthApiMiddleware"]
    AbCb["src/pages/api/billing/sync-callback.ts\n- GET\n- withRedirectMiddleware"]

    Ato["src/pages/api/tools.ts\n- GET\n- withApiMiddleware"]
    Ahl["src/pages/api/health.ts\n- GET\n- withApiMiddleware"]

    Acom["src/pages/api/comments/*.ts\n- GET/POST\n- withApiMiddleware"]
    Ane["src/pages/api/newsletter/{subscribe|unsubscribe}.ts\n- POST\n- withApiMiddleware"]
    Andbg["src/pages/api/debug/{client-log|logs-stream}.ts\n- POST / GET SSE (no wrapper)"]

    Auser["src/pages/api/user/{me|profile|settings|avatar|account}.ts\n- GET/POST\n- withAuthApiMiddleware"]
  end

  subgraph Tests
    Tvi1["tests/integration/api/voice/transcribe.test.ts\n- /api/voice/transcribe"]
    Tvi2["tests/integration/api/voice/usage.test.ts\n- /api/voice/usage"]
    Tai["tests/integration/ai-image-enhancer.test.ts\n- ai-image APIs + /r2-ai/*"]
    Tpv["test-suite-v2/src/e2e/tools/voice-visualizer.smoke.spec.ts"]
    Tie["test-suite-v2/src/e2e/tools/image-enhancer.spec.ts"]
    Tpe["test-suite-v2/src/e2e/tools/prompt-enhancer-flow.spec.ts"]
  end

  %% Import edges (aliases)
  AvT --> L1
  AvT --> L2
  AvT --> L5
  AvT --> C1
  AvU --> L1
  AvU --> L5
  AvU --> C1
  AvS --> L4
  AvS --> L1

  AiG --> L1
  AiG --> L2
  AiG --> L6
  AiG --> C2
  AiG --> C3
  AiJ --> L1
  AiJ --> L7
  AiJId --> L1
  AiJId --> L7
  AiJC --> L1
  AiJC --> L7
  AiU --> L1
  AiU --> L6

  ApE --> L1
  ApE --> L2
  ApE --> L8
  ApE --> C4

  AbSes --> L1
  AbCr --> L1
  AbCan --> L1
  AbWh --> L1
  AbSyn --> L1
  AbCb --> L1
  Ahl --> L1
  Ato --> L1
  Acom --> L1
  Ane --> L1
  Auser --> L1

  %% UI usage edges to APIs
  Uv1 -.-> AvU
  Uv1 -.-> AvT
  Uv2 -.-> AvT
  Ui1 -.-> AiU
  Ui1 -.-> AiG
  Ui2 -.-> AiG
  Up1 -.-> ApE
  Up2 -.-> ApE

  %% R2 and services
  R2N --> C2
  L6 --> R2N
  L7 --> R2N

  %% Tests referencing endpoints/pages
  Tvi1 -.-> AvT
  Tvi2 -.-> AvU
  Tai -.-> AiJ
  Tai -.-> AiJId
  Tai -.-> AiJC
  Tai -.-> AiU
  Tai -.-> AiG
  Tai -.-> R2N
  Tpv -.-> Uv1
  Tpv -.-> AvU
  Tpv -.-> AvT
  Tie -.-> Ui1
  Tie -.-> AiG
  Tpe -.-> Up1
  Tpe -.-> ApE

  %% Middleware applies globally and exempts R2 AI
  M1 --> AvT
  M1 --> AvU
  M1 --> AiG
  M1 --> R2N
  M1 --> Uv1
  M1 --> Ui1
  M1 --> Up1
```

---

## Per-Feature Subgraphs

### Voice Visualizer + Transcriptor

```mermaid
flowchart LR
  subgraph UI
    VU1["src/pages/{de|en}/tools/voice-visualizer/app.astro"]
    VU2["src/components/tools/voice-visualizer/api.ts"]
    VU3["src/components/tools/voice-visualizer/hooks/useMicrophone.ts"]
  end
  subgraph API
    VA1["src/pages/api/voice/usage.ts\n- GET withApiMiddleware"]
    VA2["src/pages/api/voice/transcribe.ts\n- POST withApiMiddleware + CSRF + voiceTranscribeLimiter"]
    VA3["src/pages/api/voice/stream.ts\n- GET withRedirectMiddleware (SSE)"]
  end
  subgraph Lib_Config
    VL1["src/lib/api-middleware.ts"]
    VL2["src/lib/rate-limiter.ts (voiceTranscribeLimiter)"]
    VS["src/lib/services/voice-transcribe-service.ts"]
    VC["src/config/voice/index.ts"]
  end
  subgraph Tests
    VT1["tests/integration/api/voice/transcribe.test.ts"]
    VT2["tests/integration/api/voice/usage.test.ts"]
    VE2E["test-suite-v2/src/e2e/tools/voice-visualizer.smoke.spec.ts"]
  end

  %% UI -> API
  VU1 -.-> VA1
  VU1 -.-> VA2
  VU2 -.-> VA2

  %% API -> Lib/Config
  VA1 --> VL1
  VA1 --> VS
  VA1 --> VC
  VA2 --> VL1
  VA2 --> VL2
  VA2 --> VS
  VA2 --> VC
  VA3 --> VL1

  %% Tests -> API/UI
  VT1 -.-> VA2
  VT2 -.-> VA1
  VE2E -.-> VU1
  VE2E -.-> VA1
  VE2E -.-> VA2
```

- **Middleware note**: `src/middleware.ts` applies global headers; overrides microphone Permissions-Policy for `/{locale}/tools/voice-visualizer[/app]` and does not gate `/r2-ai/**`.

### AI Image Enhancer

```mermaid
flowchart LR
  subgraph UI
    IE1["src/pages/{de|en}/tools/imag-enhancer/app.astro"]
    IE2["src/components/tools/ImagEnhancerIsland.tsx"]
  end
  subgraph API
    IEA["src/pages/api/ai-image/generate.ts\n- POST withApiMiddleware + CSRF + aiGenerateLimiter"]
    IEU["src/pages/api/ai-image/usage.ts\n- GET withApiMiddleware"]
    IEJ["src/pages/api/ai-image/jobs/index.ts\n- POST withApiMiddleware + CSRF"]
    IEJId["src/pages/api/ai-image/jobs/[id].ts\n- GET withApiMiddleware"]
    IEJC["src/pages/api/ai-image/jobs/[id]/cancel.ts\n- POST withApiMiddleware + CSRF"]
  end
  subgraph R2
    RAI["src/pages/r2-ai/[...path].ts\n- Public proxy + owner gating"]
  end
  subgraph Services_Config
    AIS["src/lib/services/ai-image-service.ts"]
    AJS["src/lib/services/ai-jobs-service.ts"]
    AIC["src/config/ai-image.ts"]
    AIE["src/config/ai-image/entitlements.ts"]
    CSRF["src/lib/security/csrf.ts"]
    LRL["src/lib/rate-limiter.ts (aiGenerateLimiter)"]
  end
  subgraph Tests
    TIE["tests/integration/ai-image-enhancer.test.ts\n- covers jobs/generate/usage & /r2-ai/*"]
    TE2E["test-suite-v2/src/e2e/tools/image-enhancer.spec.ts"]
  end

  IE1 -.-> IEU
  IE1 -.-> IEA
  IE2 -.-> IEA

  IEA --> AIS
  IEA --> AIC
  IEA --> AIE
  IEA --> CSRF
  IEA --> LRL
  IEU --> AIS
  IEU --> AIC
  IEJ --> AJS
  IEJId --> AJS
  IEJC --> AJS

  AIS --> RAI
  AJS --> RAI

  TIE -.-> IEA
  TIE -.-> IEU
  TIE -.-> IEJ
  TIE -.-> IEJId
  TIE -.-> IEJC
  TIE -.-> RAI
  TE2E -.-> IE1
  TE2E -.-> IEA
```

### Prompt Enhancer

```mermaid
flowchart LR
  subgraph UI
    PE1["src/pages/{de|en}/tools/prompt-enhancer/app.astro"]
    PE2["src/components/tools/prompt-enhancer/EnhancerForm.tsx"]
  end
  subgraph API
    PEA["src/pages/api/prompt-enhance.ts\n- POST withApiMiddleware + CSRF + per-route limiter"]
  end
  subgraph Services_Config
    PES["src/lib/services/prompt-enhancer-service.ts"]
    PEC["src/config/prompt-enhancer.ts"]
    CSRF2["src/lib/security/csrf.ts"]
    RL2["src/lib/rate-limiter.ts (createRateLimiter)"]
  end
  subgraph Tests
    PE2E["test-suite-v2/src/e2e/tools/prompt-enhancer-flow.spec.ts"]
    PIN["tests/integration/prompt-enhance-api.test.ts (if present)"]
  end

  PE1 -.-> PEA
  PE2 -.-> PEA

  PEA --> PES
  PEA --> PEC
  PEA --> CSRF2
  PEA --> RL2

  PE2E -.-> PE1
  PE2E -.-> PEA
```

---

## Alias Import Edges (Selected)

- **Voice**
  - `src/pages/api/voice/transcribe.ts` → `@/lib/api-middleware`, `@/lib/rate-limiter`, `@/lib/services/voice-transcribe-service`, `@/config/voice`
  - `src/pages/api/voice/usage.ts` → `@/lib/api-middleware`, `@/lib/services/voice-transcribe-service`, `@/config/voice`
  - `src/components/tools/voice-visualizer/api.ts` → `@/lib/security/csrf`
- **AI Image**
  - `src/pages/api/ai-image/generate.ts` → `@/lib/api-middleware`, `@/lib/services/ai-image-service`, `@/config/ai-image`, `@/config/ai-image/entitlements`, `@/lib/rate-limiter`
  - `src/pages/api/ai-image/usage.ts` → `@/lib/api-middleware`, `@/lib/services/ai-image-service`
  - `src/pages/r2-ai/[...path].ts` → `@/config/ai-image`
  - `src/components/tools/ImagEnhancerIsland.tsx` → `@/config/ai-image`, `@/lib/security/csrf`, `@/lib/client-logger`
- **Prompt Enhancer**
  - `src/pages/api/prompt-enhance.ts` → `@/lib/api-middleware`, `@/config/ai-image` (limits), `@/lib/services/prompt-enhancer-service`, `@/lib/rate-limiter`, `@/lib/services/prompt-attachments`
  - `src/components/tools/prompt-enhancer/EnhancerForm.tsx` → `@/utils/i18n`, `@/lib/i18n`, `@/config/prompt-enhancer`, `@/lib/client/telemetry`, `@/lib/client-logger`

---

## API Annotations and Middleware

- **withApiMiddleware**: security headers, rate limiting, origin/CSRF (optional), unified JSON shapes via `createApiSuccess`/`createApiError`, `405` via `createMethodNotAllowed`.
- **withAuthApiMiddleware**: as above plus session/user requirement.
- **withRedirectMiddleware**: redirect endpoints and SSE, applies rate limiting, security headers; no forced JSON envelope.
- **Public R2 routes**: `src/pages/r2/**`, `src/pages/r2-ai/**` are public per `src/middleware.ts`; `/r2-ai/**` additionally owner-gates `results/` access.

---

## Test Coverage Links

- `tests/integration/api/voice/transcribe.test.ts` → `/api/voice/transcribe`
- `tests/integration/api/voice/usage.test.ts` → `/api/voice/usage`
- `tests/integration/ai-image-enhancer.test.ts` → `/api/ai-image/*`, `/r2-ai/*`
- `test-suite-v2/src/e2e/tools/voice-visualizer.smoke.spec.ts` → voice tool pages and APIs
- `test-suite-v2/src/e2e/tools/image-enhancer.spec.ts` → enhancer pages and APIs
- `test-suite-v2/src/e2e/tools/prompt-enhancer-flow.spec.ts` → prompt enhancer page and API

---

## Notes

- This codemap focuses on concrete edges validated in the codebase for core features. Additional pages/components import `@/*` utilities (i18n, SEO, client logging) not expanded here to keep the graph readable.
- If you need a raw CSV/JSON of all edges across `src/**`, I can generate and attach it separately.
