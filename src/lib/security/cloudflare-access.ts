import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

export interface AccessJwtVerificationResult {
  valid: boolean;
  email?: string;
  sub?: string;
  aud?: string[];
  error?: string;
}

function readEnv(contextEnv: unknown): Record<string, string> {
  // Astro APIContext.locals.runtime.env provides a plain record in Workers.
  if (contextEnv && typeof contextEnv === 'object') {
    return contextEnv as Record<string, string>;
  }
  return {};
}

function resolveJwksUrl(teamDomain?: string, explicitUrl?: string): string | null {
  if (explicitUrl) return explicitUrl;
  if (!teamDomain) return null;
  const td = teamDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${td}/cdn-cgi/access/certs`;
}

export async function verifyCloudflareAccessJwt(
  request: Request,
  contextEnv: unknown
): Promise<AccessJwtVerificationResult> {
  const env = readEnv(contextEnv);
  const rawHeader =
    request.headers.get('Cf-Access-Jwt-Assertion') ||
    request.headers.get('cf-access-jwt-assertion');
  const auth = request.headers.get('authorization');
  const bearer =
    auth && auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : undefined;
  const token = rawHeader || bearer;
  if (!token) {
    return { valid: false, error: 'missing_jwt' };
  }

  const jwksUrl = resolveJwksUrl(env.CF_ACCESS_TEAM_DOMAIN, env.CF_ACCESS_JWKS_URL);
  if (!jwksUrl) {
    return { valid: false, error: 'missing_jwks_or_team_domain' };
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const verifyOpts: { issuer?: string | string[]; audience?: string | string[] } = {};
    if (env.CF_ACCESS_TEAM_DOMAIN) {
      const td = env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
      verifyOpts.issuer = `https://${td}`;
    }
    if (env.CF_ACCESS_AUD) {
      verifyOpts.audience = env.CF_ACCESS_AUD;
    }

    const { payload } = await jwtVerify(token, JWKS, verifyOpts);
    const p = payload as JWTPayload & { email?: string; aud?: string | string[] };
    const audArray = Array.isArray(p.aud) ? p.aud : p.aud ? [p.aud] : undefined;
    return {
      valid: true,
      email: typeof p.email === 'string' ? p.email : undefined,
      sub: typeof p.sub === 'string' ? p.sub : undefined,
      aud: audArray,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: message };
  }
}
