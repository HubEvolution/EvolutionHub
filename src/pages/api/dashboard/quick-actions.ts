import type { APIRoute } from 'astro';
import type { QuickAction } from '../../../src/types/dashboard';

const quickActions: Omit<QuickAction, 'action'> & { action: string }[] = [
  { "id": "qa1", "title": "New Post", "description": "Write a new blog article.", "icon": "✍️", "variant": "primary", "action": "createPost" }
];

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(quickActions), { status: 200 });
};