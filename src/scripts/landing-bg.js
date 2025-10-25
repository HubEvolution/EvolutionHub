/* Global landing background boot script (plain JS)
   - Mounts a canvas into [data-landing-bg]
   - Reads variant from data-variant (techcells|lattice)
   - Reads CSS variables from nearest .landing-v2 scope
*/
(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function parseRGBTriplet(v, def){
    var parts = String(v).trim().split(/\s+/).map(Number).filter(function(n){return Number.isFinite(n)});
    if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
    return def;
  }
  function readVar(rootEl, name, fallback){
    try {
      var root = (rootEl && rootEl.nodeType === 1 ? rootEl : document.documentElement);
      var cs = getComputedStyle(root);
      var v = cs.getPropertyValue(name).trim();
      return v || fallback;
    } catch { return fallback; }
  }
  function findLandingScope(from){
    if (!from) return document.querySelector('.landing-v2');
    var scoped = from.closest ? from.closest('.landing-v2') : null;
    return scoped || document.querySelector('.landing-v2');
  }
  function resizeToViewport(canvas){
    var cw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    var ch = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    canvas.width = Math.max(1, Math.floor(cw * dpr));
    canvas.height = Math.max(1, Math.floor(ch * dpr));
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
  }
  function drawLatticeFrame(ctx, canvas, scope){
    var W = canvas.width, H = canvas.height;
    var accentA = parseRGBTriplet(readVar(scope, '--accent-a', '99 255 205'), [99,255,205]);
    var accentB = parseRGBTriplet(readVar(scope, '--accent-b', '135 76 255'), [135,76,255]);
    var bg0 = parseRGBTriplet(readVar(scope, '--bg-0', '10 14 28'), [10,14,28]);
    var gridLine = parseRGBTriplet(readVar(scope, '--grid-line', '180 190 210'), [180,190,210]);
    var scanlineAlpha = parseFloat(readVar(scope, '--scanline-alpha', '0.04')) || 0.04;
    var grainAlpha = parseFloat(readVar(scope, '--grain-alpha', '0.015')) || 0.015;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = 'rgb('+bg0[0]+','+bg0[1]+','+bg0[2]+')';
    ctx.fillRect(0,0,W,H);
    var step = Math.max(8, Math.round(32 * dpr));
    ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = 'rgb('+gridLine[0]+','+gridLine[1]+','+gridLine[2]+')'; ctx.lineWidth = Math.max(1, Math.round(1*dpr)); ctx.beginPath();
    for (var x=0; x<=W; x+=step){ ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,H); }
    for (var y=0; y<=H; y+=step){ ctx.moveTo(0,y+0.5); ctx.lineTo(W,y+0.5); }
    ctx.stroke(); ctx.restore();
    var glowHeight = Math.min(H*0.35, 480*dpr);
    var grad = ctx.createLinearGradient(0,0,0,glowHeight);
    grad.addColorStop(0,'rgba('+accentA[0]+','+accentA[1]+','+accentA[2]+',0.12)'); grad.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = grad; ctx.fillRect(0,0,W,glowHeight);
    var grad2 = ctx.createLinearGradient(0,0,0,glowHeight*0.8);
    grad2.addColorStop(0,'rgba('+accentB[0]+','+accentB[1]+','+accentB[2]+',0.10)'); grad2.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = grad2; ctx.fillRect(0,0,W,glowHeight*0.8);
    if (grainAlpha>0){ var count = Math.floor((W*H)/22000); ctx.save(); ctx.globalAlpha = grainAlpha; ctx.fillStyle = '#fff'; for (var i=0;i<count;i++){ var gx=(Math.random()*W)|0, gy=(Math.random()*H)|0; ctx.fillRect(gx,gy,1,1);} ctx.restore(); }
  }
  function drawTechcellsFrame(ctx, canvas, scope, phase){
    var W=canvas.width, H=canvas.height;
    var bgTech = parseRGBTriplet(readVar(scope,'--bg-tech','11 13 16'),[11,13,16]);
    var gridPrimary = parseRGBTriplet(readVar(scope,'--grid-primary','125 211 252'),[125,211,252]);
    var gridAccent = parseRGBTriplet(readVar(scope,'--grid-accent','56 189 248'),[56,189,248]);
    var gridAccentWarm = parseRGBTriplet(readVar(scope,'--grid-accent-warm','251 146 60'),[251,146,60]);
    ctx.clearRect(0,0,W,H); ctx.fillStyle = 'rgb('+bgTech[0]+','+bgTech[1]+','+bgTech[2]+')'; ctx.fillRect(0,0,W,H);
    var s = Math.max(8, Math.round(40 * dpr)); var sqrt3=Math.sqrt(3); var w=sqrt3*s; var h=2*s; var hStep=w; var vStep=1.5*s; var cols=Math.ceil(W/hStep)+2; var rows=Math.ceil(H/vStep)+2;
    var dashA=Math.max(10, Math.round(s*1.0)); var dashB=Math.max(6, Math.round(s*0.7)); var dashOffset=-((phase/28)%(dashA+dashB));
    var alphaMain=parseFloat(readVar(scope,'--techcells-alpha-main','0.065'))||0.065; var alphaAccent=parseFloat(readVar(scope,'--techcells-alpha-accent','0.11'))||0.11; var accentProb=parseFloat(readVar(scope,'--techcells-accent-prob','0.01'))||0.01;
    var period=3000, width=0.18;
    function pulseFactor(row,col){ var v=Math.sin(row*12.9898+col*78.233)*43758.5453; var r=v-Math.floor(v); var local=((phase/period)+r)%1; var tri=1-Math.abs(local-0.5)/width; return {f:Math.max(0,Math.min(1,tri)), warm:r<0.5}; }
    function drawHex(cx,cy,row,col){ var pts=[]; for (var i=0;i<6;i++){ var angle=(Math.PI/180)*(60*i-90); pts.push({x:cx+s*Math.cos(angle), y:cy+s*Math.sin(angle)});} ctx.setLineDash([dashA,dashB]); ctx.lineDashOffset=dashOffset; ctx.strokeStyle='rgba('+gridPrimary[0]+','+gridPrimary[1]+','+gridPrimary[2]+','+alphaMain+')'; ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for (var j=1;j<6;j++) ctx.lineTo(pts[j].x,pts[j].y); ctx.closePath(); ctx.stroke(); var pf=pulseFactor(row,col); if (pf.f>0){ var c= pf.warm?gridAccentWarm:gridAccent; var pulseAlpha=Math.min(0.24, alphaAccent+0.10)*pf.f; ctx.setLineDash([]); ctx.strokeStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+pulseAlpha+')'; ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for (var k=1;k<6;k++) ctx.lineTo(pts[k].x,pts[k].y); ctx.closePath(); ctx.stroke(); } if (Math.random()<accentProb){ var iedge=Math.floor(Math.random()*6); var a=pts[iedge], b=pts[(iedge+1)%6]; ctx.setLineDash([]); ctx.strokeStyle='rgba('+gridAccent[0]+','+gridAccent[1]+','+gridAccent[2]+','+alphaAccent+')'; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } }
    ctx.save(); ctx.lineWidth=Math.max(1, Math.round(1*dpr)); for (var r=-1;r<rows;r++){ var cy=r*vStep+0.5; for (var c=-1;c<cols;c++){ var cx=c*hStep+(r%2?hStep/2:0)+0.5; if (cx+w<0||cx-w>W||cy+h<0||cy-h>H) continue; drawHex(cx,cy,r,c);} } ctx.restore();
    var mask=ctx.createLinearGradient(0,0,0,Math.min(H*0.45,520*dpr)); var topMaskAlpha=Math.max(0, Math.min(1, parseFloat(readVar(scope,'--techcells-top-mask-alpha','0.18'))||0.18)); mask.addColorStop(0,'rgba(0,0,0,'+topMaskAlpha+')'); mask.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=mask; ctx.fillRect(0,0,W,Math.min(H*0.45,520*dpr));
  }
  function boot(){
    var container = document.querySelector('[data-landing-bg]');
    if (!container) return;
    var variant = String(container.getAttribute('data-variant') || 'techcells').toLowerCase();
    var canvas = container.querySelector('canvas');
    if (!canvas){ canvas=document.createElement('canvas'); canvas.className='w-full h-full block'; container.appendChild(canvas); }
    var ctx = canvas.getContext('2d'); if (!ctx) return;
    var scope = findLandingScope(container);
    resizeToViewport(canvas);
    window.__bg = { mounted: true, variant: variant };
    var t = 0;
    function draw(){ if (variant==='techcells') drawTechcellsFrame(ctx, canvas, scope, t); else drawLatticeFrame(ctx, canvas, scope); }
    function loop(){ draw(); t+=16; if (!prefersReduced && (variant==='techcells' || variant==='lattice')) requestAnimationFrame(loop); }
    window.addEventListener('resize', function(){ resizeToViewport(canvas); draw(); });
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) loop(); });
    draw(); if (!prefersReduced) requestAnimationFrame(loop);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
