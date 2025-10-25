import { useEffect, useRef, useState } from 'react';

type Props = {
  className?: string;
  density?: number; // approx number of stars
  fullBleed?: boolean;
};

type Star = {
  x: number;
  y: number;
  r: number;
  base: number;
  phase: number;
  speed: number;
  c: string;
};

export default function StarfieldBackdrop({
  className = '',
  density = 320,
  fullBleed = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const starsRef = useRef<Star[] | null>(null);
  const [visible, setVisible] = useState(false);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createStratifiedStars(cols: number, rows: number, jitter = 0.6): Star[] {
    const W = 1200,
      H = 600;
    const stars: Star[] = [];
    const cw = W / cols;
    const ch = H / rows;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const jx = (Math.random() - 0.5) * jitter * cw;
        const jy = (Math.random() - 0.5) * jitter * ch;
        const x = (cx + 0.5) * cw + jx;
        const y = (cy + 0.5) * ch + jy;
        const r = Math.random() < 0.9 ? 0.9 : 1.4; // tighter radius range
        const base = 0.12 + Math.random() * 0.1; // slightly dimmer base
        const c = Math.random() < 0.8 ? '#7fffe0' : '#c389ff';
        stars.push({
          x,
          y,
          r,
          base,
          phase: Math.random() * Math.PI * 2,
          speed: 0.001 + Math.random() * 0.0025,
          c,
        });
      }
    }
    return stars;
  }

  // Initialize once based on density
  if (!starsRef.current) {
    // scale density on small screens
    const d =
      typeof window !== 'undefined' && window.innerWidth < 640
        ? Math.round(density * 0.72)
        : density;
    const cols = 24;
    const rows = Math.max(10, Math.round(d / cols));
    const base = createStratifiedStars(cols, rows, 0.7);
    starsRef.current = base.slice(0, Math.min(base.length, d));
  }

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisible(entries[0]?.isIntersecting ?? false);
      },
      { rootMargin: '100px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Animate twinkle
  useEffect(() => {
    if (prefersReduced || !visible) return;
    let id: number | null = null;
    const tick = () => {
      const nodes = svgRef.current?.querySelectorAll('[data-star]') || ([] as any);
      const stars = starsRef.current || [];
      for (let i = 0; i < Math.min(nodes.length, stars.length); i++) {
        const s = stars[i]!;
        s.phase += s.speed * 16;
        const op = Math.max(0, Math.min(1, s.base + 0.22 * Math.sin(s.phase)));
        (nodes[i] as SVGCircleElement).setAttribute('fill-opacity', String(op));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }, [prefersReduced, visible]);

  const basePos = fullBleed
    ? 'absolute top-0 left-1/2 -translate-x-1/2 w-screen h-full'
    : 'absolute inset-0 w-full h-full';

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      className={`${basePos} pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <g>
        {starsRef.current!.map((s, idx) => (
          <circle
            key={`s-${idx}`}
            data-star
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.c}
            fillOpacity={s.base}
            style={{ mixBlendMode: 'screen' as any }}
          />
        ))}
      </g>
    </svg>
  );
}
