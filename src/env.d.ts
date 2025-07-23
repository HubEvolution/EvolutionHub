/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type D1Database = import("@cloudflare/workers-types").D1Database;

// Define the shape of the JWT payload
interface CustomJwtPayload {
    sub: string;
    name: string;
    email: string;
    picture: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<
  {
    DB: D1Database;
    DB_AUTH: D1Database;
    AUTH_SECRET: string;
    INTERNAL_API_SECRET: string;
  }
>;

declare namespace App {
  interface Locals {
    runtime: Runtime & { user?: CustomJwtPayload };
  }
}