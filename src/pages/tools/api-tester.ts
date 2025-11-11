import type { APIContext } from 'astro';
import { createSecureRedirect } from '@/lib/response-helpers';

export const prerender = false;

export const GET = (_context: APIContext): Response => {
  return createSecureRedirect('/tools', 301);
};
