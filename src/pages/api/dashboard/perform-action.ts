import type { APIContext } from 'astro';

export async function POST(context: APIContext): Promise<Response> {
  const locals = context.locals as any;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { action } = await context.request.json();
  const userId = locals.user.id;
  const db = locals.runtime.env.DB;

  try {
    switch (action) {
      case 'create_project':
        const newProjectId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO projects (id, user_id, title, description, status, progress) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(newProjectId, userId, 'New Project', 'A placeholder project.', 'active', 0).run();
        return new Response(JSON.stringify({ message: 'Project created successfully' }), { status: 200 });

      case 'create_task':
        const newTaskId = crypto.randomUUID();
        // Assuming a 'tasks' table exists
        await db.prepare(
          'INSERT INTO tasks (id, user_id, title, status) VALUES (?, ?, ?, ?)'
        ).bind(newTaskId, userId, 'New Task', 'pending').run();
        return new Response(JSON.stringify({ message: 'Task created successfully' }), { status: 200 });

      case 'invite_member':
        // Placeholder for inviting a team member
        return new Response(JSON.stringify({ message: 'Invite functionality not yet implemented' }), { status: 200 });

      case 'view_docs':
        return new Response(JSON.stringify({ redirect: '/docs' }), { status: 200 });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    console.error(`Error performing action '${action}':`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}