import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  className?: string;
  stroke?: string;
  opacity?: number;
  speedMs?: number;
};

export default function FeatureConnections({
  className = '',
  stroke = '#22d3ee',
  opacity = 0.25,
  speedMs = 9000,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [visible, setVisible] = useState(false);

  const paths = useMemo(() => {
    const w = 1200;
    const h = 600;
    return [
      `M ${w * 0.05},${h * 0.8} C ${w * 0.25},${h * 0.6} ${w * 0.35},${h * 0.2} ${w * 0.5},${h * 0.35} S ${w * 0.8},${h * 0.6} ${w * 0.95},${h * 0.4}`,
      `M ${w * 0.1},${h * 0.3} C ${w * 0.25},${h * 0.1} ${w * 0.55},${h * 0.15} ${w * 0.7},${h * 0.28} S ${w * 0.9},${h * 0.45} ${w * 0.95},${h * 0.55}`,
      `M ${w * 0.02},${h * 0.55} C ${w * 0.22},${h * 0.45} ${w * 0.45},${h * 0.7} ${w * 0.65},${h * 0.55} S ${w * 0.88},${h * 0.35} ${w * 0.98},${h * 0.25}`,
    ];
  }, []);

  // IO gate
  useEffect(() => {
    const el = ref.current;
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

  useEffect(() => {
    if (!ref.current) return;
    const svg = ref.current;
    if (prefersReduced || !visible) return; // don't animate
    let animId: number | null = null;
    let t = 0;

    const tick = () => {
      t += 16;
      const phase = (t / speedMs) * Math.PI * 2;
      const dash = 800 + Math.sin(phase) * 120;
      const offset = (t / (speedMs / 200)) % 2000;
      const lines = svg.querySelectorAll('path');
      lines.forEach((p, i) => {
        (p as SVGPathElement).style.strokeDasharray = `${dash}`;
        (p as SVGPathElement).style.strokeDashoffset = `${offset + i * 80}`;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [prefersReduced, visible, speedMs]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 1200 600"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="conn-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={opacity} />
          <stop offset="100%" stopColor="#b400ff" stopOpacity={opacity * 0.8} />
        </linearGradient>
      </defs>
      {paths.map((d, idx) => (
        <path
          key={idx}
          d={d}
          fill="none"
          stroke="url(#conn-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ mixBlendMode: 'screen' }}
        />
      ))}
    </svg>
  );
}
