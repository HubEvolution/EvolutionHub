import type { APIContext } from 'astro';
import type { Notification } from '../../../types/dashboard';

export async function GET(context: APIContext): Promise<Response> {
  const locals = context.locals as any;
  if (!locals.user) {
    return new Response(null, { status: 401 });
  }

  // This is mock data. In a real application, you would fetch this from your database.
  const mockNotifications: Notification[] = [
    { id: '1', message: 'You have a new comment on your project "Website Redesign".', type: 'comment', timestamp: new Date().toISOString(), read: false },
    { id: '2', message: '@jane mentioned you in the task "Update Documentation".', type: 'mention', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), read: false },
    { id: '3', message: 'Task "Deploy to Staging" was completed.', type: 'task_completed', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: true },
    { id: '4', message: 'System update scheduled for tonight at 2 AM.', type: 'system', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: true },
  ];

  return new Response(JSON.stringify(mockNotifications), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}