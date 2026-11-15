// All artwork is drawn in code: the Paris rooftop arena and the two original fighters.
export const W = 960, H = 540, GROUND = 458;
export const OUT = '#1d1b3a';
export const F = (size) => `900 ${size}px "Arial Rounded MT Bold","Baloo 2","Nunito","Trebuchet MS",Verdana,sans-serif`;

export function txt(ctx, s, x, y, size, { align = 'center', fill = '#fff', stroke = OUT, lw = null } = {}) {
  ctx.font = F(size); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = lw == null ? Math.max(4, size * 0.22) : lw;
  if (stroke) { ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}

export function star(ctx, x, y, r, rot = 0, fill = '#ffd21f', lw = 3) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke(); }
}

export function burst(ctx, x, y, r, rot, fill = '#ffd21f', n = 12) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r * 0.62 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
export { rrect };

function blob(ctx, fill, lw = 4) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
}

// ---------------------------------------------------------------- Arenas (4 places around France)
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const box = (c, x, y, w, h, fill, lw = 3) => { c.fillStyle = fill; c.fillRect(x, y, w, h); if (lw) { c.lineWidth = lw; c.strokeStyle = OUT; c.strokeRect(x, y, w, h); } };

function eiffelPath(c, cx, by, h) {
  const top = by - h;
  c.beginPath();
  c.moveTo(cx - h * 0.3, by);
  c.quadraticCurveTo(cx - h * 0.1, by - h * 0.42, cx - h * 0.03, by - h * 0.86);
  c.lineTo(cx - h * 0.012, top); c.lineTo(cx + h * 0.012, top);
  c.lineTo(cx + h * 0.03, by - h * 0.86);
  c.quadraticCurveTo(cx + h * 0.1, by - h * 0.42, cx + h * 0.3, by);
  c.lineTo(cx + h * 0.2, by);
  c.quadraticCurveTo(cx, by - h * 0.42, cx - h * 0.2, by);
  c.closePath();
}
function eiffel(c, cx, by, h, col = '#6a5f8a') {
  eiffelPath(c, cx, by, h); c.fillStyle = col; c.fill();
  c.save(); eiffelPath(c, cx, by, h); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2;
  for (let i = -40; i < 60; i++) {
    c.beginPath(); c.moveTo(cx - 200 + i * 12, by); c.lineTo(cx + 180 + i * 12, by - 380); c.stroke();
    c.beginPath(); c.moveTo(cx + 200 - i * 12, by); c.lineTo(cx - 180 - i * 12, by - 380); c.stroke();
  }
  c.restore();
  c.fillStyle = '#51476f';
  c.fillRect(cx - h * 0.175, by - h * 0.3, h * 0.35, h * 0.026);
  c.fillRect(cx - h * 0.1, by - h * 0.56, h * 0.2, h * 0.023);
  c.fillRect(cx - h * 0.04, by - h * 0.88, h * 0.08, h * 0.02);
  c.fillRect(cx - 1.5, by - h * 1.07, 3, h * 0.08);
}
function sun(c, x, y, r = 44) {
  const sg = c.createRadialGradient(x, y, 10, x, y, r * 2.8);
  sg.addColorStop(0, 'rgba(255,245,170,.9)'); sg.addColorStop(1, 'rgba(255,245,170,0)');
  c.fillStyle = sg; c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#ffe14d'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#f5b400'; c.stroke();
}
function skyGrad(c, stops) {
  const g = c.createLinearGradient(0, 0, 0, 450);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function tricolour(c, x, y, w = 54, h = 34) {
  ['#2f5fd0', '#ffffff', '#e8372c'].forEach((col, i) => { c.fillStyle = col; c.fillRect(x + (i * w) / 3, y, w / 3, h); });
  c.lineWidth = 3; c.strokeStyle = OUT; c.strokeRect(x, y, w, h);
}

function paris(sky, c) {
  skyGrad(sky, ['#58c4ff', '#a9e4ff', '#ffe9c2']); sun(sky, 170, 150);
  const r = rng(11);
  c.fillStyle = '#c3b6e6';
  for (let x = -10; x < W;) { const w = 36 + r() * 50, h = 110 + r() * 110; c.fillRect(x, 440 - h, w + 1, h); x += w; }
  eiffel(c, 700, 440, 350);
  const walls = ['#fbeed3', '#f6dfc0', '#f4e7dc', '#ffe6cf'];
  for (let x = -30; x < W + 30;) {
    const w = 96 + r() * 70, hh = 80 + r() * 80, y = 440 - hh;
    box(c, x, y, w, hh, walls[Math.floor(r() * walls.length)]);
    for (let k = 0; k < 2; k++) {
      const chx = x + w * (0.2 + k * 0.5);
      box(c, chx, y - 50, 16, 24, '#d9744a');
      c.fillStyle = '#b55a36'; c.fillRect(chx + 3, y - 58, 4, 8); c.fillRect(chx + 9, y - 58, 4, 8);
    }
    c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 10, y - 32); c.lineTo(x + w - 10, y - 32); c.lineTo(x + w + 5, y); c.closePath();
    blob(c, '#6f8db3', 3);
    for (let dx = x + 20; dx < x + w - 26; dx += 36) { box(c, dx, y - 24, 18, 20, '#fbeed3'); c.fillStyle = '#9fd4f5'; c.fillRect(dx + 4, y - 20, 10, 12); }
    for (let wy = y + 14; wy < 440 - 30; wy += 40) {
      for (let wx = x + 14; wx < x + w - 22; wx += 30) {
        box(c, wx, wy, 15, 22, r() < 0.25 ? '#ffe58a' : '#9fd4f5', 2);
        c.beginPath(); c.moveTo(wx - 3, wy + 24); c.lineTo(wx + 18, wy + 24); c.lineWidth = 3; c.stroke();
      }
    }
    x += w + 2;
  }
  const fg = c.createLinearGradient(0, 446, 0, 540);
  fg.addColorStop(0, '#a5bdd6'); fg.addColorStop(1, '#6f8cab');
  c.fillStyle = fg; c.fillRect(0, 446, W, 94);
  c.strokeStyle = 'rgba(30,50,90,.3)'; c.lineWidth = 3;
  for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(480 + i * 62, 450); c.lineTo(480 + i * 112, 540); c.stroke(); }
  box(c, -4, 434, W + 8, 14, '#f3ead9');
  for (const x of [4, 902]) {
    box(c, x, 372, 54, 76, '#d9744a'); box(c, x - 5, 362, 64, 12, '#efe6d6');
    for (const px of [x + 8, x + 32]) box(c, px, 342, 14, 20, '#c7603d');
    c.strokeStyle = 'rgba(29,27,58,.3)'; c.lineWidth = 2;
    for (let yy = 390; yy < 446; yy += 16) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 54, yy); c.stroke(); }
  }
  c.fillStyle = OUT; c.fillRect(926, 268, 5, 96);
  tricolour(c, 872, 270);
}

function bread(c, x, y, kind) {
  if (kind === 0) {            // baguette
    c.save(); c.translate(x, y); c.rotate(-0.12);
    rrect(c, -9, -64, 18, 64, 9); blob(c, '#eeb052', 3);
    c.strokeStyle = '#b8742a'; c.lineWidth = 3;
    for (let i = -52; i < -6; i += 14) { c.beginPath(); c.moveTo(-5, i + 5); c.lineTo(5, i); c.stroke(); }
    c.restore();
  } else if (kind === 1) {     // round loaf
    c.beginPath(); c.ellipse(x, y - 14, 26, 15, 0, 0, 7); blob(c, '#d99a55', 3);
    c.strokeStyle = '#a86a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 10, y - 20); c.lineTo(x + 10, y - 10); c.moveTo(x + 10, y - 20); c.lineTo(x - 10, y - 10); c.stroke();
  } else {                     // little cake
    box(c, x - 16, y - 20, 32, 20, '#ffd9a8'); box(c, x - 18, y - 28, 36, 10, kind === 2 ? '#ff9cc4' : '#fff3d6');
    c.beginPath(); c.arc(x, y - 32, 5, 0, 7); blob(c, '#e8372c', 2);
  }
}
function bakery(sky, c) {
  sky.fillStyle = '#ffe9c9'; sky.fillRect(0, 0, W, H);
  sky.fillStyle = '#ffdcae'; for (let x = 0; x < W; x += 64) sky.fillRect(x, 0, 32, H);
  // window with a view of Paris
  c.save(); c.beginPath(); c.rect(70, 120, 300, 200); c.clip();
  const g = c.createLinearGradient(0, 120, 0, 320); g.addColorStop(0, '#58c4ff'); g.addColorStop(1, '#ffe9c2');
  c.fillStyle = g; c.fillRect(70, 120, 300, 200);
  c.fillStyle = '#c3b6e6'; for (let x = 70; x < 370; x += 34) c.fillRect(x, 270 - ((x * 7) % 40), 35, 80);
  eiffel(c, 280, 322, 170);
  c.restore();
  c.lineWidth = 12; c.strokeStyle = '#fff'; c.strokeRect(70, 120, 300, 200);
  c.lineWidth = 6; c.beginPath(); c.moveTo(220, 120); c.lineTo(220, 320); c.moveTo(70, 220); c.lineTo(370, 220); c.stroke();
  c.lineWidth = 4; c.strokeStyle = OUT; c.strokeRect(63, 113, 314, 214);
  box(c, 52, 324, 336, 14, '#c98a5a');
  // sign
  rrect(c, 520, 124, 320, 52, 14); blob(c, '#7a1f2b');
  txt(c, 'BOULANGERIE', 680, 151, 30, { fill: '#ffd21f', lw: 6 });
  // shelves full of bread
  for (const sy of [262, 340]) {
    box(c, 440, sy, 480, 12, '#a86a2a');
    for (let i = 0; i < 8; i++) bread(c, 470 + i * 60, sy, (i + (sy === 262 ? 0 : 1)) % 2 === 0 ? 0 : 1);
  }
  // lamps
  for (const x of [240, 500, 760]) {
    c.fillStyle = OUT; c.fillRect(x - 1.5, 0, 3, 34);
    c.beginPath(); c.moveTo(x - 26, 56); c.quadraticCurveTo(x, 14, x + 26, 56); c.closePath(); blob(c, '#e8372c', 3);
    c.beginPath(); c.arc(x, 58, 8, 0, 7); blob(c, '#ffe58a', 2);
  }
  // counter with cakes
  box(c, -4, 372, W + 8, 76, '#c98a5a');
  c.strokeStyle = 'rgba(29,27,58,.25)'; c.lineWidth = 2;
  for (let x = 30; x < W; x += 70) { c.beginPath(); c.moveTo(x, 384); c.lineTo(x, 446); c.stroke(); }
  box(c, -4, 360, W + 8, 14, '#fff3d6');
  for (let i = 0; i < 9; i++) bread(c, 60 + i * 105, 360, 2 + (i % 2));
  // checkered floor
  let y = 446;
  [26, 30, 38].forEach((h, row) => {
    const tw = 64 + row * 22;
    for (let i = -10; i < 10; i++) {
      c.fillStyle = (i + row) % 2 === 0 ? '#fff7e6' : '#f2a7a0';
      c.fillRect(480 + i * tw, y, tw + 1, h + 1);
    }
    y += h;
  });
  c.fillStyle = OUT; c.fillRect(0, 445, W, 3);
}

function beach(sky, c) {
  skyGrad(sky, ['#3fb6ff', '#9be0ff', '#e6faff']); sun(sky, 780, 110, 48);
  // sea
  const g = c.createLinearGradient(0, 290, 0, 410); g.addColorStop(0, '#1f8fd8'); g.addColorStop(1, '#7fdcf5');
  c.fillStyle = g; c.fillRect(0, 290, W, 130);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.lineCap = 'round';
  const r = rng(5);
  for (let i = 0; i < 26; i++) { const x = r() * W, y = 300 + r() * 100; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 12, y - 6, x + 24, y); c.stroke(); }
  // hill with the old town of Nice
  c.beginPath(); c.moveTo(-10, 300); c.quadraticCurveTo(140, 150, 330, 250); c.quadraticCurveTo(400, 285, 450, 300); c.closePath(); blob(c, '#6fbf73', 3);
  const cols = ['#ffb38a', '#ffd98a', '#ff9e9e', '#ffe6cf', '#f7c59f'];
  for (let i = 0; i < 9; i++) {
    const x = 10 + i * 42, h = 34 + ((i * 37) % 30), y = 300 - h;
    box(c, x, y, 40, h, cols[i % cols.length], 2.5);
    c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 20, y - 14); c.lineTo(x + 43, y); c.closePath(); blob(c, '#d9744a', 2.5);
    c.fillStyle = '#5a7fb0'; c.fillRect(x + 8, y + 10, 8, 10); c.fillRect(x + 24, y + 10, 8, 10);
  }
  // sailboat
  c.beginPath(); c.moveTo(560, 330); c.lineTo(640, 330); c.lineTo(626, 346); c.lineTo(572, 346); c.closePath(); blob(c, '#e8372c', 3);
  c.beginPath(); c.moveTo(600, 328); c.lineTo(600, 262); c.lineTo(640, 322); c.closePath(); blob(c, '#fff', 3);
  // sand
  const sg = c.createLinearGradient(0, 400, 0, 540); sg.addColorStop(0, '#ffeab5'); sg.addColorStop(1, '#f0c36a');
  c.beginPath(); c.moveTo(0, 412); for (let x = 0; x <= W; x += 40) c.quadraticCurveTo(x + 20, 404, x + 40, 412); c.lineTo(W, H); c.lineTo(0, H); c.closePath();
  c.fillStyle = sg; c.fill(); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke();
  for (let i = 0; i < 90; i++) { c.beginPath(); c.ellipse(r() * W, 440 + r() * 100, 3 + r() * 5, 2 + r() * 3, 0, 0, 7); c.fillStyle = ['#d9d3c7', '#c9b99a', '#fff6dd'][i % 3]; c.fill(); }
  // parasols
  for (const [x, col] of [[610, '#2f7fe6'], [330, '#e8372c']]) {
    c.fillStyle = OUT; c.fillRect(x - 3, 330, 6, 116);
    for (let i = 0; i < 6; i++) {
      c.beginPath(); c.moveTo(x, 338); c.arc(x, 338, 70, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6); c.closePath();
      c.fillStyle = i % 2 ? '#fff' : col; c.fill();
    }
    c.beginPath(); c.arc(x, 338, 70, Math.PI, 0); c.closePath(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
  }
  // palm trees
  for (const [x, lean] of [[70, 26], [892, -26]]) {
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, 452); c.quadraticCurveTo(x + lean * 0.2, 340, x + lean, 228);
    c.strokeStyle = OUT; c.lineWidth = 26; c.stroke(); c.strokeStyle = '#a8703a'; c.lineWidth = 19; c.stroke();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.08 - (i * Math.PI * 0.84) / 6, tx = x + lean + Math.cos(a) * 92, ty = 228 + Math.sin(a) * 60 + 30;
      c.beginPath(); c.moveTo(x + lean, 228); c.quadraticCurveTo(x + lean + Math.cos(a) * 60, 228 + Math.sin(a) * 80, tx, ty);
      c.strokeStyle = OUT; c.lineWidth = 20; c.stroke(); c.strokeStyle = i % 2 ? '#3fae52' : '#58c96a'; c.lineWidth = 13; c.stroke();
    }
  }
  // beach ball
  c.save(); c.translate(770, 432);
  ['#e8372c', '#fff', '#2f7fe6', '#ffd21f'].forEach((col, i) => { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 18, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2); c.closePath(); c.fillStyle = col; c.fill(); });
  c.beginPath(); c.arc(0, 0, 18, 0, 7); c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke();
  c.restore();
}

function castle(sky, c) {
  skyGrad(sky, ['#3b2f7a', '#b96aa8', '#ffb07a', '#ffe0a8']);
  const r = rng(3);
  sky.fillStyle = '#fff';
  for (let i = 0; i < 40; i++) { sky.globalAlpha = 0.4 + r() * 0.6; sky.beginPath(); sky.arc(r() * W, r() * 170, 1 + r() * 1.6, 0, 7); sky.fill(); }
  sky.globalAlpha = 1;
  sky.beginPath(); sky.arc(820, 96, 34, 0, 7); sky.fillStyle = '#fff6d6'; sky.fill();
  // hills
  c.beginPath(); c.moveTo(-10, 400); c.quadraticCurveTo(160, 290, 380, 380); c.quadraticCurveTo(620, 300, 970, 390); c.lineTo(970, 450); c.lineTo(-10, 450); c.closePath(); c.fillStyle = '#4f8f5a'; c.fill();
  const stone = '#ece3d3', roof = '#4f6fa8';
  const tower = (x, w, top, flag) => {
    box(c, x, top, w, 446 - top, stone);
    for (let i = 0; i < 3; i++) box(c, x - 6 + i * ((w + 12 - 18) / 2), top - 14, 18, 16, stone);
    c.beginPath(); c.moveTo(x - 10, top - 14); c.lineTo(x + w / 2, top - 96); c.lineTo(x + w + 10, top - 14); c.closePath(); blob(c, roof, 3);
    c.fillStyle = OUT; c.fillRect(x + w / 2 - 1.5, top - 128, 3, 34);
    c.beginPath(); c.moveTo(x + w / 2 + 2, top - 128); c.lineTo(x + w / 2 + 36, top - 118); c.lineTo(x + w / 2 + 2, top - 108); c.closePath(); blob(c, flag, 2.5);
    for (const wy of [top + 26, top + 86]) { rrect(c, x + w / 2 - 8, wy, 16, 30, 8); blob(c, '#3a2f55', 2.5); }
  };
  tower(430, 100, 190, '#ffd21f');
  box(c, 300, 270, 360, 176, stone);
  for (let x = 296; x < 660; x += 40) box(c, x, 254, 24, 18, stone);
  tower(236, 84, 226, '#e8372c'); tower(640, 84, 226, '#2f7fe6');
  // gate
  c.beginPath(); c.moveTo(436, 446); c.lineTo(436, 372); c.quadraticCurveTo(480, 318, 524, 372); c.lineTo(524, 446); c.closePath(); blob(c, '#8a5a33');
  c.strokeStyle = 'rgba(29,27,58,.5)'; c.lineWidth = 3; for (let x = 452; x < 524; x += 18) { c.beginPath(); c.moveTo(x, 352); c.lineTo(x, 446); c.stroke(); }
  for (const wx of [350, 590]) { rrect(c, wx, 320, 22, 40, 11); blob(c, '#ffe58a', 2.5); }
  // courtyard wall with battlements
  box(c, -4, 384, W + 8, 64, '#d6ccba');
  for (let x = -10; x < W; x += 48) box(c, x, 366, 30, 20, '#d6ccba');
  c.strokeStyle = 'rgba(29,27,58,.22)'; c.lineWidth = 2;
  for (let row = 0; row < 3; row++) for (let x = (row % 2) * 30 - 20; x < W; x += 60) c.strokeRect(x, 388 + row * 20, 60, 20);
  // torches
  for (const x of [150, 810]) {
    c.fillStyle = OUT; c.fillRect(x - 4, 396, 8, 30);
    c.beginPath(); c.moveTo(x, 356); c.quadraticCurveTo(x + 18, 384, x, 398); c.quadraticCurveTo(x - 18, 384, x, 356); blob(c, '#ff8a1f', 3);
    c.beginPath(); c.arc(x, 388, 6, 0, 7); c.fillStyle = '#ffe14d'; c.fill();
  }
  // cobbled courtyard
  const fg = c.createLinearGradient(0, 446, 0, 540); fg.addColorStop(0, '#c2bad2'); fg.addColorStop(1, '#8d86a6');
  c.fillStyle = fg; c.fillRect(0, 446, W, 94);
  c.strokeStyle = 'rgba(29,27,58,.28)'; c.lineWidth = 2.5;
  let y = 446;
  [22, 30, 42].forEach((h, row) => { for (let x = (row % 2) * 40 - 60; x < W; x += 80 + row * 14) { rrect(c, x, y + 2, 76 + row * 14, h - 2, 8); c.stroke(); } y += h; });
  c.fillStyle = OUT; c.fillRect(0, 445, W, 3);
}

const BUILD = { paris, bakery, beach, castle };
const CLOUDY = { paris: 0.92, beach: 0.95, castle: 0.35 };
const built = {};
const CLOUDS = [[80, 70, 1], [380, 110, 0.8], [640, 50, 1.2], [860, 130, 0.7]];
export function drawArena(ctx, time, id = 'paris') {
  let a = built[id];
  if (!a) {
    a = built[id] = { sky: mkc(W * 2, H * 2), fore: mkc(W * 2, H * 2) };
    const s = a.sky.getContext('2d'), f = a.fore.getContext('2d');
    s.scale(2, 2); f.scale(2, 2);
    BUILD[id](s, f);
  }
  ctx.drawImage(a.sky, 0, 0, W, H);
  if (CLOUDY[id]) {
    ctx.fillStyle = `rgba(255,255,255,${CLOUDY[id]})`;
    for (const [x0, y, s] of CLOUDS) {
      const x = ((x0 + time * 9 * s) % (W + 240)) - 120;
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, 7); ctx.arc(x + 32 * s, y - 12 * s, 32 * s, 0, 7); ctx.arc(x + 68 * s, y, 24 * s, 0, 7);
      ctx.rect(x, y, 68 * s, 22 * s);
      ctx.fill();
    }
  }
  ctx.drawImage(a.fore, 0, 0, W, H);
}

// ---------------------------------------------------------------- Fighters (8 original characters, 3 costumes each)
function limb(ctx, a, b, w, col) {
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 7; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
const grad = (ctx, y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
function moustache(ctx, x, y, w, col, lw = 5) {
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - w * 0.6, y + 7, x - w, y - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 0.6, y + 7, x + w, y - 2); ctx.stroke();
}
// costume = [body, shade, dark, accent, extra, limb, glove, leg, shoe]
const pal = (name, a) => ({ name, body: a[0], shade: a[1], dark: a[2], accent: a[3], extra: a[4], limb: a[5], glove: a[6], leg: a[7], shoe: a[8] });

const croissant = {
  id: 'croissant', name: 'Capitaine Croissant', tag: 'The flaky hero of the bakery!', iris: '#3a2a1a',
  cy: -84, eyes: [[6, -12], [30, -12]], mouth: [19, 20], head: -150,
  costumes: [
    pal('Classic', ['#ffdc90', '#eba23c', '#c9812a', '#e8372c', '#27407a', '#e39a35', '#ffffff', '#27407a', '#e8372c']),
    pal('Chocolat', ['#c98a5a', '#8a5230', '#5e3620', '#ffd21f', '#7a1f2b', '#8a5230', '#ffffff', '#5e3620', '#ffd21f']),
    pal('Pistache', ['#d9f0a8', '#8fc25a', '#5f9440', '#ff6fb1', '#2f7f6a', '#8fc25a', '#ffffff', '#2f7f6a', '#ff6fb1']),
  ],
  draw(ctx, cy, t, p) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 28, cy - 26);
      ctx.quadraticCurveTo(s * 80, cy - 10, s * 68, cy + 40);
      ctx.quadraticCurveTo(s * 50, cy + 26, s * 26, cy + 32); ctx.closePath();
      blob(ctx, p.shade);
    }
    ctx.beginPath(); ctx.ellipse(0, cy, 50, 45, 0, 0, 7); blob(ctx, grad(ctx, cy - 46, cy + 46, p.body, p.shade));
    ctx.strokeStyle = p.dark; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const x of [-38, -24, 45]) { ctx.beginPath(); ctx.moveTo(x, cy - 24); ctx.quadraticCurveTo(x - 7, cy + 2, x, cy + 28); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-22, cy + 34); ctx.lineTo(30, cy + 34); ctx.lineTo(6, cy + 52); ctx.closePath(); blob(ctx, p.accent, 3);
  },
  over(ctx, cy, t, p) {
    moustache(ctx, 19, cy + 5, 17, '#6b3d14');
    ctx.beginPath(); ctx.ellipse(2, cy - 46, 38, 24, 0, Math.PI, 0); ctx.closePath(); blob(ctx, '#ffffff');
    rrect(ctx, -36, cy - 50, 76, 13, 4); blob(ctx, p.extra, 3);
    ctx.beginPath(); ctx.moveTo(6, cy - 38); ctx.quadraticCurveTo(44, cy - 42, 60, cy - 30); ctx.quadraticCurveTo(34, cy - 32, 6, cy - 34); ctx.closePath(); blob(ctx, OUT, 3);
    star(ctx, 8, cy - 58, 8, 0, '#ffd21f', 2);
  },
};

const chat = {
  id: 'chat', name: 'Le Chat Ninja', tag: 'Quiet paws, super-fast kicks!', iris: '#2fae4e',
  cy: -68, eyes: [[6, -42], [30, -42]], mouth: [20, -15], head: -168,
  costumes: [
    pal('Classic', ['#b9bcd3', '#2b2d5e', '', '#e8372c', '#f1f2f9', '#2b2d5e', '#d5d8ea', '#2b2d5e', '#d5d8ea']),
    pal('Tigre', ['#ffb25a', '#2a2a33', '', '#35b34a', '#fff1dc', '#2a2a33', '#ffd9a8', '#2a2a33', '#ffd9a8']),
    pal('Neige', ['#f6f6fc', '#7a2f8a', '', '#ffd21f', '#ffffff', '#7a2f8a', '#ffffff', '#7a2f8a', '#ffffff']),
  ],
  back(ctx, cy, t, p) {
    const w = Math.sin(t * 4) * 10;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, cy + 34); ctx.quadraticCurveTo(-64, cy + 34, -60, cy - 14 + w);
    ctx.strokeStyle = OUT; ctx.lineWidth = 19; ctx.stroke();
    ctx.strokeStyle = p.body; ctx.lineWidth = 12; ctx.stroke();
  },
  draw(ctx, cy, t, p) {
    ctx.beginPath(); ctx.ellipse(0, cy + 14, 29, 32, 0, 0, 7); blob(ctx, p.shade);
    ctx.beginPath(); ctx.moveTo(-28, cy + 20); ctx.quadraticCurveTo(0, cy + 28, 28, cy + 20);
    ctx.strokeStyle = p.accent; ctx.lineWidth = 7; ctx.stroke();
    for (const [a, b, c2] of [[[-28, cy - 52], [-24, cy - 92], [0, cy - 70]], [[10, cy - 72], [32, cy - 94], [40, cy - 56]]]) {
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.closePath(); blob(ctx, p.body);
    }
    ctx.beginPath(); ctx.arc(4, cy - 38, 39, 0, 7); blob(ctx, p.body);
    ctx.beginPath(); ctx.ellipse(19, cy - 22, 19, 13, 0, 0, 7); ctx.fillStyle = p.extra; ctx.fill();
  },
  over(ctx, cy, t, p) {
    ctx.save();
    ctx.beginPath(); ctx.arc(4, cy - 38, 37, 0, 7); ctx.clip();
    ctx.fillStyle = p.accent; ctx.fillRect(-40, cy - 64, 90, 13);
    ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-40, cy - 64); ctx.lineTo(50, cy - 64); ctx.moveTo(-40, cy - 51); ctx.lineTo(50, cy - 51); ctx.stroke();
    ctx.restore();
    const w = Math.sin(t * 7) * 6;
    limb(ctx, [-31, cy - 56], [-58, cy - 50 + w], 5, p.accent);
    limb(ctx, [-31, cy - 58], [-56, cy - 70 - w], 5, p.accent);
    ctx.beginPath(); ctx.moveTo(15, cy - 30); ctx.lineTo(25, cy - 30); ctx.lineTo(20, cy - 24); ctx.closePath(); blob(ctx, '#ff8fb0', 2);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2] of [[34, -22, 56, -27], [34, -18, 56, -16], [4, -22, -16, -27], [4, -18, -16, -16]]) {
      ctx.beginPath(); ctx.moveTo(x1, cy + y1); ctx.lineTo(x2, cy + y2); ctx.stroke();
    }
  },
};

const robo = {
  id: 'robo', name: 'Robo-Baguette', tag: 'Beep boop! Freshly baked power!', iris: '#2f7fe6',
  cy: -84, eyes: [[2, -40], [24, -40]], mouth: [13, -12], head: -180,
  costumes: [
    pal('Classic', ['#f9cf7c', '#e09a3a', '#b8742a', '#e8372c', '#dff6ff', '#9aa7b8', '#e8372c', '#9aa7b8', '#5c6b80']),
    pal('Chrome', ['#e3e8f1', '#9aa7b8', '#6b788c', '#35b34a', '#c8f7d4', '#6b788c', '#35b34a', '#6b788c', '#3d4757']),
    pal('Seigle', ['#b9794a', '#8a5230', '#5e3620', '#ffd21f', '#fff3c9', '#c9b99a', '#ffd21f', '#c9b99a', '#8a7a5a']),
  ],
  draw(ctx, cy, t, p) {
    for (const s of [-1, 1]) { rrect(ctx, s * 31 - 6, cy - 50, 12, 20, 4); blob(ctx, p.limb, 3); }
    rrect(ctx, -28, cy - 68, 56, 126, 28); blob(ctx, grad(ctx, cy - 68, cy + 58, p.body, p.shade));
    ctx.strokeStyle = p.dark; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const y of [cy + 6, cy + 24, cy + 42]) { ctx.beginPath(); ctx.moveTo(-13, y + 6); ctx.lineTo(13, y - 6); ctx.stroke(); }
    rrect(ctx, -17, cy - 58, 54, 36, 12); blob(ctx, p.extra, 3);
  },
  over(ctx, cy, t, p) {
    ctx.fillStyle = OUT; ctx.fillRect(-2, cy - 90, 4, 24);
    ctx.beginPath(); ctx.arc(0, cy - 94, 8, 0, 7); blob(ctx, Math.sin(t * 6) > 0 ? p.accent : '#fff', 3);
  },
};

const coq = {
  id: 'coq', name: 'Coco le Coq', tag: 'Cocorico! Up with the sun!', iris: '#3a2a1a',
  cy: -80, eyes: [[8, -24], [28, -24]], mouth: null, head: -150,
  costumes: [
    pal('Classic', ['#fff8ea', '#2f5fd0', '#ffffff', '#e8372c', '#ffb81f', '#f1dfbf', '#fff8ea', '#ffb81f', '#ff8a1f']),
    pal('Doré', ['#ffcf5a', '#35b34a', '#ffd21f', '#e8372c', '#ff8a1f', '#f0b429', '#ffe9a8', '#ff8a1f', '#d9601a']),
    pal('Nuit', ['#4a4f86', '#8e4fd6', '#ff6fb1', '#ffd21f', '#ffb81f', '#3a3f6a', '#6a70aa', '#ffb81f', '#ff8a1f']),
  ],
  back(ctx, cy, t, p) {
    const w = Math.sin(t * 3) * 0.08;
    [[p.shade, -0.5], [p.dark, -0.95], [p.accent, -1.4]].forEach(([col, a]) => {
      ctx.save(); ctx.translate(-30, cy + 14); ctx.rotate(a + w - Math.PI / 2);
      ctx.beginPath(); ctx.ellipse(0, -42, 13, 42, 0, 0, 7); blob(ctx, col, 3.5); ctx.restore();
    });
  },
  draw(ctx, cy, t, p) {
    for (const [x, y] of [[4, -54], [17, -60], [30, -53]]) { ctx.beginPath(); ctx.arc(x, cy + y, 10, 0, 7); blob(ctx, p.accent, 3.5); }
    ctx.beginPath(); ctx.ellipse(0, cy, 45, 49, 0, 0, 7); blob(ctx, grad(ctx, cy - 49, cy + 49, p.body, p.limb));
    ctx.beginPath(); ctx.arc(-10, cy + 12, 22, 0.3, 2.2); ctx.strokeStyle = 'rgba(29,27,58,.25)'; ctx.lineWidth = 4; ctx.stroke();
  },
  over(ctx, cy, t, p) {
    ctx.beginPath(); ctx.ellipse(40, cy + 6, 7, 11, 0, 0, 7); blob(ctx, p.accent, 3);
    ctx.beginPath(); ctx.moveTo(36, cy - 20); ctx.lineTo(66, cy - 10); ctx.lineTo(36, cy - 1); ctx.closePath(); blob(ctx, p.extra, 3.5);
  },
};

const macaron = {
  id: 'macaron', name: 'Madame Macaron', tag: 'Sweet, but she packs a punch!', iris: '#7a3b8a',
  cy: -76, eyes: [[6, -24], [30, -24]], mouth: [18, -6], head: -140,
  costumes: [
    pal('Framboise', ['#ffb0d0', '#f06aa0', '', '#8e4fd6', '#fff3d6', '#f06aa0', '#ffffff', '#8e4fd6', '#5e2f9a']),
    pal('Pistache', ['#cdeeae', '#86c46a', '', '#ff6fb1', '#fff3d6', '#86c46a', '#ffffff', '#3f8f52', '#2f6f42']),
    pal('Citron', ['#fff09a', '#f2c531', '', '#2f7fe6', '#ffffff', '#f2c531', '#ffffff', '#2f7fe6', '#1f4fa6']),
  ],
  draw(ctx, cy, t, p) {
    ctx.beginPath(); ctx.ellipse(0, cy + 28, 50, 24, 0, 0, 7); blob(ctx, p.shade);
    rrect(ctx, -47, cy - 8, 94, 28, 14); blob(ctx, p.extra);
    ctx.beginPath(); ctx.ellipse(0, cy - 22, 53, 33, 0, 0, 7); blob(ctx, grad(ctx, cy - 55, cy + 10, p.body, p.shade));
    ctx.beginPath(); ctx.arc(-6, cy - 24, 40, 3.5, 4.5); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
  },
  over(ctx, cy, t, p) {
    ctx.fillStyle = 'rgba(255,60,110,.3)';
    for (const x of [-6, 42]) { ctx.beginPath(); ctx.arc(x, cy - 10, 7, 0, 7); ctx.fill(); }
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const x of [-4, 40]) { const s = x < 0 ? -1 : 1; ctx.beginPath(); ctx.moveTo(x, cy - 30); ctx.lineTo(x + s * 7, cy - 36); ctx.stroke(); }
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(2, cy - 56); ctx.lineTo(2 + s * 28, cy - 74); ctx.lineTo(2 + s * 28, cy - 44); ctx.closePath(); blob(ctx, p.accent, 3.5); }
    ctx.beginPath(); ctx.arc(2, cy - 57, 8, 0, 7); blob(ctx, p.accent, 3.5);
  },
};

const fromage = {
  id: 'fromage', name: 'Monsieur Fromage', tag: 'Holey moley, what a wedge!', iris: '#3a2a1a',
  cy: -80, eyes: [[8, -10], [32, -10]], mouth: [20, 18], head: -150,
  costumes: [
    pal('Emmental', ['#ffe07a', '#f0b429', '#e0a21a', '#2b2d5e', '', '#f0b429', '#ffffff', '#3a3a4a', '#1d1b3a']),
    pal('Roquefort', ['#f6f4e6', '#d9d6c0', '#6f9fc9', '#35b34a', '', '#d9d6c0', '#ffffff', '#4a6a8a', '#2b3d55']),
    pal('Mimolette', ['#ffab52', '#e0701f', '#c85a12', '#7a1f2b', '', '#e0701f', '#ffffff', '#5e3620', '#3a2010']),
  ],
  draw(ctx, cy, t, p) {
    ctx.beginPath(); ctx.moveTo(-50, cy + 44); ctx.lineTo(50, cy + 44); ctx.lineTo(54, cy - 30);
    ctx.quadraticCurveTo(20, cy - 62, -20, cy - 40); ctx.quadraticCurveTo(-56, cy - 16, -50, cy + 44); ctx.closePath();
    blob(ctx, grad(ctx, cy - 60, cy + 44, p.body, p.shade));
    for (const [x, y, r] of [[-26, 22, 10], [34, 30, 7], [-8, -30, 7], [-36, -8, 5], [2, 32, 5]]) {
      ctx.beginPath(); ctx.arc(x, cy + y, r, 0, 7); ctx.fillStyle = p.dark; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(29,27,58,.45)'; ctx.stroke();
    }
  },
  over(ctx, cy, t, p) {
    moustache(ctx, 20, cy + 6, 16, OUT, 4);
    ctx.save(); ctx.translate(8, cy - 50); ctx.rotate(-0.16);
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 14, 0, 0, 7); blob(ctx, p.accent);
    ctx.fillStyle = OUT; ctx.fillRect(-2, -22, 4, 10); ctx.restore();
  },
};

const escargot = {
  id: 'escargot', name: 'Chevalier Escargot', tag: 'Slow and steady wins the fight!', iris: '#3a5a1a',
  cy: -72, eyes: [[16, -34], [36, -34]], mouth: [27, -14], head: -150,
  costumes: [
    pal('Classic', ['#d9a06a', '#e8372c', '#8a5a33', '#d7dde8', '#b7e08a', '#b7e08a', '#d7dde8', '#9aa7b8', '#6b788c']),
    pal('Or', ['#ffe07a', '#8e4fd6', '#c99a00', '#fff3c9', '#c9ecf5', '#c9ecf5', '#fff3c9', '#e0b93a', '#b8902a']),
    pal('Royal', ['#7fa8ee', '#ffd21f', '#2f4f9a', '#3a3f6a', '#ffd9c2', '#ffd9c2', '#5a6090', '#3a3f6a', '#23264a']),
  ],
  draw(ctx, cy, t, p) {
    ctx.beginPath(); ctx.arc(-16, cy + 8, 47, 0, 7); blob(ctx, p.body);
    ctx.beginPath(); ctx.strokeStyle = p.dark; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let a = 0; a < 13; a += 0.3) ctx.lineTo(-16 + Math.cos(a) * a * 3, cy + 8 + Math.sin(a) * a * 3);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(26, cy - 30, 25, 35, 0, 0, 7); blob(ctx, p.extra);
  },
  over(ctx, cy, t, p) {
    limb(ctx, [24, cy - 70], [-10, cy - 92 + Math.sin(t * 5) * 3], 9, p.shade);
    ctx.beginPath(); ctx.ellipse(26, cy - 48, 28, 24, 0, Math.PI, 0); ctx.closePath(); blob(ctx, p.accent);
    rrect(ctx, -4, cy - 52, 60, 8, 4); blob(ctx, p.accent, 3);
  },
};

const roi = {
  id: 'roi', name: 'Roi Gâteau', tag: 'The king of the tower. Yum!', iris: '#5e3620', scale: 1.12,
  cy: -80, eyes: [[4, -30], [28, -30]], mouth: [16, -6], head: -182,
  costumes: [
    pal('Fraise', ['#f9d49a', '#d99a55', '#e8372c', '#ffd21f', '#ff9cc4', '#d99a55', '#ffffff', '#7a3b2e', '#ffd21f']),
    pal('Chocolat', ['#9a5f38', '#6b3d1f', '#ffd21f', '#ffd21f', '#fff3d6', '#6b3d1f', '#ffffff', '#3a2010', '#e8372c']),
    pal('Menthe', ['#fff3d6', '#e0cfa0', '#8e4fd6', '#ffd21f', '#9be3c0', '#e0cfa0', '#ffffff', '#2f7f6a', '#ffd21f']),
  ],
  draw(ctx, cy, t, p) {
    const layer = (x, y, w, h, drips) => {
      rrect(ctx, x, y, w, h, 14); blob(ctx, grad(ctx, y, y + h, p.body, p.shade));
      ctx.beginPath(); ctx.moveTo(x + 2, y + 12);
      const step = (w - 4) / drips;
      for (let i = 0; i < drips; i++) ctx.quadraticCurveTo(x + 2 + step * (i + 0.5), y + (i % 2 ? 22 : 32), x + 2 + step * (i + 1), y + 12);
      ctx.lineTo(x + w - 2, y + 8); ctx.quadraticCurveTo(x + w / 2, y - 4, x + 2, y + 8); ctx.closePath(); blob(ctx, p.extra, 3);
    };
    layer(-56, cy - 2, 112, 56, 6);
    ['#e8372c', '#2f7fe6', '#ffd21f', '#35b34a', '#8e4fd6'].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(-40 + i * 19, cy + 36 + (i % 2) * 6, 8, 4); });
    layer(-41, cy - 58, 82, 60, 4);
  },
  over(ctx, cy, t, p) {
    moustache(ctx, 16, cy - 16, 20, '#5e3620', 6);
    ctx.beginPath(); ctx.moveTo(-28, cy - 56);
    for (const [x, y] of [[-32, -88], [-15, -72], [0, -96], [15, -72], [32, -88], [28, -56]]) ctx.lineTo(x, cy + y);
    ctx.closePath(); blob(ctx, p.accent);
    for (const [x, y, col] of [[0, -66, p.dark], [-18, -64, '#2f7fe6'], [18, -64, '#2f7fe6']]) { ctx.beginPath(); ctx.arc(x, cy + y, 4.5, 0, 7); blob(ctx, col, 2); }
  },
};

export const CHARS = { croissant, chat, robo, coq, macaron, fromage, escargot, roi };

const ATKDUR = { punch: 0.3, kick: 0.44 };
function poseOf(f, time) {
  const P = { bodyY: Math.sin(time * 5 + (f.seed || 0)) * 2.5, hop: 0, lean: 0, hF: [46, -10], hB: [16, -2], fF: [22, 0], fB: [-20, 0], eyes: 'normal', mouth: 'smile', shield: false, stars: false, big: false };
  // hand positions are relative to the body centre (cy); feet are relative to the ground
  if (f.atk) {
    const p = Math.min(1, f.atk.t / ATKDUR[f.atk.type]);
    const ext = Math.sin(Math.min(1, p * 1.2) * Math.PI);
    P.mouth = 'open'; P.big = !!f.atk.finisher;
    if (f.atk.type === 'punch') { P.hF = [46 + ext * 66, -14]; P.hB = [6, 2]; P.lean = 0.14 * ext; }
    else { P.fF = [24 + ext * 84, -6 - ext * 56]; P.lean = -0.2 * ext; P.hF = [30, -22]; P.hB = [-14, 6]; }
  } else if (f.state === 'hurt') {
    P.lean = -0.28; P.eyes = 'hurt'; P.mouth = 'o'; P.hF = [34, -42]; P.hB = [-34, -34];
  } else if (f.state === 'dizzy') {
    P.bodyY = f.air ? 0 : 36; P.lean = f.air ? -0.5 : Math.sin(time * 3) * 0.07;
    P.fF = [56, -4]; P.fB = [40, -2]; P.hF = [40, 34]; P.hB = [-40, 34];
    P.eyes = 'dizzy'; P.mouth = 'wobble'; P.stars = true;
  } else if (f.state === 'win') {
    P.hop = -Math.abs(Math.sin(time * 7)) * 28;
    P.hF = [44, -66]; P.hB = [-44, -66]; P.eyes = 'happy'; P.mouth = 'open';
  } else if (f.state === 'super') {
    P.hF = [78, -16]; P.hB = [60, 6]; P.lean = 0.1; P.mouth = 'open'; P.big = true;
  } else if (f.blocking) {
    P.hF = [42, -26]; P.hB = [46, 4]; P.shield = true; P.lean = -0.05;
  } else if (f.air) {
    P.fF = [26, -20]; P.fB = [-18, -10]; P.hF = [42, -46]; P.hB = [-32, -38];
  } else if (Math.abs(f.vx) > 10) {
    const w = Math.sin(time * 16);
    P.fF = [22 + w * 16, -Math.max(0, w) * 10]; P.fB = [-20 - w * 16, -Math.max(0, -w) * 10];
    P.lean = 0.06 * Math.sign(f.vx * f.face);
  }
  return P;
}

function drawFace(ctx, c, cy, P, time) {
  const blink = P.eyes === 'normal' && (time + (c.id === 'chat' ? 1.3 : 0)) % 3.4 < 0.12;
  ctx.lineCap = 'round';
  c.eyes.forEach(([ex, ey0], i) => {
    const ey = cy + ey0;
    if (P.eyes === 'normal' && !blink) {
      ctx.beginPath(); ctx.ellipse(ex, ey, 9, 11, 0, 0, 7); blob(ctx, '#fff', 3);
      ctx.beginPath(); ctx.arc(ex + 3, ey + 1, 5.5, 0, 7); ctx.fillStyle = c.iris; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 3.5, ey + 1, 3, 0, 7); ctx.fillStyle = '#111'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 1, ey - 3, 2, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    } else {
      ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath();
      if (blink) { ctx.moveTo(ex - 8, ey); ctx.lineTo(ex + 8, ey); }
      else if (P.eyes === 'hurt') { const s = i ? -1 : 1; ctx.moveTo(ex - 7 * s, ey - 7); ctx.lineTo(ex + 6 * s, ey); ctx.lineTo(ex - 7 * s, ey + 7); }
      else if (P.eyes === 'happy') { ctx.arc(ex, ey + 4, 8, Math.PI, 0); }
      else { ctx.lineWidth = 3; for (let a = 0; a < 12; a += 0.5) { const r = a * 0.9; ctx.lineTo(ex + Math.cos(a + time * 9) * r, ey + Math.sin(a + time * 9) * r); } }
      ctx.stroke();
    }
  });
  if (!c.mouth) return;
  const mx = c.mouth[0], my = cy + c.mouth[1];
  ctx.strokeStyle = OUT; ctx.lineWidth = 3.5;
  if (P.mouth === 'smile') { ctx.beginPath(); ctx.arc(mx, my - 6, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  else if (P.mouth === 'open') {
    ctx.beginPath(); ctx.ellipse(mx, my, 9, 8, 0, 0, 7); blob(ctx, '#7a1f2b', 3);
    ctx.beginPath(); ctx.ellipse(mx, my + 4, 5, 3, 0, 0, 7); ctx.fillStyle = '#ff7b8a'; ctx.fill();
  } else if (P.mouth === 'o') { ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); blob(ctx, '#7a1f2b', 3); }
  else { ctx.beginPath(); ctx.moveTo(mx - 10, my); ctx.quadraticCurveTo(mx - 5, my - 6, mx, my); ctx.quadraticCurveTo(mx + 5, my + 6, mx + 10, my); ctx.stroke(); }
}

export function drawFighter(ctx, f, time) {
  const c = f.char, p = f.pal || c.costumes[0], P = poseOf(f, time), sc = c.scale || 1;
  ctx.save();
  ctx.translate(f.x, f.y + P.hop);
  ctx.scale(f.face * sc, sc);
  ctx.rotate(P.lean);
  const cy = c.cy + P.bodyY;
  const at = (q) => [q[0], cy + q[1]];
  const shoe = (q) => { ctx.beginPath(); ctx.ellipse(q[0] + 5, q[1] - 7, 15, 9, 0, 0, 7); blob(ctx, p.shoe, 3.5); };
  const glove = (q0, big) => {
    const q = at(q0);
    if (big) burst(ctx, q[0], q[1], 26, time * 10, '#ffd21f', 8);
    ctx.beginPath(); ctx.arc(q[0], q[1], big ? 15 : 12, 0, 7); blob(ctx, p.glove, 3.5);
  };
  const hipY = cy + 34;
  limb(ctx, [-14, hipY], [P.fB[0], P.fB[1] - 8], 13, p.leg); shoe(P.fB);
  limb(ctx, [-18, cy - 6], at(P.hB), 12, p.limb); glove(P.hB, false);
  if (c.back) c.back(ctx, cy, time, p);
  limb(ctx, [16, hipY], [P.fF[0], P.fF[1] - 8], 13, p.leg);
  if (P.big && f.atk && f.atk.type === 'kick') burst(ctx, P.fF[0] + 5, P.fF[1] - 7, 28, time * 10, '#ffd21f', 8);
  shoe(P.fF);
  c.draw(ctx, cy, time, p);
  drawFace(ctx, c, cy, P, time);
  c.over(ctx, cy, time, p);
  limb(ctx, [26, cy - 4], at(P.hF), 12, p.limb); glove(P.hF, P.big && (!f.atk || f.atk.type === 'punch'));
  if (P.shield) {
    ctx.beginPath(); ctx.arc(18, cy - 6, 76, -1.05, 1.05);
    ctx.strokeStyle = 'rgba(120,220,255,.85)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
  if (P.stars) {
    const hy = f.y + (c.head + (f.air ? 0 : 36)) * sc - 6;
    for (let i = 0; i < 4; i++) {
      const a = time * 4 + (i * Math.PI) / 2;
      star(ctx, f.x + Math.cos(a) * 46, hy + Math.sin(a) * 12, 11, a, i % 2 ? '#ffd21f' : '#fff', 3);
    }
  }
}
