/// <reference types="astro/client" />

type ImportMetaEnv = {
  MODE?: string;
  BASE_URL?: string;
  PROD?: boolean;
  PRICING_LINKS?: string | Record<string, string>;
  PRICING_LINKS_ANNUAL?: string | Record<string, string>;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
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
        // R2 Buckets
        R2_AVATARS?: import('@cloudflare/workers-types').R2Bucket;
        R2_AI_IMAGES?: import('@cloudflare/workers-types').R2Bucket;
        // Optional R2 bucket for voice archival (not required for MVP)
        R2_VOICE?: import('@cloudflare/workers-types').R2Bucket;
        // KV Namespace for AI Enhancer guest quotas/metadata (optional in dev)
        KV_AI_ENHANCER?: import('@cloudflare/workers-types').KVNamespace;
        // KV Namespace for Voice Transcriber quotas/metadata (optional in dev)
        KV_VOICE_TRANSCRIBE?: import('@cloudflare/workers-types').KVNamespace;
        // External provider token
        REPLICATE_API_TOKEN?: string;
        // OpenAI API and Whisper model selection
        OPENAI_API_KEY?: string;
        WHISPER_MODEL?: string;
        // Name der Laufzeitumgebung (z. B. 'staging', 'production')
        ENVIRONMENT?: string;
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
      };
    };
    /**
     * CSP Nonce, vom Server/Adapter gesetzt. Optional, damit Dev/Tests ohne CSP nicht brechen.
     */
    cspNonce?: string;
  }
}
