import { useEffect, useRef } from 'react';

type Props = {
  className?: string;
  motionLevel?: 1 | 2 | 3 | 4 | 5;
};

export default function HeroNebula({ className = '', motionLevel = 2 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let t = 0;
    let running = false;

    function resize() {
      const host = canvas!.parentElement || document.body;
      const cw = host.clientWidth || window.innerWidth;
      const ch = host.clientHeight || window.innerHeight;
      width = cw;
      height = ch;
      canvas!.width = Math.max(1, Math.floor(width * dpr));
      canvas!.height = Math.max(1, Math.floor(height * dpr));
      canvas!.style.width = width + 'px';
      canvas!.style.height = height + 'px';
    }

    function drawFrame() {
      if (!ctx) return;
      const W = canvas!.width;
      const H = canvas!.height;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = '#0b0f24';
      ctx.fillRect(0, 0, W, H);

      const amp = 0.05 + motionLevel * 0.03;
      const glow = 0.3 + motionLevel * 0.1;

      t += 0.0025 * motionLevel; // speed

      const cx1 = 0.3 + Math.sin(t * 0.9) * amp;
      const cy1 = 0.35 + Math.cos(t * 0.8) * amp;
      const cx2 = 0.7 + Math.cos(t * 0.7) * amp;
      const cy2 = 0.6 + Math.sin(t * 1.1) * amp;

      const r1 = Math.max(W, H) * (0.8 + glow);
      const r2 = Math.max(W, H) * (0.9 + glow * 0.7);

      const g1 = ctx.createRadialGradient(cx1 * W, cy1 * H, 0, cx1 * W, cy1 * H, r1);
      g1.addColorStop(0, 'rgba(0, 255, 200, 0.25)');
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(cx2 * W, cy2 * H, 0, cx2 * W, cy2 * H, r2);
      g2.addColorStop(0, 'rgba(180, 0, 255, 0.22)');
      g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      const stars = Math.floor((W * H) / (50000 / motionLevel));
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#9ae6b4';
      for (let i = 0; i < stars; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      drawFrame();
      const targetFps = prefersReduced ? 0 : 45;
      if (targetFps > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      drawFrame();
      if (!prefersReduced) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    function stop() {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement || canvas);
    document.addEventListener('visibilitychange', onVis);

    start();

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [motionLevel]);

  return (
    <div className={'absolute inset-0 pointer-events-none ' + className} aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
