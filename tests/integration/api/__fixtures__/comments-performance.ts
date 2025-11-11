import { hex32 } from '../../../shared/http';

type SeedOptions = {
  baseUrl?: string;
  headers?: HeadersInit;
  sessionCookie?: string;
  postId?: string;
  rootComments?: number;
  repliesPerRoot?: number;
};

type SeedCommentResult = {
  postId: string;
  commentIds: string[];
  replyIds: string[];
};

const DEFAULT_BASE_URL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const TEST_SESSION_COOKIE = process.env.TEST_ADMIN_COOKIE || 'session_id=e2e-admin-session-0001';
const DEFAULT_POST_ID = 'performance-test-post';
const TEST_HEADERS = {
  'x-test-seed': '1',
};

async function ensureSuiteUsers(baseUrl: string, headers: HeadersInit) {
  const suiteUrl = `${baseUrl}/api/test/seed-suite-v2`;
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('x-test-seed')) {
    requestHeaders.set('x-test-seed', '1');
  }
  if (!requestHeaders.has('Origin')) {
    requestHeaders.set('Origin', baseUrl);
  }

  const response = await fetch(suiteUrl, {
    method: 'POST',
    headers: requestHeaders,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Failed to seed suite users: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
    );
  }
}

async function createComment(
  baseUrl: string,
  sessionCookie: string,
  payload: Record<string, unknown>,
  extraHeaders?: HeadersInit
) {
  const url = `${baseUrl}/api/comments/create`;
  const csrfToken = hex32();

  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Origin', baseUrl);
  headers.set('X-CSRF-Token', csrfToken);

  const existingCookie = headers.get('Cookie');
  const csrfCookie = `csrf_token=${encodeURIComponent(csrfToken)}`;
  const combinedCookie = [csrfCookie, sessionCookie]
    .concat(existingCookie ? [existingCookie] : [])
    .join('; ');
  headers.set('Cookie', combinedCookie);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      csrfToken,
    }),
    redirect: 'manual',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Failed to create comment: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
    );
  }

  const json = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: { id?: string };
  } | null;

  if (!json?.success || !json.data?.id) {
    throw new Error('Comment creation response missing id');
  }

  return json.data.id;
}

export async function seedCommentsPerformance(
  options: SeedOptions = {}
): Promise<SeedCommentResult> {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const sessionCookie = options.sessionCookie || TEST_SESSION_COOKIE;
  const headers = { ...TEST_HEADERS, ...(options.headers || {}) };
  const postId = options.postId || DEFAULT_POST_ID;
  const rootCount = Math.max(1, options.rootComments ?? 3);
  const repliesPerRoot = Math.max(0, options.repliesPerRoot ?? 1);

  await ensureSuiteUsers(baseUrl, headers);

  const commentIds: string[] = [];
  const replyIds: string[] = [];

  for (let i = 0; i < rootCount; i += 1) {
    const commentId = await createComment(
      baseUrl,
      sessionCookie,
      {
        content: `Seed comment #${i + 1} for ${postId}`,
        entityType: 'blog_post',
        entityId: postId,
      },
      headers
    );

    commentIds.push(commentId);

    for (let r = 0; r < repliesPerRoot; r += 1) {
      const replyId = await createComment(
        baseUrl,
        sessionCookie,
        {
          content: `Reply ${r + 1} to ${commentId}`,
          entityType: 'blog_post',
          entityId: postId,
          parentId: commentId,
        },
        headers
      );
      replyIds.push(replyId);
    }
  }

  // Additional search-friendly entry
  await createComment(
    baseUrl,
    sessionCookie,
    {
      content: 'Performance search sentinel content with unique-keyword-xyz',
      entityType: 'blog_post',
      entityId: postId,
    },
    headers
  );

  return {
    postId,
    commentIds,
    replyIds,
  };
}

export type { SeedCommentResult };
