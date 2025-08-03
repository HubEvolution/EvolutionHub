import type { APIRoute } from 'astro';

/**
 * GET /api/user/me
 * Gibt die Daten des aktuell eingeloggten Benutzers zurück.
 * Sensible Daten werden durch einen Whitelist-Ansatz gefiltert.
 */
export const GET: APIRoute = ({ locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Whitelist-Ansatz: Nur explizit erlaubte Felder zurückgeben
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    created_at: user.created_at,
    // Weitere sichere Felder hier bei Bedarf hinzufügen
  };

  return new Response(JSON.stringify(safeUser), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};