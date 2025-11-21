import type { APIContext } from 'astro';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';
import {
  getCreditsBalanceTenths,
  monthlyKey,
  legacyMonthlyKey,
  toUsageOverview,
  getUsage,
  rollingDailyKey,
  getVideoMonthlyQuotaRemainingTenths,
  type UsageOverview,
} from '@/lib/kv/usage';
import { getEntitlementsFor, type Plan } from '@/config/ai-image/entitlements';
import { getVideoEntitlementsFor } from '@/config/ai-video/entitlements';
import { getVoiceEntitlementsFor } from '@/config/voice/entitlements';
import { getWebscraperEntitlementsFor } from '@/config/webscraper/entitlements';
import { VoiceTranscribeService } from '@/lib/services/voice-transcribe-service';
import { WebscraperService } from '@/lib/services/webscraper-service';

interface SubscriptionRow {
  id: string;
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: number | null;
  updated_at: string;
}

type ToolsUsageOverview = {
  image?: UsageOverview;
  video?: UsageOverview;
  prompt?: UsageOverview;
  voice?: UsageOverview;
  webscraper?: UsageOverview;
};

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const opStart = Date.now();
    const { locals, clientAddress } = context;
    const user = locals.user;
    const env = (locals.runtime?.env ?? {}) as Partial<{
      DB: unknown;
      KV_AI_ENHANCER: unknown;
      USAGE_KV_V2: string;
      BILLING_USAGE_OVERVIEW_V2: string;
      KV_AI_VIDEO_USAGE: KVNamespace;
      KV_PROMPT_ENHANCER: KVNamespace;
      KV_VOICE_TRANSCRIBE: KVNamespace;
      KV_WEBSCRAPER: KVNamespace;
      PROMPT_USER_LIMIT: string;
      PROMPT_GUEST_LIMIT: string;
      PUBLIC_PROMPT_ENHANCER_V1: string;
      KV_AI_VIDEO_MONTHLY: KVNamespace;
      ENVIRONMENT: string;
      PUBLIC_WEBSCRAPER_V1: string;
      WEBSCRAPER_GUEST_LIMIT: string;
      WEBSCRAPER_USER_LIMIT: string;
      KV_AI_VIDEO_USAGE_FALLBACK: KVNamespace;
    }>;

    if (!user) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const db = env.DB as unknown;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    const dbStart = Date.now();
    type D1Stmt<T = unknown> = { bind: (...args: unknown[]) => { first: () => Promise<T | null> } };
    type D1Like = { prepare: (sql: string) => D1Stmt };
    const d1 = db as unknown as D1Like;
    const subRow = (await d1
      .prepare(
        `SELECT id, plan, status, current_period_end, cancel_at_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      )
      .bind(user.id)
      .first()) as SubscriptionRow | null;
    const subscription = subRow;
    const dbDur = Date.now() - dbStart;

    const creditsKv = env.KV_AI_ENHANCER as unknown;
    let creditsRemaining: number | null = null;
    let kvDur = 0;
    if (creditsKv) {
      try {
        const kvStart = Date.now();
        const useV2 = String(env.USAGE_KV_V2 || '').trim() === '1';
        if (useV2) {
          const tenths = await getCreditsBalanceTenths(
            creditsKv as unknown as KVNamespace,
            user.id
          );
          creditsRemaining = Math.floor((typeof tenths === 'number' ? tenths : 0) / 10);
          kvDur = Date.now() - kvStart;
        } else {
          const timeoutMs = 250;
          const key = `ai:credits:user:${user.id}`;
          const result = await Promise.race<Promise<string | null> | string>([
            (creditsKv as KVNamespace).get(key),
            new Promise<string>((resolve) => setTimeout(() => resolve('__timeout__'), timeoutMs)),
          ] as unknown as [Promise<string | null>, Promise<string>]);
          kvDur = Date.now() - kvStart;
          const rawCredits = result === '__timeout__' ? null : (result as string | null);
          if (rawCredits !== null) {
            const parsed = parseInt(rawCredits, 10);
            creditsRemaining = Number.isFinite(parsed) ? parsed : null;
          }
        }
      } catch (error) {
        logUserEvent(user.id, 'billing_summary_kv_error', {
          error: error instanceof Error ? error.message : String(error),
          ipAddress: clientAddress,
        });
      }
    }

    // Plan fallback: if no subscription and user.plan missing, read from users table
    let planFallback: Plan | undefined = (user as unknown as { plan?: Plan })?.plan;
    if (!subscription && !planFallback) {
      try {
        const row = (await (d1 as D1Like)
          .prepare(`SELECT plan FROM users WHERE id = ?1 LIMIT 1`)
          .bind(user.id)
          .first()) as { plan?: string } | null;
        const p = (row?.plan as Plan | undefined) ?? undefined;
        planFallback = p;
      } catch {}
    }

    // Determine whether a subscription should be considered active for plan purposes
    const activeStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);
    const isActiveSub = Boolean(subscription && activeStatuses.has(subscription.status));

    // Resolve plan and base fields
    const result = {
      // Prefer user's entitled plan unless there is an active subscription overriding it
      plan: (isActiveSub ? subscription!.plan : planFallback) ?? 'free',
      status: isActiveSub ? subscription!.status : 'inactive',
      subscriptionId: isActiveSub ? subscription!.id : null,
      currentPeriodEnd: isActiveSub ? subscription!.current_period_end : null,
      cancelAtPeriodEnd: isActiveSub ? Boolean(subscription!.cancel_at_period_end) : false,
      lastSyncedAt: subscription?.updated_at ?? null,
      creditsRemaining,
    };

    // Compute monthly usage/limit and period end for progress UI
    let monthlyLimit = 0;
    try {
      const plan = result.plan as Plan;
      monthlyLimit = getEntitlementsFor('user', plan).monthlyImages;
    } catch {}

    const creditsKv2 = env.KV_AI_ENHANCER as unknown;
    let monthlyUsed = 0;
    if (creditsKv2) {
      try {
        const useV2 = String(env.USAGE_KV_V2 || '').trim() === '1';
        if (useV2) {
          const key = legacyMonthlyKey('ai', 'user', user.id);
          const raw = await (creditsKv2 as KVNamespace).get(key);
          if (raw) {
            try {
              const obj = JSON.parse(raw) as { count?: number; countTenths?: number };
              monthlyUsed =
                typeof obj.countTenths === 'number' ? obj.countTenths / 10 : obj.count || 0;
            } catch {}
          }
        } else {
          const key = monthlyKey('ai', 'user', user.id);
          const raw = await (creditsKv2 as KVNamespace).get(key);
          if (raw) {
            try {
              const obj = JSON.parse(raw) as { count?: number };
              monthlyUsed = obj.count || 0;
            } catch {}
          }
        }
      } catch {}
    }

    const periodEndsAt = result.currentPeriodEnd
      ? result.currentPeriodEnd * 1000
      : endOfMonthUtcMs();

    const requestUrl = new URL(context.request.url);
    const toolsParam = requestUrl.searchParams.get('tools');
    const debugToolsParam = requestUrl.searchParams.get('debugTools');
    const envName = String(env.ENVIRONMENT || '')
      .trim()
      .toLowerCase();
    const isProductionEnv = envName === 'production';
    let enableToolsBlock = String(env.BILLING_USAGE_OVERVIEW_V2 || '').trim() === '1';
    if (!isProductionEnv && toolsParam) {
      enableToolsBlock = toolsParam === '1';
    }
    const enableToolsDebug = !isProductionEnv && debugToolsParam === '1';

    const toolNames: (keyof ToolsUsageOverview)[] = [
      'image',
      'video',
      'prompt',
      'voice',
      'webscraper',
    ];
    const failTools = new Set<keyof ToolsUsageOverview>();
    if (!isProductionEnv) {
      const failParams = requestUrl.searchParams.getAll('failTool');
      for (const raw of failParams) {
        if (!raw) continue;
        const parts = raw.split(',');
        for (const part of parts) {
          const normalized = part.trim().toLowerCase();
          const match = toolNames.find((name) => name === normalized);
          if (match) {
            failTools.add(match);
          }
        }
      }
    }
    const tools: ToolsUsageOverview = {};
    const toolTimings: string[] = [];

    if (enableToolsBlock) {
      const recordToolResult = async (
        name: keyof ToolsUsageOverview,
        fn: () => Promise<UsageOverview | null>
      ) => {
        const start = Date.now();
        try {
          if (failTools.has(name)) {
            throw new Error(`debug_fail_${name}`);
          }
          const value = await fn();
          if (value) {
            tools[name] = value;
          }
        } catch (error) {
          logUserEvent(user.id, 'billing_summary_tools_error', {
            tool: name,
            error: error instanceof Error ? error.message : String(error),
            ipAddress: clientAddress,
          });
        } finally {
          toolTimings.push(`tools.${name};dur=${Date.now() - start}`);
        }
      };

      await recordToolResult('image', async () => {
        return toUsageOverview({ used: monthlyUsed, limit: monthlyLimit, resetAt: periodEndsAt });
      });

      await recordToolResult('video', async () => {
        const videoEnt = getVideoEntitlementsFor('user', result.plan as Plan);
        const limitTenths = Math.max(0, videoEnt.monthlyCreditsTenths);
        const kvVideo = (env.KV_AI_VIDEO_USAGE ?? env.KV_AI_ENHANCER) as KVNamespace | undefined;
        if (!kvVideo || limitTenths <= 0) return null;
        const ym = currentYearMonth();
        const remainingTenths = await getVideoMonthlyQuotaRemainingTenths(
          kvVideo,
          user.id,
          limitTenths,
          ym
        );
        const limit = limitTenths / 10;
        const remaining = remainingTenths / 10;
        return toUsageOverview({
          used: limit - remaining,
          limit,
          resetAt: endOfMonthUtcMs(),
        });
      });

      await recordToolResult('prompt', async () => {
        const kvPrompt = env.KV_PROMPT_ENHANCER as KVNamespace | undefined;
        if (!kvPrompt) return null;
        const limitUser = parseInt(String(env.PROMPT_USER_LIMIT || '20'), 10);
        const useV2 = String(env.USAGE_KV_V2 || '').trim() === '1';
        let used = 0;
        let resetAt: number | null = null;
        if (useV2) {
          const key = rollingDailyKey('prompt', 'user', user.id);
          const usage = await getUsage(kvPrompt, key);
          if (usage) {
            used = usage.count || 0;
            resetAt = usage.resetAt ? usage.resetAt * 1000 : null;
          }
        } else {
          const key = `prompt:usage:user:${user.id}`;
          const raw = await kvPrompt.get(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { count?: number; resetAt?: number };
              used = typeof parsed.count === 'number' ? parsed.count : 0;
              resetAt = typeof parsed.resetAt === 'number' ? parsed.resetAt : null;
            } catch {}
          }
        }
        return toUsageOverview({ used, limit: limitUser, resetAt });
      });

      await recordToolResult('voice', async () => {
        const voiceService = new VoiceTranscribeService({
          KV_VOICE_TRANSCRIBE: env.KV_VOICE_TRANSCRIBE as KVNamespace | undefined,
          USAGE_KV_V2: env.USAGE_KV_V2,
          ENVIRONMENT: env.ENVIRONMENT,
        });
        const ent = getVoiceEntitlementsFor('user', result.plan as Plan);
        const usageInfo = await voiceService.getUsage('user', user.id, ent.dailyBurstCap);
        return toUsageOverview({
          used: usageInfo.used,
          limit: usageInfo.limit,
          resetAt: usageInfo.resetAt,
        });
      });

      await recordToolResult('webscraper', async () => {
        if (env.PUBLIC_WEBSCRAPER_V1 === 'false') return null;
        const service = new WebscraperService({
          KV_WEBSCRAPER: env.KV_WEBSCRAPER as KVNamespace | undefined,
          ENVIRONMENT: env.ENVIRONMENT,
          PUBLIC_WEBSCRAPER_V1: env.PUBLIC_WEBSCRAPER_V1,
          WEBSCRAPER_GUEST_LIMIT: env.WEBSCRAPER_GUEST_LIMIT,
          WEBSCRAPER_USER_LIMIT: env.WEBSCRAPER_USER_LIMIT,
        });
        const ent = getWebscraperEntitlementsFor('user', result.plan as Plan);
        const usageInfo = await service.getUsagePublic('user', user.id, ent.dailyBurstCap);
        return toUsageOverview({
          used: usageInfo.used,
          limit: usageInfo.limit,
          resetAt: usageInfo.resetAt,
        });
      });
    }

    logUserEvent(user.id, 'billing_summary_requested', {
      ipAddress: clientAddress,
      plan: result.plan,
      status: result.status,
    });

    const responsePayload: Record<string, unknown> = {
      ...result,
      monthlyLimit,
      monthlyUsed,
      periodEndsAt,
    };

    if (enableToolsBlock && Object.keys(tools).length > 0) {
      responsePayload.tools = tools;
    }

    if (enableToolsDebug) {
      const toolKeys = Object.keys(tools);
      responsePayload.toolsDebug = {
        envName,
        enableToolsBlock,
        toolsCount: toolKeys.length,
        toolsPresent: toolKeys,
      };
    }

    const resp = createApiSuccess(responsePayload);
    try {
      const total = Date.now() - opStart;
      const parts = [`db;dur=${dbDur}`, `kv;dur=${kvDur}`, ...toolTimings, `total;dur=${total}`];
      resp.headers.set('Server-Timing', parts.join(', '));
    } catch {}
    return resp;
  },
  {
    logMetadata: { action: 'billing_summary_accessed' },
  }
);

export const POST = withApiMiddleware(() => createMethodNotAllowed('GET'), {
  disableAutoLogging: true,
});
export const PUT = withApiMiddleware(() => createMethodNotAllowed('GET'), {
  disableAutoLogging: true,
});
export const PATCH = withApiMiddleware(() => createMethodNotAllowed('GET'), {
  disableAutoLogging: true,
});
export const DELETE = withApiMiddleware(() => createMethodNotAllowed('GET'), {
  disableAutoLogging: true,
});
export const OPTIONS = withApiMiddleware(() => createMethodNotAllowed('GET'), {
  disableAutoLogging: true,
});
export const HEAD = withApiMiddleware(() => createMethodNotAllowed('GET'), {
  disableAutoLogging: true,
});

function endOfMonthUtcMs(): number {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return end.getTime();
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
