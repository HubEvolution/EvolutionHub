/// <reference types="astro/client" />

type ImportMetaEnv = {
  MODE?: string;
  BASE_URL?: string;
  PROD?: boolean;
  PRICING_LINKS?: string | Record<string, string>;
  PRICING_LINKS_ANNUAL?: string | Record<string, string>;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
  /**
   * Optional öffentliche Origin (nur Lesezugriff im Client), z. B. "https://hub-evolution.com".
   * Wird in einigen Client-Routen/Links verwendet. Serverseitig existiert zusätzlich `APP_ORIGIN`.
   */
  PUBLIC_APP_ORIGIN?: string;
  /**
   * Öffentliche Basis‑URL der Seite (für Sitemaps/SEO). Beispiel: "https://hub-evolution.com".
   */
  PUBLIC_SITE_URL?: string;
} & Record<string, string | boolean | undefined>;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    session: import('./lib/auth-v2').Session | null;
    user: {
      id: string;
      email: string;
      name: string;
      username: string;
      image?: string;
      email_verified: boolean;
      plan?: import('./config/ai-image').Plan; // optional to keep backward compatibility until migration applied
    } | null;
    runtime: {
      env: {
        DB: import('@cloudflare/workers-types').D1Database;
        TURNSTILE_SECRET_KEY?: string;
        RESEND_API_KEY: string;
        /**
         * JWT Secret für Hono/JWT‑Middleware geschützter Endpunkte.
         * Pflicht in allen Nicht‑Dev‑Umgebungen.
         */
        JWT_SECRET?: string;
        // R2 Buckets
        R2_AVATARS?: import('@cloudflare/workers-types').R2Bucket;
        R2_AI_IMAGES?: import('@cloudflare/workers-types').R2Bucket;
        // Optional R2 bucket for voice archival (not required for MVP)
        R2_VOICE?: import('@cloudflare/workers-types').R2Bucket;
        // KV Namespace for AI Enhancer guest quotas/metadata (optional in dev)
        KV_AI_ENHANCER?: import('@cloudflare/workers-types').KVNamespace;
        // KV Namespace for Voice Transcriber quotas/metadata (optional in dev)
        KV_VOICE_TRANSCRIBE?: import('@cloudflare/workers-types').KVNamespace;
        SESSION?: import('@cloudflare/workers-types').KVNamespace;
        KV_WEBSCRAPER?: import('@cloudflare/workers-types').KVNamespace;
        KV_PROMPT_ENHANCER?: import('@cloudflare/workers-types').KVNamespace;
        KV_WEB_EVAL?: import('@cloudflare/workers-types').KVNamespace;
        // External provider token
        REPLICATE_API_TOKEN?: string;
        // OpenAI API and Whisper model selection
        OPENAI_API_KEY?: string;
        WHISPER_MODEL?: string;
        AI?: {
          run: (model: string, payload: Record<string, unknown>) => Promise<unknown>;
        };
        // Name der Laufzeitumgebung (z. B. 'staging', 'production')
        ENVIRONMENT?: string;
        /**
         * Optionale serverseitige Basis‑URL (für Redirects), z. B. "https://hub-evolution.com".
         * In Dev oft "http://127.0.0.1:8787" (Wrangler).
         */
        BASE_URL?: string;
        /**
         * Optionaler Hostname/Origin für Same‑Origin‑Checks. Kommagetrennte Liste möglich.
         * Beispiele: "https://hub-evolution.com,https://www.hub-evolution.com"
         */
        APP_ORIGIN?: string;
        /**
         * Optionaler öffentlicher Origin (wird in Server‑Validierungen ebenfalls berücksichtigt).
         */
        PUBLIC_APP_ORIGIN?: string;
        /**
         * Alternative Alias‑Variablen für CORS/Same‑Origin Konfiguration (Legacy-Kompatibilität).
         */
        ALLOWED_ORIGINS?: string;
        ALLOW_ORIGINS?: string;
        /**
         * Interner Health‑Check Token für /api/health/auth (Header: x-internal-health)
         */
        INTERNAL_HEALTH_TOKEN?: string;
        // Voice feature flags
        VOICE_STREAM_SSE?: string;
        VOICE_STREAM_POLL?: string;
        VOICE_R2_ARCHIVE?: string;
        VOICE_DEV_ECHO?: string;
        // Stripe
        STRIPE_SECRET?: string;
        STRIPE_WEBHOOK_SECRET?: string;
        // Pricing table mapping (plan -> priceId)
        PRICING_TABLE?: string | Record<string, string>;
        /**
         * Stripe Payment Links mapping for monthly interval (plan -> url)
         * Example: { "pro": "https://buy.stripe.com/...", "premium": "https://buy.stripe.com/..." }
         */
        PRICING_LINKS?: string | Record<string, string>;
        /**
         * Stripe Payment Links mapping for annual interval (plan -> url)
         * Example: { "pro": "https://buy.stripe.com/...", "premium": "https://buy.stripe.com/..." }
         */
        PRICING_LINKS_ANNUAL?: string | Record<string, string>;

        /**
         * Authentifizierungs‑Provider Auswahl.
         * Erlaubte Werte (String‑Literal): 'stytch' | 'legacy'
         */
        AUTH_PROVIDER?: 'stytch' | 'legacy' | (string & {});
        /**
         * Default‑Redirect nach erfolgreicher Auth (relative App‑Route, z. B. '/dashboard').
         */
        AUTH_REDIRECT?: string;

        // STYTCH Konfiguration (Magic Link + OAuth)
        /** Stytch Projekt‑ID (secret). Live beginnt mit 'project-live-…' */
        STYTCH_PROJECT_ID?: string;
        /** Stytch Secret (secret) */
        STYTCH_SECRET?: string;
        /** Stytch Public Token für Public OAuth Start‑Endpoint (secret) */
        STYTCH_PUBLIC_TOKEN?: string;
        /**
         * Optionales Stytch Custom Domain (z. B. 'login.hub-evolution.com').
         * Bevorzugt für Public OAuth Start; sonst wird Test/API‑Base gewählt.
         */
        STYTCH_CUSTOM_DOMAIN?: string;
        /**
         * Aktiviert PKCE in Magic‑Link Flow: '1' | 'true' (sonst '0' | 'false').
         */
        STYTCH_PKCE?: '1' | '0' | 'true' | 'false' | (string & {});
        /**
         * Dev/Test: Erlaube Stytch‑Bypass im Callback mit token=dev-ok: '1' | 'true'.
         */
        STYTCH_BYPASS?: '1' | '0' | 'true' | 'false' | (string & {});
        /**
         * E2E‑Fake‑Modus für Stytch‑Wrapper ('1'|'true' in Dev) – echte API‑Calls werden simuliert.
         */
        E2E_FAKE_STYTCH?: '1' | '0' | 'true' | 'false' | (string & {});
      };
    };
    /**
     * CSP Nonce, vom Server/Adapter gesetzt. Optional, damit Dev/Tests ohne CSP nicht brechen.
     */
    cspNonce?: string;
  }
}
