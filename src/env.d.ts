/// <reference types="astro/client" />

type ImportMetaEnv = {
  MODE?: string;
  BASE_URL?: string;
  PROD?: boolean;
  PRICING_LINKS?: string | Record<string, string>;
  PRICING_LINKS_ANNUAL?: string | Record<string, string>;
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
                // Turnstile-Secret-Key entfernt
                RESEND_API_KEY: string;
                // R2 Buckets
                R2_AVATARS?: import('@cloudflare/workers-types').R2Bucket;
                R2_AI_IMAGES?: import('@cloudflare/workers-types').R2Bucket;
                // KV Namespace for AI Enhancer guest quotas/metadata (optional in dev)
                KV_AI_ENHANCER?: import('@cloudflare/workers-types').KVNamespace;
                // External provider token
                REPLICATE_API_TOKEN?: string;
                // Name der Laufzeitumgebung (z. B. 'staging', 'production')
                ENVIRONMENT?: string;
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