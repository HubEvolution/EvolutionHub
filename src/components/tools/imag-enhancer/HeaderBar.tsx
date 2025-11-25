import React from 'react';
import Button from '@/components/ui/Button';
import ToolUsageBadge from '@/components/tools/shared/ToolUsageBadge';
import type { Plan } from './types';

interface Props {
  helpLabel: string;
  onOpenHelp: () => void;
  helpBtnRef: React.RefObject<HTMLButtonElement>;
  loupeLabel: string;
  loupeEnabled: boolean;
  onToggleLoupe: () => void;
  isFullscreen: boolean;
  fullscreenLabel: string;
  exitFullscreenLabel: string;
  onToggleFullscreen: () => void;
  plan: Plan | null;
  planLabel: string;
  usageLabel: string;
  loadingLabel: string;
  usage: { used: number; limit: number; resetAt: number | null };
  ownerType: 'user' | 'guest' | null;
  percent: number;
  critical: boolean;
  showUpgradeCta: boolean;
  pricingHref: string;
  onUpgradeClick: () => void;
  upgradeLabel: string;
}

export function HeaderBar(props: Props) {
  const planId =
    props.ownerType === 'user' && props.plan
      ? props.plan === 'free'
        ? 'starter'
        : (props.plan as 'pro' | 'premium' | 'enterprise')
      : null;

  return (
    <>
      <Button
        type="button"
        ref={props.helpBtnRef}
        variant="ghost"
        size="sm"
        className="min-h-[44px] sm:min-h-0 px-3 py-2 sm:px-2 sm:py-1 text-xs ring-1 ring-gray-400/30 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40"
        onClick={props.onOpenHelp}
      >
        {props.helpLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`min-h-[44px] sm:min-h-0 px-3 py-2 sm:px-2 sm:py-1 text-xs ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          props.loupeEnabled
            ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200'
            : 'bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'
        }`}
        onClick={props.onToggleLoupe}
      >
        {props.loupeLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-[44px] sm:min-h-0 px-3 py-2 sm:px-2 sm:py-1 text-xs ring-1 bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40"
        onClick={props.onToggleFullscreen}
      >
        {props.isFullscreen ? props.exitFullscreenLabel : props.fullscreenLabel}
      </Button>
      <ToolUsageBadge
        label={props.usageLabel}
        loadingLabel={props.loadingLabel}
        usage={props.usage}
        ownerType={props.ownerType}
        planId={planId}
        planLabel={props.planLabel}
        layout="pill"
        size="sm"
        showIcon
        showResetHint={false}
        showOwnerHint
        showPercent={false}
        severity={props.critical ? 'critical' : undefined}
      />
      {props.showUpgradeCta && (
        <a
          href={props.pricingHref}
          className="inline-flex items-center rounded-md px-2 py-1 text-[11px] ring-1 ring-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-200 hover:ring-amber-400/60"
          onClick={props.onUpgradeClick}
        >
          {props.upgradeLabel}
        </a>
      )}
    </>
  );
}
