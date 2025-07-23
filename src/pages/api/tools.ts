import type { APIRoute } from 'astro';
import { listTools } from '../../lib/handlers.ts';

export const GET: APIRoute = async (context) => {
  return listTools(context);
};