import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId');

  if (!postId) {
    return new Response(JSON.stringify({ error: 'postId is required' }), { status: 400 });
  }
  const { results } = await env.DB.prepare(
    'SELECT * FROM comments WHERE postId = ?1 AND approved = 1'
  )
    .bind(postId)
    .all();
  return new Response(JSON.stringify(results), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;
  try {
    const { postId, author, content } = await request.json<{
      postId: string;
      author: string;
      content: string;
    }>();

    if (!postId || !author || !content) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const newComment = {
      id: crypto.randomUUID(),
      postId,
      author,
      content,
      createdAt: new Date().toISOString(),
      approved: false, // Default to not approved
    };

    await env.DB.prepare(
      'INSERT INTO comments (id, postId, author, content, createdAt, approved) VALUES (?1, ?2, ?3, ?4, ?5, 0)'
    )
      .bind(
        newComment.id,
        newComment.postId,
        newComment.author,
        newComment.content,
        newComment.createdAt
      )
      .run();

    return new Response(JSON.stringify(newComment), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }
};