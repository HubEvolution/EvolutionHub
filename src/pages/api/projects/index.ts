import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const { env, user } = locals.runtime;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = user.sub;
  const { title, description } = await request.json<{ title: string, description?: string }>();

  if (!title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 });
  }

  const projectId = crypto.randomUUID();
  const activityId = crypto.randomUUID();

  try {
      const newProject = {
          id: projectId,
          user_id: userId,
          title,
          description: description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
      };

      const newActivity = {
          id: activityId,
          user_id: userId,
          action: `created project "${title}"`,
          target_id: projectId,
          target_type: 'project',
          created_at: new Date().toISOString(),
      };

      await env.DB.batch([
          env.DB.prepare('INSERT INTO projects (id, user_id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
              .bind(newProject.id, newProject.user_id, newProject.title, newProject.description, newProject.created_at, newProject.updated_at),
          env.DB.prepare('INSERT INTO activities (id, user_id, action, target_id, target_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
              .bind(newActivity.id, newActivity.user_id, newActivity.action, newActivity.target_id, newActivity.target_type, newActivity.created_at)
      ]);

      return new Response(JSON.stringify(newProject), { status: 201 });
  } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: 'Failed to create project' }), { status: 500 });
  }
};