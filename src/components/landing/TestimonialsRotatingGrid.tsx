import { useEffect, useMemo, useRef, useState } from 'react';

export type TestimonialItem = { quote: string; author: string; role?: string; tool?: string };

type Props = {
  items: TestimonialItem[];
  intervalMs?: number;
  className?: string;
  scenarioLabel: string;
};

function useReducedMotion() {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function toolLabel(tool?: string): string | null {
  if (!tool) return null;
  const map: Record<string, string> = {
    imag: 'Imag‑Enhancer',
    prompt: 'Prompt Enhancer',
    voice: 'Voice Transcriptor',
    web: 'Webscraper',
    video: 'Video Enhancer',
  };
  return map[tool] ?? tool;
}

function ToolBadge({ tool }: { tool?: string }) {
  const label = toolLabel(tool);
  if (!label) return null;
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/40">
      {label}
    </div>
  );
}

function Card({
  item,
  entering,
  scenarioLabel,
}: {
  item: TestimonialItem;
  entering?: boolean;
  scenarioLabel: string;
}) {
  return (
    <article
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl px-4 py-4 md:px-5 md:py-5 transition duration-300 hover:bg-slate-950/70 hover:shadow-[0_0_40px_rgba(16,185,129,0.28)] ${entering ? 'animate-child-1' : ''}`}
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 h-full w-0.5 rounded-full bg-gradient-to-b from-emerald-400 via-emerald-300/70 to-transparent opacity-70 group-hover:from-emerald-300 group-hover:via-emerald-200/80" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90 mb-1">
                {scenarioLabel}
              </div>
              <div className="text-sm font-semibold text-slate-50 truncate">{item.author}</div>
              {item.role ? (
                <div className="mt-0.5 text-xs text-slate-300/85 line-clamp-2">{item.role}</div>
              ) : null}
            </div>
            <div className="ml-auto shrink-0 flex items-center gap-2">
              <ToolBadge tool={item.tool} />
            </div>
          </div>
          <blockquote
            className={`mt-3 text-[13px] md:text-sm leading-relaxed text-slate-100 ${entering ? 'animate-child-2' : ''}`}
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              WebkitLineClamp: 5,
            }}
          >
            {item.quote}
          </blockquote>
        </div>
      </div>
    </article>
  );
}

export default function TestimonialsRotatingGrid({
  items,
  intervalMs = 6500,
  className = '',
  scenarioLabel,
}: Props) {
  const prefersReduced = useReducedMotion();
  // 5 visible indices for 2-1-2 layout
  const [visible, setVisible] = useState<number[]>(() => {
    const base = [0, 1, 2, 3, 4].filter((i) => i < items.length);
    while (base.length < 5 && base.length < Math.max(5, items.length))
      base.push(base.length % Math.max(1, items.length));
    return base.length ? base : [0, 0, 0, 0, 0];
  });
  const cursorRef = useRef(5);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ioActive = useRef(false);
  const hoverRef = useRef(false);
  const lastChangedRef = useRef<number>(-1);
  const recentIndicesRef = useRef<number[]>([]); // avoid repeating same card too soon
  const [prevItems, setPrevItems] = useState<(TestimonialItem | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const animatingRef = useRef(false);

  // Pause/resume when offscreen
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        ioActive.current = !!entries[0]?.isIntersecting;
      },
      { rootMargin: '100px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Rotate one slot at a time (random slot, avoid immediate repeats)
  useEffect(() => {
    // rotate when there are more than 4 items available
    if (prefersReduced || items.length <= 4) return;
    let id: number | null = null;

    const pickSlot = () => {
      // pick a slot 0..4 not equal to lastChanged to avoid immediate repeat
      const choices = [0, 1, 2, 3, 4].filter((s) => s !== lastChangedRef.current);
      return choices[Math.floor(Math.random() * choices.length)];
    };

    const step = () => {
      if (!(ioActive.current && !hoverRef.current)) return;
      if (animatingRef.current) return;
      animatingRef.current = true;
      const slot = pickSlot();

      // compute next index avoiding current + recent
      let next = cursorRef.current % items.length;
      const currentSet = new Set(visible);
      const recentSet = new Set(recentIndicesRef.current);
      let guard = 0;
      while ((currentSet.has(next) || recentSet.has(next)) && guard < items.length) {
        next = (next + 1) % items.length;
        guard++;
      }

      // set overlay previous item for the slot
      setPrevItems((prev) => {
        const clone = prev.slice();
        clone[slot] = items[visible[slot] % items.length];
        return clone;
      });

      // immediately swap to new content (it will fade-in)
      setVisible((current) => {
        const updated = current.slice();
        updated[slot] = next;
        cursorRef.current = (next + 1) % items.length;
        lastChangedRef.current = slot;
        recentIndicesRef.current = [next, ...recentIndicesRef.current].slice(
          0,
          Math.min(8, items.length)
        );
        // release after fade-in finishes
        const inMs =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(min-width: 768px)').matches
            ? 900
            : 750;
        window.setTimeout(() => {
          setPrevItems((p) => {
            const c = p.slice();
            c[slot] = null;
            return c;
          });
          animatingRef.current = false;
        }, inMs);
        return updated;
      });
    };

    id = window.setInterval(step, intervalMs);
    return () => {
      if (id) clearInterval(id);
    };
  }, [prefersReduced, items, intervalMs]);

  const visibleItems = useMemo(() => visible.map((i) => items[i % items.length]), [visible, items]);

  // Layout: ruhiges, symmetrisches Grid ohne X-Form
  return (
    <div
      ref={rootRef}
      aria-live="polite"
      className={`flex flex-col gap-y-8 md:gap-y-10 ${className}`}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {[0, 1, 2, 3, 4].map((slot) => (
          <div
            key={`slot-${slot}-${visible[slot]}`}
            className={`relative ${lastChangedRef.current === slot ? 'animate-fade-in' : ''}`}
          >
            {prevItems[slot] ? (
              <div className="absolute inset-0 animate-fade-out">
                <Card item={prevItems[slot]!} scenarioLabel={scenarioLabel} />
              </div>
            ) : null}
            <Card
              item={visibleItems[slot]}
              entering={lastChangedRef.current === slot}
              scenarioLabel={scenarioLabel}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
