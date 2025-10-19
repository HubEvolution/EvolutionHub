interface Props {
  buying: false | 200 | 1000;
  createCreditsCheckout: (pack: 200 | 1000) => Promise<void>;
}

export function CreditsPanel({ buying, createCreditsCheckout }: Props) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => createCreditsCheckout(200)}
        disabled={buying === 200}
        className="inline-flex items-center rounded-md px-3 py-1.5 text-xs ring-1 ring-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 hover:ring-emerald-400/60 disabled:opacity-60"
      >
        {buying === 200 ? 'Loading…' : 'Buy 200 credits (€7.99)'}
      </button>
      <button
        type="button"
        onClick={() => createCreditsCheckout(1000)}
        disabled={buying === 1000}
        className="inline-flex items-center rounded-md px-3 py-1.5 text-xs ring-1 ring-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 hover:ring-indigo-400/60 disabled:opacity-60"
      >
        {buying === 1000 ? 'Loading…' : 'Buy 1000 credits (€34.99)'}
      </button>
    </div>
  );
}
