import { sign, verify } from 'hono/jwt';

interface JwtPayload {
  userId: string;
  exp: number;
}

export async function createJwt(userId: string, secret: string): Promise<string> {
  const payload: JwtPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  return await sign(payload, secret);
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    return await verify(token, secret);
  } catch (_error) {
    return null;
  }
}
