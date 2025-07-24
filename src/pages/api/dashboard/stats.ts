import type { APIContext } from 'astro';

export async function GET(context: APIContext): Promise<Response> {
  const locals = context.locals as any;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = locals.user.id;
  const db = locals.runtime.env.DB;

  try {
    const projectsQuery = db.prepare('SELECT count(*) as count FROM projects WHERE user_id = ?').bind(userId);
    const tasksQuery = db.prepare('SELECT count(*) as count FROM tasks WHERE user_id = ?').bind(userId);
    // Assuming a simple count for team members for now
    const teamMembersQuery = db.prepare('SELECT count(*) as count FROM users').bind();

    const [projectsResult, tasksResult, teamMembersResult] = await Promise.all([
      projectsQuery.first(),
      tasksQuery.first(),
      teamMembersQuery.first()
    ]);

    const stats = {
      projects: projectsResult?.count || 0,
      tasks: tasksResult?.count || 0,
      teamMembers: teamMembersResult?.count || 0,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}