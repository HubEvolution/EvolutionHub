/*
  Global landing background boot script
  - Mounts a canvas into [data-landing-bg]
  - Reads variant from data-variant (techcells|lattice)
  - Uses CSS variables scoped under .landing-v2
  - CSP-safe (module script, no inline eval)
*/

(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function parseRGBTriplet(v: string, def: [number, number, number]): [number, number, number] {
    const parts = v.split(/\s+/).map(Number).filter((n) => Number.isFinite(n));
    if (parts.length >= 3) return [parts[0], parts[1], parts[2]] as [number, number, number];
    return def;
  }

  function readVar(rootEl: Element | null, name: string, fallback: string): string {
    try {
      const root = (rootEl && (rootEl as HTMLElement)) || document.documentElement;
      const cs = getComputedStyle(root);
      const v = cs.getPropertyValue(name).trim();
      return v || fallback;
    } catch {
      return fallback;
    }
  }

  function findLandingScope(from: HTMLElement | null): HTMLElement | null {
    if (!from) return document.querySelector('.landing-v2');
    const scoped = from.closest('.landing-v2');
    return (scoped as HTMLElement) || document.querySelector('.landing-v2');
  }

  function resizeToViewport(canvas: HTMLCanvasElement) {
    const cw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const ch = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    canvas.width = Math.max(1, Math.floor(cw * dpr));
    canvas.height = Math.max(1, Math.floor(ch * dpr));
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
  }

  function drawLatticeFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scope: HTMLElement | null) {
    const W = canvas.width;
    const H = canvas.height;
    const accentA = parseRGBTriplet(readVar(scope, '--accent-a', '99 255 205'), [99, 255, 205]);
    const accentB = parseRGBTriplet(readVar(scope, '--accent-b', '135 76 255'), [135, 76, 255]);
    const bg0 = parseRGBTriplet(readVar(scope, '--bg-0', '10 14 28'), [10, 14, 28]);
    const gridLine = parseRGBTriplet(readVar(scope, '--grid-line', '180 190 210'), [180, 190, 210]);
    const scanlineAlpha = parseFloat(readVar(scope, '--scanline-alpha', '0.04')) || 0.04;
    const grainAlpha = parseFloat(readVar(scope, '--grain-alpha', '0.015')) || 0.015;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = `rgb(${bg0[0]}, ${bg0[1]}, ${bg0[2]})`;
    ctx.fillRect(0, 0, W, H);

    const step = Math.max(8, Math.round(32 * dpr));
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = `rgb(${gridLine[0]}, ${gridLine[1]}, ${gridLine[2]})`;
    ctx.lineWidth = Math.max(1, Math.round(1 * dpr));
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.restore();

    const glowHeight = Math.min(H * 0.35, 480 * dpr);
    const grad = ctx.createLinearGradient(0, 0, 0, glowHeight);
    grad.addColorStop(0, `rgba(${accentA[0]}, ${accentA[1]}, ${accentA[2]}, ${0.12})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, glowHeight);

    const grad2 = ctx.createLinearGradient(0, 0, 0, glowHeight * 0.8);
    grad2.addColorStop(0, `rgba(${accentB[0]}, ${accentB[1]}, ${accentB[2]}, ${0.10})`);
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, W, glowHeight * 0.8);

    if (grainAlpha > 0) {
      const count = Math.floor((W * H) / 22000);
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

  function drawTechcellsFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scope: HTMLElement | null, phase: number) {
    const W = canvas.width;
    const H = canvas.height;
    const bgTech = parseRGBTriplet(readVar(scope, '--bg-tech', '11 13 16'), [11, 13, 16]);
    const gridPrimary = parseRGBTriplet(readVar(scope, '--grid-primary', '125 211 252'), [125, 211, 252]);
    const gridAccent = parseRGBTriplet(readVar(scope, '--grid-accent', '56 189 248'), [56, 189, 248]);
    const gridAccentWarm = parseRGBTriplet(readVar(scope, '--grid-accent-warm', '251 146 60'), [251, 146, 60]);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = `rgb(${bgTech[0]}, ${bgTech[1]}, ${bgTech[2]})`;
    ctx.fillRect(0, 0, W, H);

    const s = Math.max(8, Math.round(40 * dpr));
    const sqrt3 = Math.sqrt(3);
    const w = sqrt3 * s;
    const h = 2 * s;
    const hStep = w;
    const vStep = 1.5 * s;
    const cols = Math.ceil(W / hStep) + 2;
    const rows = Math.ceil(H / vStep) + 2;

    const dashA = Math.max(10, Math.round(s * 1.0));
    const dashB = Math.max(6, Math.round(s * 0.7));
    const dashOffset = -((phase / 64) % (dashA + dashB));

    const alphaMain = parseFloat(readVar(scope, '--techcells-alpha-main', '0.035')) || 0.035;
    const alphaAccent = parseFloat(readVar(scope, '--techcells-alpha-accent', '0.055')) || 0.055;
    const accentProb = parseFloat(readVar(scope, '--techcells-accent-prob', '0.003')) || 0.003;
    const period = 5200;
    const width = 0.18;

    function pulseFactor(row: number, col: number) {
      const v = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
      const r = v - Math.floor(v);
      const local = ((phase / period) + r) % 1;
      const tri = 1 - Math.abs(local - 0.5) / width;
      return { f: Math.max(0, Math.min(1, tri)), warm: r < 0.5 };
    }

    function drawHex(cx: number, cy: number, row: number, col: number) {
      const pts: Array<{x:number;y:number}> = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 90);
        pts.push({ x: cx + s * Math.cos(angle), y: cy + s * Math.sin(angle) });
      }
      ctx.setLineDash([dashA, dashB]);
      ctx.lineDashOffset = dashOffset;
      ctx.strokeStyle = `rgba(${gridPrimary[0]}, ${gridPrimary[1]}, ${gridPrimary[2]}, ${alphaMain})`;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();

      const { f: pf, warm } = pulseFactor(row, col);
      if (pf > 0) {
        const c = warm ? gridAccentWarm : gridAccent;
        const pulseAlpha = Math.min(0.10, alphaAccent + 0.03) * pf;
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();
      }

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
    ctx.lineWidth = Math.max(1, Math.round(1 * dpr));
    for (let row = -1; row < rows; row++) {
      const cy = row * vStep + 0.5;
      for (let col = -1; col < cols; col++) {
        const cx = col * hStep + (row % 2 ? hStep / 2 : 0) + 0.5;
        if (cx + w < 0 || cx - w > W || cy + h < 0 || cy - h > H) continue;
        drawHex(cx, cy, row, col);
      }
    }
    ctx.restore();

    const mask = ctx.createLinearGradient(0, 0, 0, Math.min(H * 0.45, 520 * dpr));
    const topMaskAlpha = Math.max(0, Math.min(1, parseFloat(readVar(scope, '--techcells-top-mask-alpha', '0.32')) || 0.32));
    mask.addColorStop(0, `rgba(0,0,0,${topMaskAlpha})`);
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, W, Math.min(H * 0.45, 520 * dpr));
  }

  function boot() {
    const container = document.querySelector('[data-landing-bg]') as HTMLElement | null;
    if (!container) return;
    const variant = (container.getAttribute('data-variant') || 'techcells').toLowerCase();

    let canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'w-full h-full block';
      container.appendChild(canvas);
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    const ctx = context as CanvasRenderingContext2D;

    const scope = findLandingScope(container);
    resizeToViewport(canvas);

    (window as any).__bg = { mounted: true, variant };

    let t = 0;
    function drawFrame() {
      if (variant === 'techcells') drawTechcellsFrame(ctx, canvas!, scope, t);
      else drawLatticeFrame(ctx, canvas!, scope);
    }

    function loop() {
      drawFrame();
      t += 16;
      if (!prefersReduced && (variant === 'techcells' || variant === 'lattice')) {
        requestAnimationFrame(loop);
      }
    }

    const onResize = () => { resizeToViewport(canvas!); drawFrame(); };
    window.addEventListener('resize', onResize);

    const onVis = () => { if (!document.hidden) loop(); };
    document.addEventListener('visibilitychange', onVis);

    // initial draw + optional animation
    drawFrame();
    if (!prefersReduced) requestAnimationFrame(loop);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
