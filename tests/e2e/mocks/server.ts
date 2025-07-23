import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { testUsers, mockResponses } from '../fixtures/test-data';

// Enable debug logging for MSW
process.env.DEBUG = 'msw*';

// Log environment information for debugging
console.log('Node Version:', process.version);

// Get MSW version from package.json
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mswVersion = require('msw/package.json').version;
console.log('MSW Version:', mswVersion);
console.log('MSW Debug Mode: Enabled');

// Helper function to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Type definitions for our mock database
interface Session {
  id: string;
  userId: string;
  expires: string;
}

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
}

interface Project {
  id: string;
  name: string;
  owner: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignedTo: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// Mock database
const db = {
  users: [
    {
      id: '1',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'user' as const,
    },
    {
      id: '2',
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin' as const,
    },
  ],
  sessions: [] as Session[],
  projects: [
    {
      id: '1',
      name: 'Test Project',
      owner: 'test@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Project[],
  tasks: [
    {
      id: '1',
      title: 'Complete project setup',
      description: 'Set up the project with all necessary dependencies and configurations',
      status: 'in-progress' as const,
      priority: 'high' as const,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: 'test@example.com',
      projectId: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Task[],
};

// API Handlers
const handlers = [
  // Login
  rest.post('/api/auth/login', async (req, res, ctx) => {
    const { email, password } = await req.json();
    const user = db.users.find(u => u.email === email && u.password === password);

    if (!user) {
      await delay(500);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Invalid credentials' })
      );
    }

    // Create a session
    const session = {
      id: `session_${Date.now()}`,
      userId: user.id,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    db.sessions.push(session);

    await delay(500);
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token: `mock-jwt-token-${user.id}`,
      }),
      ctx.set('Set-Cookie', `session=${session.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`)
    );
  }),

  // Get current user session
  rest.get('/api/auth/session', async (req, res, ctx) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    const sessionId = req.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1];

    if (!token && !sessionId) {
      await delay(150);
      return res(
        ctx.status(200),
        ctx.json({ user: null })
      );
    }

    // Find session by token or session ID
    const session = token
      ? db.sessions.find(s => s.id === token)
      : db.sessions.find(s => s.id === sessionId);

    if (!session) {
      await delay(150);
      return res(
        ctx.status(200),
        ctx.json({ user: null })
      );
    }

    const user = db.users.find(u => u.email === session.userId);
    if (!user) {
      await delay(150);
      return res(
        ctx.status(200),
        ctx.json({ user: null })
      );
    }

    await delay(150);
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    );
  }),

  // Logout
  rest.post('/api/auth/logout', async (req, res, ctx) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    const sessionId = req.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1];

    if (token) {
      const sessionIndex = db.sessions.findIndex(s => s.id === token);
      if (sessionIndex !== -1) {
        db.sessions.splice(sessionIndex, 1);
      }
    } else if (sessionId) {
      const sessionIndex = db.sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        db.sessions.splice(sessionIndex, 1);
      }
    }

    await delay(100);
    return res(
      ctx.status(204),
      ctx.set('Set-Cookie', 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict'),
      ctx.json({})
    );
  }),

  // Get projects
  rest.get('/api/projects', async (req, res, ctx) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    const sessionId = req.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1];
    
    if (!token && !sessionId) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Nicht autorisiert' })
      );
    }
    
    // Find session by token or session ID
    const session = token
      ? db.sessions.find(s => s.id === token)
      : db.sessions.find(s => s.id === sessionId);
      
    if (!session) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Ungültige Sitzung' })
      );
    }
    
    const user = db.users.find(u => u.email === session.userId);
    if (!user) {
      await delay(100);
      return res(
        ctx.status(404),
        ctx.json({ error: 'Benutzer nicht gefunden' })
      );
    }
    
    // Only return projects for the logged-in user
    const userProjects = db.projects.filter(p => p.owner === user.email);
    
    await delay(150);
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: userProjects,
      })
    );
  }),

  // Get tasks
  rest.get('/api/tasks', async (req, res, ctx) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    const sessionId = req.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1];
    
    if (!token && !sessionId) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Nicht autorisiert' })
      );
    }
    
    // Find session by token or session ID
    const session = token
      ? db.sessions.find(s => s.id === token)
      : db.sessions.find(s => s.id === sessionId);
      
    if (!session) {
      await delay(100);
      return res(
        ctx.status(401),
        ctx.json({ error: 'Ungültige Sitzung' })
      );
    }
    
    const user = db.users.find(u => u.email === session.userId);
    if (!user) {
      await delay(100);
      return res(
        ctx.status(404),
        ctx.json({ error: 'Benutzer nicht gefunden' })
      );
    }
    
    // Only return tasks for the logged-in user
    const userTasks = db.tasks.filter(t => t.assignedTo === user.email);
    
    await delay(150);
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: userTasks,
      })
    );
  }),

  // Create new project
  rest.post('/api/projects', async (req, res, ctx) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    const sessionId = req.headers.get('cookie')?.split('; ').find(c => c.startsWith('session='))?.split('=')[1];
    
    if (!token && !sessionId) {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Nicht autorisiert' })
      );
    }

    // Find session by token or session ID
    const session = token
      ? db.sessions.find(s => s.id === token)
      : db.sessions.find(s => s.id === sessionId);
      
    if (!session) {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Ungültige Sitzung' })
      );
    }

    const user = db.users.find(u => u.email === session.userId);
    if (!user) {
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

// Create and export the server instance
const server = setupServer(...handlers);

export { server, handlers, db };
