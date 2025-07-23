import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const { env, user } = locals.runtime;
  

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // Get total number of users
    const totalUsersStmt = env.DB.prepare(`SELECT COUNT(*) as count FROM users`);
    const totalUsersResult = await totalUsersStmt.first<{ count: number }>();

    // The other stats are mocked as we don't have tables for them.
    const dashboardStats = [
      { "label": "Total Users", "value": totalUsersResult?.count ?? 0, "icon": "👥", "change": 0 },
      { "label": "Active Now", "value": 89, "icon": "🟢", "change": 0 },
      { "label": "API Calls", "value": "1.2M", "icon": "📊", "change": 0 },
      { "label": "Storage Used", "value": "54.2 GB", "icon": "💾", "change": 0 }
    ];

    return new Response(JSON.stringify(dashboardStats), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};