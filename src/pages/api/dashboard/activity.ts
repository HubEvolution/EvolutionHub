import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const { env, user } = locals.runtime;
  

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = user.sub;

  try {
    const { results } = await env.DB.prepare(`
        SELECT a.id, a.action, a.created_at, u.name as user, u.image as user_image
        FROM activities a
        JOIN users u ON a.user_id = u.id
        WHERE a.user_id = ?1
        ORDER BY a.created_at DESC
        LIMIT 10
    `).bind(userId).all();

    // Map to frontend expected format
    const activityFeed = results.map((item: any) => ({
        id: item.id,
        user: item.user,
        action: item.action,
        timestamp: item.created_at,
        icon: "✨", // Default icon, can be customized based on action
        color: "text-purple-400"
    }));

    return new Response(JSON.stringify(activityFeed), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};