import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const ROOT = process.cwd();
const FONT_PATH = path.join(ROOT, 'src', 'assets', 'fonts', 'Exo2-Bold.ttf');
const OUT_SVG = path.join(ROOT, 'src', 'assets', 'svg', 'evolutionhub-wordmark-outlined.svg');
const OUT_COMPONENT = path.join(
  ROOT,
  'src',
  'components',
  'brand',
  'EvolutionHubWordmarkOutlined.astro'
);

async function ensureDirs() {
  const dirs = [path.dirname(OUT_SVG), path.dirname(OUT_COMPONENT)];
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function toUpperTracking(text: string) {
  return text.toUpperCase();
}

async function main() {
  if (!fs.existsSync(FONT_PATH)) {
    throw new Error(`Font not found at ${FONT_PATH}. Place Exo2-Bold.ttf there and re-run.`);
  }

  await ensureDirs();

  const font = await opentype.load(FONT_PATH);
  const text = toUpperTracking('Evolution Hub');
  const fontSize = 18; // px
  const trackingPx = 1.5; // letter-spacing

  let penX = 0;
  const penY = 0; // baseline at 0, we'll transform later
  const glyphs = font.stringToGlyphs(text);
  const scale = fontSize / font.unitsPerEm;

  type GlyphInfo = { path: opentype.Path; bbox: opentype.BoundingBox };
  const glyphInfos: GlyphInfo[] = [];

  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const gp = g.getPath(penX, penY, fontSize);
    const bb = gp.getBoundingBox();
    glyphInfos.push({ path: gp, bbox: bb });
    const aw = (g.advanceWidth || 0) * scale;
    penX += aw + trackingPx;
  }

  // Compute word bbox from union
  const bbox = glyphInfos.reduce(
    (acc, gi) => ({
      x1: Math.min(acc.x1, gi.bbox.x1),
      y1: Math.min(acc.y1, gi.bbox.y1),
      x2: Math.max(acc.x2, gi.bbox.x2),
      y2: Math.max(acc.y2, gi.bbox.y2),
    }),
    { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity } as opentype.BoundingBox
  );
  const wordWidth = bbox.x2 - bbox.x1;
  const wordHeight = bbox.y2 - bbox.y1;

  const targetW = 230;
  const targetH = 32;
  const marginW = 0.0; // tight; adjust later if desired
  const marginH = 0.0;
  const s = Math.min((targetW * (1 - marginW)) / wordWidth, (targetH * (1 - marginH)) / wordHeight);

  const centerX = targetW / 2;
  const centerY = targetH / 2;
  const wordCenterX = (bbox.x1 + bbox.x2) / 2;
  const wordCenterY = (bbox.y1 + bbox.y2) / 2;

  const tx = centerX - wordCenterX * s;
  const ty = centerY - wordCenterY * s;

  const chamferPx = 2.0; // subtle bevel
  const glyphDefs: string[] = [];
  const baseLayer: string[] = [];
  const shimmerLayer: string[] = [];

  glyphInfos.forEach((gi, i) => {
    const d = gi.path.toPathData(2);
    // Use glyph-local bbox; group transform will move both path and clip together
    const gx1 = gi.bbox.x1;
    const gy1 = gi.bbox.y1;
    const gx2 = gi.bbox.x2;
    const gy2 = gi.bbox.y2;
    const c = chamferPx; // apply in screen space (post-transform)
    const clipId = `wm_clip_g${i}`;
    // Chamfer top-left and bottom-right corners
    const poly = [
      `${gx1 + c},${gy1}`,
      `${gx2},${gy1}`,
      `${gx2},${gy2 - c}`,
      `${gx2 - c},${gy2}`,
      `${gx1},${gy2}`,
      `${gx1},${gy1 + c}`,
    ].join(' ');
    glyphDefs.push(
      `    <clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><polygon points="${poly}"/></clipPath>`
    );
    baseLayer.push(`    <path d="${d}" fill="url(#wm_unifiedGradient)"/>`);
    shimmerLayer.push(`    <path d="${d}" fill="url(#wm_shimmerGradient)"/>`);
  });

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg width="${targetW}" height="${targetH}" viewBox="0 0 ${targetW} ${targetH}" fill="none" xmlns="http://www.w3.org/2000/svg">\n` +
    `  <defs>\n` +
    `    <linearGradient id="wm_unifiedGradient" x1="0%" y1="100%" x2="100%" y2="0%">\n` +
    `      <stop offset="0%" stop-color="#10b981"/>\n` +
    `      <stop offset="100%" stop-color="#06b6d4"/>\n` +
    `    </linearGradient>\n` +
    `    <linearGradient id="wm_shimmerGradient" x1="0" y1="0" x2="${targetW}" y2="0" gradientUnits="userSpaceOnUse">\n` +
    `      <stop offset="40%" stop-color="#ffffff" stop-opacity="0" />\n` +
    `      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.22" />\n` +
    `      <stop offset="60%" stop-color="#ffffff" stop-opacity="0" />\n` +
    `      <animateTransform attributeName="gradientTransform" type="translate" from="-${targetW} 0" to="${targetW} 0" dur="10s" repeatCount="indefinite" />\n` +
    `    </linearGradient>\n` +
    glyphDefs.join('\n') +
    '\n' +
    `  </defs>\n` +
    `  <g transform="matrix(${s},0,0,${s},${tx},${ty})">\n` +
    baseLayer.join('\n') +
    '\n' +
    `  </g>\n` +
    `  <g aria-hidden="true" id="shimmerText" transform="matrix(${s},0,0,${s},${tx},${ty})">\n` +
    shimmerLayer.join('\n') +
    '\n' +
    `  </g>\n` +
    `  <style>\n` +
    `    @media (prefers-reduced-motion: reduce) {\n` +
    `      #shimmerText { opacity: 0; }\n` +
    `    }\n` +
    `  </style>\n` +
    `</svg>\n`;

  fs.writeFileSync(OUT_SVG, svg, 'utf8');

  const astroComponent =
    `<svg viewBox=\"0 0 ${targetW} ${targetH}\" preserveAspectRatio=\"xMidYMid meet\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" {...Astro.props}>\n  <defs>\n    <linearGradient id=\"wm_unifiedGradient\" x1=\"0%\" y1=\"100%\" x2=\"100%\" y2=\"0%\">\n      <stop offset=\"0%\" stop-color=\"#10b981\"/>\n      <stop offset=\"100%\" stop-color=\"#06b6d4\"/>\n    </linearGradient>\n    <linearGradient id=\"wm_shimmerGradient\" x1=\"0\" y1=\"0\" x2=\"${targetW}\" y2=\"0\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\"40%\" stop-color=\"#ffffff\" stop-opacity=\"0\" />\n      <stop offset=\"50%\" stop-color=\"#ffffff\" stop-opacity=\"0.22\" />\n      <stop offset=\"60%\" stop-color=\"#ffffff\" stop-opacity=\"0\" />\n      <animateTransform attributeName=\"gradientTransform\" type=\"translate\" from=\"-${targetW} 0\" to=\"${targetW} 0\" dur=\"10s\" repeatCount=\"indefinite\" />\n    </linearGradient>\n` +
    glyphDefs.join('') +
    `\n  </defs>\n` +
    `  <g transform=\"matrix(${s},0,0,${s},${tx},${ty})\">` +
    baseLayer.join('') +
    `</g>\n` +
    `  <g aria-hidden=\"true\" id=\"shimmerText\" transform=\"matrix(${s},0,0,${s},${tx},${ty})\">` +
    shimmerLayer.join('') +
    `</g>\n` +
    `  <style>\n    @media (prefers-reduced-motion: reduce) {\n      #shimmerText { opacity: 0; }\n    }\n  </style>\n</svg>\n`;

  fs.writeFileSync(OUT_COMPONENT, astroComponent, 'utf8');

  // eslint-disable-next-line no-console
  console.log('Generated:', OUT_SVG);
  // eslint-disable-next-line no-console
  console.log('Component:', OUT_COMPONENT);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
