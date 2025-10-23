import { useEffect, useRef } from 'react';
import type { LandingBgVariant } from '@/utils/feature-flags';

type Props = {
  className?: string;
  variant?: LandingBgVariant;
};

// Canvas-based global background orchestrator (Dark-only for PR1)
// Variant 'lattice': scanline lattice with subtle bicolor glow
export default function LandingBackground({ className = '', variant = 'lattice' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvasCandidate = canvasRef.current;
    if (!canvasCandidate) return;
    const ctxCandidate = canvasCandidate.getContext('2d');
    if (!ctxCandidate) return;
    // After the guards above, treat these as non-null for all inner closures
    const c: HTMLCanvasElement = canvasCandidate;
    const dctx: CanvasRenderingContext2D = ctxCandidate;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let running = false;
    let t = 0;

    function readVar(name: string, fallback: string): string {
      try {
        const root = c.parentElement || document.documentElement;
        const cs = getComputedStyle(root);
        const v = cs.getPropertyValue(name).trim();
        return v || fallback;
      } catch {
        return fallback;
      }
    }

    // Variant 'techcells': animated hexagonal mesh (wireframe)
    function drawTechcellsFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, phase = 0) {
      const W = canvas.width;
      const H = canvas.height;
      const scale = dpr;

      ctx.clearRect(0, 0, W, H);

      // Colors from CSS vars (Ion-Core)
      const bgTech = parseRGBTriplet(readVar('--bg-tech', '11 13 16'), [11, 13, 16]);
      const gridPrimary = parseRGBTriplet(readVar('--grid-primary', '125 211 252'), [125, 211, 252]);
      const gridAccent = parseRGBTriplet(readVar('--grid-accent', '56 189 248'), [56, 189, 248]);
      const gridAccentWarm = parseRGBTriplet(readVar('--grid-accent-warm', '251 146 60'), [251, 146, 60]);

      // Background fill (carbon black for techcells)
      ctx.fillStyle = `rgb(${bgTech[0]}, ${bgTech[1]}, ${bgTech[2]})`;
      ctx.fillRect(0, 0, W, H);

      // Hex parameters
      const hexSizeCss = 80; // target hex edge length in CSS px (Premium Calm + larger)
      const s = Math.max(8, Math.round((hexSizeCss * scale) * 0.5)); // edge length (pointy-top)
      const sqrt3 = Math.sqrt(3);
      const w = sqrt3 * s;        // hex width
      const h = 2 * s;            // hex height
      const hStep = w;            // column spacing
      const vStep = 1.5 * s;      // row spacing
      const cols = Math.ceil(W / hStep) + 2;
      const rows = Math.ceil(H / vStep) + 2;
      const dashA = Math.max(10, Math.round(s * 1.0));
      const dashB = Math.max(6, Math.round(s * 0.7));
      const dashOffset = -((phase / 28) % (dashA + dashB)); // slightly slower
      const alphaMain = 0.065; // a touch brighter grid
      const alphaAccent = 0.11; // brighter accents
      const accentProb = 0.01; // rarer accent

      // Random per-hex pulses with dual colors
      const period = 3000; // ms (slower pulse cadence)
      const width = 0.18;  // triangular pulse width (fraction of period)
      function pulseFactor(row: number, col: number): { f: number; warm: boolean } {
        // stable pseudo-random per hex
        const v = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
        const r = v - Math.floor(v); // 0..1
        const local = ((phase / period) + r) % 1; // 0..1
        const tri = 1 - Math.abs(local - 0.5) / width; // 1 at center
        return { f: Math.max(0, Math.min(1, tri)), warm: r < 0.5 };
      }

      function drawHex(cx: number, cy: number, row: number, col: number) {
        const pts = [] as Array<{x:number;y:number}>;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i - 90); // pointy-top
          pts.push({ x: cx + s * Math.cos(angle), y: cy + s * Math.sin(angle) });
        }
        // main stroke
        ctx.setLineDash([dashA, dashB]);
        ctx.lineDashOffset = dashOffset;
        ctx.strokeStyle = `rgba(${gridPrimary[0]}, ${gridPrimary[1]}, ${gridPrimary[2]}, ${alphaMain})`;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();

        // pulse overlay if this hex is "on"
        const { f: pf, warm } = pulseFactor(row, col);
        if (pf > 0) {
          const c = warm ? gridAccentWarm : gridAccent;
          const pulseAlpha = Math.min(0.24, alphaAccent + 0.10) * pf; // slightly stronger & brighter
          ctx.setLineDash([]);
          ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${pulseAlpha})`;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.stroke();
        }

        // occasional accent on one edge
        if (Math.random() < accentProb) {
          const i = Math.floor(Math.random() * 6);
          const a = pts[i];
          const b = pts[(i + 1) % 6];
          ctx.setLineDash([]);
          ctx.strokeStyle = `rgba(${gridAccent[0]}, ${gridAccent[1]}, ${gridAccent[2]}, ${alphaAccent})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }

      ctx.save();
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));
      for (let row = -1; row < rows; row++) {
        const cy = row * vStep + 0.5;
        for (let col = -1; col < cols; col++) {
          const cx = col * hStep + (row % 2 ? hStep / 2 : 0) + 0.5;
          if (cx + w < 0 || cx - w > W || cy + h < 0 || cy - h > H) continue;
          drawHex(cx, cy, row, col);
        }
      }
      ctx.restore();

      // Soft top dark gradient for hero readability
      const mask = ctx.createLinearGradient(0, 0, 0, Math.min(H * 0.45, 520 * scale));
      mask.addColorStop(0, 'rgba(0,0,0,0.18)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, W, Math.min(H * 0.45, 520 * scale));
    }
    

    function parseRGBTriplet(v: string, def: [number, number, number]): [number, number, number] {
      // expects "r g b" triplet like "99 255 205"
      const parts = v
        .split(/\s+/)
        .map(Number)
        .filter((n) => Number.isFinite(n));
      if (parts.length >= 3) return [parts[0], parts[1], parts[2]] as [number, number, number];
      return def;
    }

    function resize(target: HTMLCanvasElement) {
      const host = target.parentElement || document.body;
      const cw = host.clientWidth || window.innerWidth;
      const ch = host.clientHeight || window.innerHeight;
      width = cw;
      height = ch;
      target.width = Math.max(1, Math.floor(width * dpr));
      target.height = Math.max(1, Math.floor(height * dpr));
      target.style.width = width + 'px';
      target.style.height = height + 'px';
    }

    function drawLatticeFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, alphaMotion = 1) {
      const W = canvas.width;
      const H = canvas.height;
      const scale = dpr;

      ctx.clearRect(0, 0, W, H);

      // Colors from CSS vars (Ion-Core)
      const accentA = parseRGBTriplet(readVar('--accent-a', '99 255 205'), [99, 255, 205]);
      const accentB = parseRGBTriplet(readVar('--accent-b', '135 76 255'), [135, 76, 255]);
      const bg0 = parseRGBTriplet(readVar('--bg-0', '10 14 28'), [10, 14, 28]);
      const gridLine = parseRGBTriplet(readVar('--grid-line', '180 190 210'), [180, 190, 210]);

      const scanlineAlpha = parseFloat(readVar('--scanline-alpha', '0.04')) || 0.04;
      const grainAlpha = parseFloat(readVar('--grain-alpha', '0.015')) || 0.015;

      // Background fill (Dark)
      ctx.fillStyle = `rgb(${bg0[0]}, ${bg0[1]}, ${bg0[2]})`;
      ctx.fillRect(0, 0, W, H);

      // Grid lines every 32px in CSS pixel space
      const step = Math.max(8, Math.round(32 * scale));
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = `rgb(${gridLine[0]}, ${gridLine[1]}, ${gridLine[2]})`;
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
      }
      for (let y = 0; y <= H; y += step) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
      }
      ctx.stroke();
      ctx.restore();

      // Subtle bicolor glow bands near top area (hero emphasis)
      const glowHeight = Math.min(H * 0.35, 480 * scale);
      const grad = ctx.createLinearGradient(0, 0, 0, glowHeight);
      grad.addColorStop(
        0,
        `rgba(${accentA[0]}, ${accentA[1]}, ${accentA[2]}, ${0.12 * alphaMotion})`
      );
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, glowHeight);

      const grad2 = ctx.createLinearGradient(0, 0, 0, glowHeight * 0.8);
      grad2.addColorStop(
        0,
        `rgba(${accentB[0]}, ${accentB[1]}, ${accentB[2]}, ${0.1 * alphaMotion})`
      );
      grad2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, W, glowHeight * 0.8);

      // Scanlines overlay
      if (scanlineAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = scanlineAlpha;
        ctx.fillStyle = '#000';
        const lineStep = Math.max(2, Math.round(2 * scale));
        for (let y = 0; y < H; y += lineStep) {
          ctx.fillRect(0, y, W, 1);
        }
        ctx.restore();
      }

      // Grain overlay (very light)
      if (grainAlpha > 0) {
        const count = Math.floor((W * H) / (22000 / alphaMotion));
        ctx.save();
        ctx.globalAlpha = grainAlpha;
        ctx.fillStyle = '#fff';
        for (let i = 0; i < count; i++) {
          const x = (Math.random() * W) | 0;
          const y = (Math.random() * H) | 0;
          ctx.fillRect(x, y, 1, 1);
        }
        ctx.restore();
      }
    }

    function drawFrame() {
      const alphaMotion = 1; // reserved for future motion modulation
      if (variant === 'techcells') {
        drawTechcellsFrame(dctx, c, t);
      } else {
        drawLatticeFrame(dctx, c, alphaMotion);
      }
    }

    function loop() {
      drawFrame();
      t += 16;
      rafRef.current = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      resize(c);
      drawFrame();
      // Animate lattice and techcells unless reduced motion
      if (!prefersReduced && (variant === 'lattice' || variant === 'techcells')) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    function stop() {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const ro = new ResizeObserver(() => {
      resize(c);
      drawFrame();
    });
    ro.observe(c.parentElement || c);

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);

    // Start only for lattice variant in PR1; others fallback to same
    if (variant === 'lattice' || variant === 'techcells') start();
    else drawFrame();

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [variant]);

  return (
    <div className={'fixed inset-0 pointer-events-none ' + className} aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
