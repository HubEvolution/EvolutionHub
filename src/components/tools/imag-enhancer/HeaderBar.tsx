import React from 'react';
import { StatusUsagePill } from './StatusUsagePill';

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
  return (
    <>
      <button
        type="button"
        ref={props.helpBtnRef}
        className="px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 text-xs rounded-md ring-1 bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        onClick={props.onOpenHelp}
      >
        {props.helpLabel}
      </button>
      <button
        type="button"
        className={`px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 text-xs rounded-md ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${props.loupeEnabled ? 'bg-cyan-500/20 ring-cyan-400/50 text-cyan-700 dark:text-cyan-200' : 'bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40'}`}
        onClick={props.onToggleLoupe}
        aria-pressed={props.loupeEnabled}
      >
        {props.loupeLabel}
      </button>
      <button
        type="button"
        className="px-3 py-2 min-h-[44px] sm:px-2 sm:py-1 text-xs rounded-md ring-1 bg-white/60 dark:bg-slate-800/60 ring-gray-400/30 text-gray-700 dark:text-gray-200 hover:ring-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        onClick={props.onToggleFullscreen}
      >
        {props.isFullscreen ? props.exitFullscreenLabel : props.fullscreenLabel}
      </button>
      {props.planLabel && (
        <StatusUsagePill
          label={props.usageLabel}
          loadingLabel={props.loadingLabel}
          usage={props.usage}
          ownerType={props.ownerType}
          percent={props.percent}
          critical={props.critical}
          planLabel={props.planLabel}
        />
      )}
      {!props.planLabel && (
        <StatusUsagePill
          label={props.usageLabel}
          loadingLabel={props.loadingLabel}
          usage={props.usage}
          ownerType={props.ownerType}
          percent={props.percent}
          critical={props.critical}
        />
      )}
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
