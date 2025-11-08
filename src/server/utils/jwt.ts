import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from 'hono/utils/jwt/types';

export interface JwtPayload extends JWTPayload {
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
    const decoded = (await verify(token, secret)) as JWTPayload | undefined;
    if (
      decoded &&
      typeof decoded === 'object' &&
      'userId' in decoded &&
      typeof decoded.userId === 'string' &&
      'exp' in decoded &&
      typeof decoded.exp === 'number'
    ) {
      return {
        userId: decoded.userId,
        exp: decoded.exp,
        ...decoded,
      };
    }
    return null;
  } catch (_error) {
    return null;
  }
}
