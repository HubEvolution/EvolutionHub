import type { Plan as PlanType } from '@/config/ai-image/entitlements';
import type { PromptPlanEntitlements } from '@/config/prompt/entitlements';

export type OwnerType = 'user' | 'guest';
export type Plan = PlanType;
export type PlanEntitlements = PromptPlanEntitlements;

export interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    type: string;
    message: string;
    details?: unknown;
  };
  ui?: {
    fullscreen: string;
    exitFullscreen: string;
  };
}

export interface UsageResponseData {
  ownerType: OwnerType;
  // Legacy daily usage overview (kept for backwards compatibility)
  usage: UsageInfo;
  limits: { user: number; guest: number };
  plan?: Plan;
  entitlements: PlanEntitlements;
  // Optional extended usage views for unified HUDs
  dailyUsage?: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: number | null;
  };
  monthlyUsage?: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: number | null;
  } | null;
  creditsBalanceTenths?: number | null;
}

export interface EnhanceResponseData {
  enhancedPrompt: string;
  safetyReport?: {
    score: number;
    warnings: string[];
  };
  usage: UsageInfo;
  limits: { user: number; guest: number };
}
