/// <reference types="astro/client" />

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
                TURNSTILE_SECRET_KEY: string;
            };
        };
    }
}