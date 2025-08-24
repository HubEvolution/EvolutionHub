/// <reference types="astro/client" />

type ImportMetaEnv = {
  MODE?: string;
  BASE_URL?: string;
  PROD?: boolean;
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
        } | null;
        runtime: {
            env: {
                DB: import('@cloudflare/workers-types').D1Database;
                // Turnstile-Secret-Key entfernt
                RESEND_API_KEY: string;
                // Name der Laufzeitumgebung (z. B. 'staging', 'production')
                ENVIRONMENT?: string;
            };
        };
        /**
         * CSP Nonce, vom Server/Adapter gesetzt. Optional, damit Dev/Tests ohne CSP nicht brechen.
         */
        cspNonce?: string;
    }
}