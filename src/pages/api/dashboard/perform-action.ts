// evolution-hub/frontend/src/pages/api/dashboard/perform-action.ts
import type { APIContext } from 'astro';
import { createProject, inviteTeam, generateReport, settings } from '../../../server/actions';

const actions: Record<string, (context: APIContext) => Promise<Response>> = {
  createProject,
  inviteTeam,
  generateReport,
  settings,
};

export async function POST(context: APIContext): Promise<Response> {
  const { request } = context;
  
  try {
    const { action: actionName } = await request.json();

    if (!actionName || typeof actionName !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'Action name is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const actionHandler = actions[actionName];

    if (actionHandler) {
      return await actionHandler(context);
    } else {
      return new Response(
        JSON.stringify({ success: false, message: `Unknown action: ${actionName}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error performing action:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'An internal server error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}