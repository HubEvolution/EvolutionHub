import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  className?: string;
  fullBleed?: boolean;
};

type Pt = { x: number; y: number };

type Edge = {
  points: Pt[];
  length: number;
  progress: number;
  speed: number;
};

type Star = {
  x: number;
  y: number;
  r: number;
  base: number; // base opacity
  phase: number; // radians
  speed: number; // radians per ms
  c: string;
};

function len(a: Pt, b: Pt) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function totalLength(points: Pt[]) {
  let s = 0;
  for (let i = 1; i < points.length; i++) s += len(points[i - 1], points[i]);
  return s;
}

function pointAt(points: Pt[], t: number): Pt {
  if (t <= 0) return points[0];
  const L = totalLength(points);
  let d = L * t;
  for (let i = 1; i < points.length; i++) {
    const seg = len(points[i - 1], points[i]);
    if (d <= seg) {
      const r = d / seg;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * r,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * r,
      };
    }
    d -= seg;
  }
  return points[points.length - 1];
}

export default function CardGraph({ className = '', fullBleed = false }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [visible, setVisible] = useState(false);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [hover, setHover] = useState(false);
  const starsRef = useRef<Star[] | null>(null);
  const edgesRef = useRef<Edge[] | null>(null);
  const [starVersion, setStarVersion] = useState(0);

  const initialEdges = useMemo<Edge[]>(() => {
    const A: Pt = { x: 260, y: 220 };
    const B: Pt = { x: 600, y: 220 };
    const C: Pt = { x: 260, y: 420 };
    const D: Pt = { x: 600, y: 420 };
    const e: Pt[][] = [
      [A, { x: (A.x + B.x) / 2, y: A.y }, { x: (A.x + B.x) / 2, y: B.y }, B],
      [A, { x: A.x, y: (A.y + C.y) / 2 }, { x: C.x, y: (A.y + C.y) / 2 }, C],
      [B, { x: B.x, y: (B.y + D.y) / 2 }, { x: D.x, y: (B.y + D.y) / 2 }, D],
      [C, { x: (C.x + D.x) / 2, y: C.y }, { x: (C.x + D.x) / 2, y: D.y }, D],
    ];
    return e.map((pts, i) => ({
      points: pts,
      length: totalLength(pts),
      progress: Math.random(),
      speed: 70 + Math.random() * 20 + i * 3,
    }));
  }, []);

  if (!edgesRef.current) edgesRef.current = initialEdges;

  // Star helpers
  function createStratifiedStars(cols: number, rows: number, jitter = 0.5): Star[] {
    const W = 1200, H = 600;
    const stars: Star[] = [];
    const cw = W / cols;
    const ch = H / rows;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const jx = (Math.random() - 0.5) * jitter * cw;
        const jy = (Math.random() - 0.5) * jitter * ch;
        const x = (cx + 0.5) * cw + jx;
        const y = (cy + 0.5) * ch + jy;
        const r = Math.random() < 0.85 ? 1 : 1.8;
        const base = 0.16 + Math.random() * 0.16;
        const c = Math.random() < 0.8 ? '#7fffe0' : '#c389ff';
        stars.push({ x, y, r, base, phase: Math.random() * Math.PI * 2, speed: 0.001 + Math.random() * 0.0025, c });
      }
    }
    return stars;
  }

  function createCluster(center: Pt, count: number, radius: number): Star[] {
    return Array.from({ length: count }).map(() => {
      // Gaussian-ish radius
      const a = Math.random() * Math.PI * 2;
      const rr = radius * Math.sqrt(Math.random());
      const x = center.x + Math.cos(a) * rr * (0.9 + Math.random() * 0.2);
      const y = center.y + Math.sin(a) * rr * (0.9 + Math.random() * 0.2);
      const r = Math.random() < 0.8 ? 1 : 1.8;
      const base = 0.18 + Math.random() * 0.16;
      const c = Math.random() < 0.8 ? '#7fffe0' : '#c389ff';
      return { x, y, r, base, phase: Math.random() * Math.PI * 2, speed: 0.001 + Math.random() * 0.0025, c } as Star;
    });
  }

  // Initialize global stars once
  if (!starsRef.current) {
    // 24x12 ~= 288 base stars + some random extras to reach ~380
    const base = createStratifiedStars(24, 12, 0.7);
    const extras = Array.from({ length: 92 }).map(() => {
      const W = 1200, H = 600;
      const x = Math.random() * W, y = Math.random() * H;
      const r = Math.random() < 0.85 ? 1 : 1.8;
      const base = 0.16 + Math.random() * 0.16;
      const c = Math.random() < 0.8 ? '#7fffe0' : '#c389ff';
      return { x, y, r, base, phase: Math.random() * Math.PI * 2, speed: 0.001 + Math.random() * 0.0025, c } as Star;
    });
    starsRef.current = [...base, ...extras];
  }

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      setVisible(entries[0]?.isIntersecting ?? false);
    }, { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Recompute anchors from actual card centers and update polylines
  useEffect(() => {
    function recompute() {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const containerEl = svgEl.parentElement as HTMLElement | null;
      if (!containerEl) return;

      const rect = containerEl.getBoundingClientRect();
      const nodes = containerEl.querySelectorAll('.feature-card');
      if (nodes.length < 4) return;
      const scaleX = 1200 / Math.max(1, rect.width);
      const scaleY = 600 / Math.max(1, rect.height);
      const centers: Pt[] = [];
      for (let i = 0; i < 4; i++) {
        const r = (nodes[i] as HTMLElement).getBoundingClientRect();
        const cx = ((r.left + r.right) / 2 - rect.left) * scaleX;
        const cy = ((r.top + r.bottom) / 2 - rect.top) * scaleY;
        centers.push({ x: cx, y: cy });
      }

      const [A, B, C, D] = centers;
      // Determine layout: single column if horizontal spread is small
      const minX = Math.min(A.x, B.x, C.x, D.x);
      const maxX = Math.max(A.x, B.x, C.x, D.x);
      const singleColumn = (maxX - minX) < 120;
      let routes: Pt[][];
      if (singleColumn) {
        // Vertical chain AB, BC, CD, and a long AD for a 4th edge
        const elbow = (P: Pt, Q: Pt): Pt[] => [P, { x: P.x, y: (P.y + Q.y) / 2 }, { x: Q.x, y: (P.y + Q.y) / 2 }, Q];
        routes = [
          elbow(A, B),
          elbow(B, C),
          elbow(C, D),
          elbow(A, D),
        ];
      } else {
        routes = [
          [A, { x: (A.x + B.x) / 2, y: A.y }, { x: (A.x + B.x) / 2, y: B.y }, B],
          [A, { x: A.x, y: (A.y + C.y) / 2 }, { x: C.x, y: (A.y + C.y) / 2 }, C],
          [B, { x: B.x, y: (B.y + D.y) / 2 }, { x: D.x, y: (B.y + D.y) / 2 }, D],
          [C, { x: (C.x + D.x) / 2, y: C.y }, { x: (C.x + D.x) / 2, y: D.y }, D],
        ];
      }

      const current = edgesRef.current!;
      for (let i = 0; i < current.length; i++) {
        current[i].points = routes[i];
        current[i].length = totalLength(routes[i]);
      }

      const lineNodes = svgEl.querySelectorAll('[data-line]');
      for (let i = 0; i < Math.min(lineNodes.length, routes.length); i++) {
        (lineNodes[i] as SVGPolylineElement).setAttribute(
          'points',
          routes[i].map((p) => `${p.x},${p.y}`).join(' ')
        );
      }
      const glowNodes = svgEl.querySelectorAll('[data-line-glow]');
      for (let i = 0; i < Math.min(glowNodes.length, routes.length); i++) {
        (glowNodes[i] as SVGPolylineElement).setAttribute(
          'points',
          routes[i].map((p) => `${p.x},${p.y}`).join(' ')
        );
      }

      // Rebuild starfield to add clusters around cards atop stratified base
      const base = createStratifiedStars(24, 12, 0.7);
      const extras = Array.from({ length: 92 }).map(() => {
        const W = 1200, H = 600;
        const x = Math.random() * W, y = Math.random() * H;
        const r = Math.random() < 0.85 ? 1 : 1.8;
        const base = 0.16 + Math.random() * 0.16;
        const c = Math.random() < 0.8 ? '#7fffe0' : '#c389ff';
        return { x, y, r, base, phase: Math.random() * Math.PI * 2, speed: 0.001 + Math.random() * 0.0025, c } as Star;
      });
      const clusters = [A, B, C, D].flatMap((pt) => createCluster(pt, 36, 100));
      starsRef.current = [...base, ...extras, ...clusters];
      setStarVersion((v) => v + 1);
    }

    const svgEl = svgRef.current;
    const containerEl = svgEl?.parentElement as HTMLElement | null;
    if (!svgEl || !containerEl) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(containerEl);
    recompute();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    if (prefersReduced || !visible) return;
    let id: number | null = null;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const boost = hover ? 1.5 : 1;
      const edgesLocal = edgesRef.current!;
      edgesLocal.forEach((e) => {
        const delta = (e.speed * boost * dt) / 1000;
        e.progress = (e.progress + delta / e.length) % 1;
      });
      const circles = svgRef.current!.querySelectorAll('[data-pulse]');
      circles.forEach((node, i) => {
        const e = edgesLocal[i % edgesLocal.length];
        const p = pointAt(e.points, e.progress);
        (node as SVGCircleElement).setAttribute('cx', String(p.x));
        (node as SVGCircleElement).setAttribute('cy', String(p.y));
      });

      // Twinkle particles across full section
      const stars = starsRef.current!;
      const starNodes = svgRef.current!.querySelectorAll('[data-star]');
      for (let i = 0; i < stars.length && i < starNodes.length; i++) {
        const s = stars[i];
        s.phase += dt * s.speed;
        const op = Math.max(0, Math.min(1, s.base + 0.22 * Math.sin(s.phase)));
        (starNodes[i] as SVGCircleElement).setAttribute('fill-opacity', String(op));
      }
      id = requestAnimationFrame(tick);
    };

    id = requestAnimationFrame(tick);
    return () => { if (id) cancelAnimationFrame(id); };
  }, [prefersReduced, visible, hover]);

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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <defs>
        <linearGradient id="cg-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8bffe8" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#9a6bff" stopOpacity="0.24" />
        </linearGradient>
        <radialGradient id="cg-pulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9ffff0" stopOpacity="1" />
          <stop offset="100%" stopColor="#9ffff0" stopOpacity="0.0" />
        </radialGradient>
        <filter id="cg-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Full-section particles (subtle) */}
      <g key={starVersion}>
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
      {(edgesRef.current || []).map((e, idx) => (
        <g key={`lg-${idx}`}>
          <polyline
            key={`l-glow-${idx}`}
            data-line-glow
            points={e.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#9a6bff"
            strokeOpacity={0.18}
            strokeWidth="3.6"
            strokeLinecap="round"
            filter="url(#cg-glow)"
            style={{ mixBlendMode: 'screen' }}
          />
          <polyline
            key={`l-base-${idx}`}
            data-line
            points={e.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="url(#cg-line)"
            strokeWidth="2.6"
            strokeLinecap="round"
            style={{ mixBlendMode: 'screen' }}
          />
        </g>
      ))}
      {(edgesRef.current || []).map((_, idx) => (
        <circle key={`p-${idx}`} data-pulse r="4" fill="url(#cg-pulse)" />
      ))}
    </svg>
  );
}
