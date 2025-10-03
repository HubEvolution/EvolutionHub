import type { Plan as PlanType, PlanEntitlements } from '@/config/ai-image/entitlements';

export type OwnerType = 'user' | 'guest';
export type Plan = PlanType;
export type { PlanEntitlements };

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
  usage: UsageInfo;
  limits: { user: number; guest: number };
  plan?: Plan;
  entitlements: PlanEntitlements;
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
