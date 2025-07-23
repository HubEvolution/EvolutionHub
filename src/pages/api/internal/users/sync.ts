import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  try {
    const user = await request.json<{ id: string; name: string; email: string; image: string; }>();

    if (!user || !user.id || !user.email) {
      return new Response(JSON.stringify({ error: 'User ID and email are required' }), { status: 400 });
    }

    const { id, name, email, image } = user;
    const now = new Date().toISOString();

    const stmt = env.DB.prepare(`
        INSERT INTO users (id, name, email, image, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            image = excluded.image,
            updated_at = excluded.updated_at
    `);

    await stmt.bind(id, name, email, image, now, now).run();

    return new Response(JSON.stringify({ message: 'User synced successfully' }), { status: 200 });
  } catch (e: any) {
    console.error('Error syncing user:', e.message);
    return new Response(JSON.stringify({ error: 'Failed to sync user' }), { status: 500 });
  }
};