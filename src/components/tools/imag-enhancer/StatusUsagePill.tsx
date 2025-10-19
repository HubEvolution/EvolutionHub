import { UsagePill } from './UsagePill';

interface Props {
  label: string;
  loadingLabel: string;
  usage: { used: number; limit: number; resetAt: number | null };
  ownerType: 'user' | 'guest' | null;
  percent: number;
  critical: boolean;
  planLabel?: string;
}

export function StatusUsagePill(props: Props) {
  return (
    <>
      {props.planLabel && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white/40 dark:bg-slate-800/40 ring-1 ring-gray-400/30 text-gray-700 dark:text-gray-200"
          title={props.ownerType === 'guest' ? 'Guest user' : `Plan: ${props.planLabel}`}
        >
          {props.planLabel}
        </span>
      )}
      <UsagePill
        label={props.label}
        loadingLabel={props.loadingLabel}
        usage={props.usage}
        ownerType={props.ownerType}
        percent={props.percent}
        critical={props.critical}
      />
    </>
  );
}
