import { setupWorker, rest, type RestHandler, type DefaultBodyType, type RestRequest, type RestContext, type ResponseComposition } from 'msw';
import type { SetupWorkerApi } from 'msw';
import { testUsers } from '../fixtures/test-data';

// Type for our response function
type ResponseFunction = (
  res: ResponseComposition<any>,
  ctx: RestContext
) => any;

// Helper function to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Type definitions for our mock database
interface Session {
  id: string;
  userId: string;
  expires: string;
}

interface Project {
  id: string;
  name: string;
  owner: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin';
}

// Mock database for browser tests
const db = {
  users: Object.values(testUsers) as User[],
  sessions: [] as Session[],
  projects: [
    { 
      id: '1', 
      name: 'Project Alpha', 
      owner: testUsers.standard.email, 
      status: 'active' as const 
    },
    { 
      id: '2', 
      name: 'Project Beta', 
      owner: testUsers.admin.email, 
      status: 'active' as const 
    },
  ] as Project[],
};

// API Handlers for browser
// Helper function to create a response with proper typing
const createResponse = (
  data: any,
  status = 200,
  headers: Record<string, string> = {}
): ResponseFunction => {
  return (res: ResponseComposition<any>, ctx: RestContext) => {
    let response = res(
      ctx.status(status),
      ctx.set('Content-Type', 'application/json'),
      ...Object.entries(headers).map(([key, value]) => ctx.set(key, value)),
      ctx.json(data)
    );
    return response;
  };
};

// Define the handlers
export const handlers: RestHandler[] = [
  // Login
  rest.post('/api/auth/login', async (req, res, ctx) => {
    try {
      const { email, password } = await req.json() as { email: string; password: string };
      const user = db.users.find(u => u.email === email && u.password === password);

      if (!user) {
        await delay(100);
        return createResponse(
          { error: 'Invalid credentials' },
          401
        )(res, ctx);
      }

      // Create session
      const session: Session = {
        id: `session-${Date.now()}`,
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      db.sessions.push(session);

      await delay(150);
      return createResponse(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken: session.id,
          refreshToken: `refresh-${session.id}`,
        },
        200,
        { 'Set-Cookie': `session=${session.id}; Path=/; HttpOnly; SameSite=Lax` }
      )(res, ctx);
    } catch (error) {
      console.error('Login error:', error);
      return createResponse(
        { error: 'Internal server error' },
        500
      )(res, ctx);
    }
  }),

  // Logout
  rest.post('/api/auth/logout', async (req, res, ctx) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    
    if (token) {
      const sessionIndex = db.sessions.findIndex(s => s.id === token);
      if (sessionIndex !== -1) {
        db.sessions.splice(sessionIndex, 1);
      }
    }

    await delay(150);
    return res(
      ctx.status(200),
      ctx.set('Set-Cookie', 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'),
      ctx.json({ success: true })
    );
  }),

  // Get current user session
  rest.get('/api/auth/session', async (req: RestRequest, res: ResponseComposition, ctx: RestContext) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Nicht autorisiert' })
      );
    }
    
    const session = db.sessions.find(s => s.id === token);
    if (!session) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Ungültige Sitzung' })
      );
    }
    
    const user = db.users.find(u => u.id === session.userId);
    if (!user) {
      await delay(100);
      return res(
        ctx.status(404),
        ctx.json({ error: 'Benutzer nicht gefunden' })
      );
    }
    
    await delay(100);
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken: session.id,
        refreshToken: `refresh-${session.id}`,
      })
    );
  }),

  // Get projects
  rest.get('/api/projects', async (req: RestRequest, res: ResponseComposition, ctx: RestContext) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Nicht autorisiert' })
      );
    }
    
    const session = db.sessions.find(s => s.id === token);
    if (!session) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Ungültige Sitzung' })
      );
    }
    
    const user = db.users.find(u => u.id === session.userId);
    if (!user) {
      await delay(100);
      return res(
        ctx.status(404),
        ctx.json({ error: 'Benutzer nicht gefunden' })
      );
    }
    
    // Only return projects for the logged-in user (or all if admin)
    const userProjects = db.projects.filter(
      p => p.owner === user.email || user.role === 'admin'
    );
    
    await delay(150);
    return res(
      ctx.status(200),
      ctx.json({ projects: userProjects })
    );
  }),

  // Create new project
  rest.post('/api/projects', async (req: RestRequest, res: ResponseComposition, ctx: RestContext) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Nicht autorisiert' })
      );
    }
    
    const session = db.sessions.find(s => s.id === token);
    if (!session) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Ungültige Sitzung' })
      );
    }
    
    const user = db.users.find(u => u.id === session.userId);
    if (!user) {
      await delay(100);
      return res(
        ctx.status(404),
        ctx.json({ error: 'Benutzer nicht gefunden' })
      );
    }
    
    const { name } = await req.json() as { name: string };
    if (!name) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Projektname ist erforderlich' })
      );
    }
    
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name,
      owner: user.email,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    db.projects.push(newProject);
    
    await delay(150);
    return res(
      ctx.status(201),
      ctx.json({ project: newProject })
    );
  }),
];

// Create the worker instance
const worker = setupWorker(...handlers);

// Helper function to start the worker
export async function startMockWorker() {
  if (typeof window === 'undefined') {
    const { server } = await import('./server');
    server.listen();
  } else {
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }
  
  // Log when a request is handled
  worker.events.on('request:start', ({ request }) => {
    console.log('MSW intercepted:', request.method, request.url);
  });

  // Log when a request fails
  worker.events.on('request:unhandled', ({ request }) => {
    console.warn('MSW unhandled request:', request.method, request.url);
  });

  return worker;
}

// Export the worker for direct use if needed
export { worker };
