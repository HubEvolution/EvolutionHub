import type { APIContext } from 'astro';
import { createSecureRedirect } from '@/lib/response-helpers';

export const prerender = false;

export const GET = ({ params }: APIContext): Response => {
  const raw = params.slug;
  const value = Array.isArray(raw) ? raw.join('/') : (raw ?? '');
  const trimmed = value.trim();

  if (!trimmed) {
    return createSecureRedirect('/blog/', 301);
  }

  const destination = `/blog/?tag=${encodeURIComponent(trimmed)}`;
  return createSecureRedirect(destination, 301);
};
