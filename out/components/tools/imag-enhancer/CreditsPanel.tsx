interface Props {
  buying: false | 100 | 500 | 1500;
  createCreditsCheckout: (pack: 100 | 500 | 1500) => Promise<void>;
}

export function CreditsPanel({ buying, createCreditsCheckout }: Props) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => createCreditsCheckout(100)}
        disabled={buying === 100}
        className="inline-flex items-center rounded-md px-3 py-1.5 text-xs ring-1 ring-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 hover:ring-emerald-400/60 disabled:opacity-60"
      >
        {buying === 100 ? 'Loading…' : 'Buy 100 credits (€6.00)'}
      </button>
      <button
        type="button"
        onClick={() => createCreditsCheckout(500)}
        disabled={buying === 500}
        className="inline-flex items-center rounded-md px-3 py-1.5 text-xs ring-1 ring-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 hover:ring-indigo-400/60 disabled:opacity-60"
      >
        {buying === 500 ? 'Loading…' : 'Buy 500 credits (€22.00)'}
      </button>
      <button
        type="button"
        onClick={() => createCreditsCheckout(1500)}
        disabled={buying === 1500}
        className="inline-flex items-center rounded-md px-3 py-1.5 text-xs ring-1 ring-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200 hover:ring-fuchsia-400/60 disabled:opacity-60"
      >
        {buying === 1500 ? 'Loading…' : 'Buy 1500 credits (€55.00)'}
      </button>
    </div>
  );
}
