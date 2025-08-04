/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Turnstile-Typen entfernt
}

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
        } | null;
        runtime: {
            env: {
                DB: import('@cloudflare/workers-types').D1Database;
                // Turnstile-Secret-Key entfernt
                RESEND_API_KEY: string;
            };
        };
    }
}