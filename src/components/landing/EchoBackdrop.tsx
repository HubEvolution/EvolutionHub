import { useEffect, useRef, useState } from 'react';

type Props = {
  className?: string;
  intensity?: number; // 0..1 visual intensity
};

export default function EchoBackdrop({ className = '', intensity = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  // Visibility gate
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      setVisible(entries[0]?.isIntersecting ?? false);
    }, { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let t = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let scrollY = window.scrollY;

    function resize() {
      const parent = canvas!.parentElement || document.body;
      width = parent.clientWidth || window.innerWidth;
      height = parent.clientHeight || 400;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.max(1, Math.floor(width * dpr));
      canvas!.height = Math.max(1, Math.floor(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = 'lighter';

      // gentle parallax based on time and scroll; zeroed for reduced motion
      const motionK = prefersReduced ? 0 : 1;
      const ty = (Math.sin(t / 1600) * 10 + (scrollY % 300) * 0.03) * motionK;
      const tx = (Math.cos(t / 2200) * 14) * motionK;

      const alpha = 0.04 + 0.03 * intensity;
      const centers = [
        { x: width * 0.25 + tx * 0.6, y: height * 0.45 + ty * 0.8, c: `rgba(0,255,200,${alpha})` },
        { x: width * 0.68 + tx * -0.4, y: height * 0.52 + ty * 0.5, c: `rgba(180,0,255,${alpha})` },
      ];

      centers.forEach((c, i) => {
        const baseR = Math.min(width, height) * (0.16 + 0.06 * intensity);
        const rings = 5;
        for (let k = 0; k < rings; k++) {
          const wobble = Math.sin(t / 900 + i * 0.7 + k * 0.35) * (6 + 4 * intensity) * (prefersReduced ? 0 : 1);
          const r = baseR + k * (24 + 4 * intensity) + wobble;
          ctx!.beginPath();
          ctx!.arc(c.x, c.y, r, 0, Math.PI * 2);
          (ctx! as CanvasRenderingContext2D).strokeStyle = c.c as any;
          ctx!.lineWidth = Math.max(0.6, 1.6 - k * 0.22);
          ctx!.stroke();
        }
      });

      ctx!.globalCompositeOperation = 'source-over';
    }

    function loop() {
      draw();
      t += 16;
      scrollY = window.scrollY;
      if (!prefersReduced && visible) rafRef.current = requestAnimationFrame(loop);
    }

    resize();
    draw();
    if (!prefersReduced && visible) rafRef.current = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas!.parentElement || canvas!);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [visible]);

  return (
    <div className={"absolute inset-0 pointer-events-none " + className} aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
