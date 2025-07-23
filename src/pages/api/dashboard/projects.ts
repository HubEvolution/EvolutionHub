import type { APIRoute } from 'astro';
import type { ProjectCard } from '../../../src/types/dashboard';

export const GET: APIRoute = async ({ locals }) => {
  const { env, user } = locals.runtime;
  

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = user.sub;

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, title, description, progress, status, updated_at as lastUpdated FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC`
    )
      .bind(userId)
      .all();

    const projects: ProjectCard[] = (results as any[]).map(p => ({
        ...p,
        members: [], // members are not stored in the current schema
    }));

    return new Response(JSON.stringify(projects), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};