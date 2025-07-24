import type { APIContext } from 'astro';

export async function POST(context: APIContext): Promise<Response> {
  const locals = context.locals as any;
  if (!locals.user) {
    return new Response(null, { status: 401 });
  }

  const formData = await context.request.formData();
  const name = formData.get('name');
  const username = formData.get('username');

  if (typeof name !== 'string' || name.length < 2 || typeof username !== 'string' || username.length < 3) {
    return new Response('Invalid input', { status: 400 });
  }

  try {
    const db = locals.runtime.env.DB;
    await db.prepare('UPDATE users SET name = ?, username = ? WHERE id = ?')
      .bind(name, username, locals.user.id)
      .run();

    return new Response(JSON.stringify({ message: 'Profile updated successfully' }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response('An unknown error occurred', { status: 500 });
  }
}