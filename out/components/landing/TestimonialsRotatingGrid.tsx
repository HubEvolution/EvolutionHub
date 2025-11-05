import { useEffect, useMemo, useRef, useState } from 'react';

export type TestimonialItem = { quote: string; author: string; role?: string; tool?: string };

type Props = {
  items: TestimonialItem[];
  intervalMs?: number;
  className?: string;
};

function useReducedMotion() {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function VerifiedBadge() {
  return (
    <div className="ml-auto px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/25">
      Verified
    </div>
  );
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
    <div className="px-2 py-1 rounded-full text-[10px] font-medium bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/25">
      {label}
    </div>
  );
}

function Card({ item, entering }: { item: TestimonialItem; entering?: boolean }) {
  return (
    <article className="relative rounded-2xl overflow-hidden p-6 bg-white/5 dark:bg-white/3 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-shadow transform-gpu hover:-translate-y-0.5 landing-holo-panel h-full min-h-[180px] md:min-h-[200px]">
      <div className="absolute -top-10 -left-6 text-7xl select-none opacity-[0.12] pointer-events-none">
        “
      </div>
      <blockquote
        className={`text-base leading-relaxed text-gray-900 dark:text-gray-100 ${entering ? 'animate-child-1' : ''}`}
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          WebkitLineClamp: 5,
        }}
      >
        {item.quote}
      </blockquote>
      <div className={`mt-6 flex items-center gap-3 ${entering ? 'animate-child-2' : ''}`}>
        <div className="w-9 h-9 rounded-full bg-accent-soft ring-1 ring-white/20" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{item.author}</div>
          {item.role ? <div className="text-xs text-gray-300/80 truncate">{item.role}</div> : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ToolBadge tool={item.tool} />
          <VerifiedBadge />
        </div>
      </div>
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl gradient-border"
        aria-hidden="true"
      />
    </article>
  );
}

export default function TestimonialsRotatingGrid({
  items,
  intervalMs = 6500,
  className = '',
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

  // Layout: 2 (row 1), 1 centered (row 2), 2 (row 3) with staggered offsets (X shape)
  return (
    <div
      ref={rootRef}
      aria-live="polite"
      className={`flex flex-col gap-y-10 md:gap-y-16 ${className}`}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
        {[0, 1].map((slot) => (
          <div
            key={`row1-${slot}-${visible[slot]}`}
            className={`relative ${slot === 0 ? 'md:-mt-4' : 'md:mt-4'} ${lastChangedRef.current === slot ? 'animate-fade-in' : ''}`}
          >
            {prevItems[slot] ? (
              <div className="absolute inset-0 animate-fade-out">
                <Card item={prevItems[slot]!} />
              </div>
            ) : null}
            <Card item={visibleItems[slot]} entering={lastChangedRef.current === slot} />
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <div
          className={`relative ${lastChangedRef.current === 2 ? 'animate-fade-in' : ''} w-full sm:w-[min(32rem,100%)] md:-mt-2`}
        >
          {prevItems[2] ? (
            <div className="absolute inset-0 animate-fade-out">
              <Card item={prevItems[2]!} />
            </div>
          ) : null}
          <Card item={visibleItems[2]} entering={lastChangedRef.current === 2} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
        {[3, 4].map((slot) => (
          <div
            key={`row3-${slot}-${visible[slot]}`}
            className={`relative ${slot === 3 ? 'md:mt-4' : 'md:-mt-4'} ${lastChangedRef.current === slot ? 'animate-fade-in' : ''}`}
          >
            {prevItems[slot] ? (
              <div className="absolute inset-0 animate-fade-out">
                <Card item={prevItems[slot]!} />
              </div>
            ) : null}
            <Card item={visibleItems[slot]} entering={lastChangedRef.current === slot} />
          </div>
        ))}
      </div>
    </div>
  );
}
