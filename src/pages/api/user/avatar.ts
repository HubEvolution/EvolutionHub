import type { APIContext } from 'astro';

export async function POST(context: APIContext): Promise<Response> {
  const locals = context.locals as any;
  if (!locals.user) {
    return new Response(null, { status: 401 });
  }

  const formData = await context.request.formData();
  const avatarFile = formData.get('avatar');

  if (!(avatarFile instanceof File)) {
    return new Response('No file uploaded', { status: 400 });
  }

  try {
    const bucket = locals.runtime.env.R2_AVATARS;
    const db = locals.runtime.env.DB;
    
    // Generate a unique key for the file
    const fileKey = `avatars/${locals.user.id}/${crypto.randomUUID()}-${avatarFile.name}`;

    // Upload to R2
    await bucket.put(fileKey, await avatarFile.arrayBuffer(), {
      httpMetadata: { contentType: avatarFile.type },
    });

    // Construct the public URL (assuming you have a public domain connected to your R2 bucket)
    // For now, we'll just store the key. You'll need to set up a public domain for R2 to serve images.
    const imageUrl = `/r2/${fileKey}`; // This is a placeholder URL structure

    // Update user's image URL in the database
    await db.prepare('UPDATE users SET image = ? WHERE id = ?')
      .bind(imageUrl, locals.user.id)
      .run();

    return new Response(JSON.stringify({ message: 'Avatar updated successfully', imageUrl }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response('An unknown error occurred', { status: 500 });
  }
}