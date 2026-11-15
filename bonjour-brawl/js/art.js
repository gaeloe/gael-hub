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

// ---------------------------------------------------------------- Arena
let skyC = null, cityC = null;
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

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

function buildArena() {
  const S = 2;
  skyC = mkc(W * S, H * S);
  let c = skyC.getContext('2d'); c.scale(S, S);
  const g = c.createLinearGradient(0, 0, 0, 450);
  g.addColorStop(0, '#58c4ff'); g.addColorStop(0.6, '#a9e4ff'); g.addColorStop(1, '#ffe9c2');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const sg = c.createRadialGradient(170, 150, 10, 170, 150, 120);
  sg.addColorStop(0, 'rgba(255,245,170,.9)'); sg.addColorStop(1, 'rgba(255,245,170,0)');
  c.fillStyle = sg; c.fillRect(0, 0, 400, 400);
  c.beginPath(); c.arc(170, 150, 44, 0, 7); c.fillStyle = '#ffe14d'; c.fill();
  c.lineWidth = 4; c.strokeStyle = '#f5b400'; c.stroke();

  cityC = mkc(W * S, H * S);
  c = cityC.getContext('2d'); c.scale(S, S);
  const r = rng(11);
  // far skyline
  c.fillStyle = '#c3b6e6';
  for (let x = -10; x < W;) { const w = 36 + r() * 50, h = 110 + r() * 110; c.fillRect(x, 440 - h, w + 1, h); x += w; }
  // Eiffel Tower
  const cx = 700, by = 440, h = 350;
  eiffelPath(c, cx, by, h); c.fillStyle = '#6a5f8a'; c.fill();
  c.save(); eiffelPath(c, cx, by, h); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2;
  for (let i = -40; i < 60; i++) {
    c.beginPath(); c.moveTo(cx - 200 + i * 12, by); c.lineTo(cx - 200 + i * 12 + 380, by - 380); c.stroke();
    c.beginPath(); c.moveTo(cx + 200 - i * 12, by); c.lineTo(cx + 200 - i * 12 - 380, by - 380); c.stroke();
  }
  c.restore();
  c.fillStyle = '#51476f';
  c.fillRect(cx - h * 0.175, by - h * 0.3, h * 0.35, 9);
  c.fillRect(cx - h * 0.1, by - h * 0.56, h * 0.2, 8);
  c.fillRect(cx - h * 0.04, by - h * 0.88, h * 0.08, 7);
  c.fillRect(cx - 1.5, by - h - 26, 3, 28);
  // Paris buildings
  const walls = ['#fbeed3', '#f6dfc0', '#f4e7dc', '#ffe6cf'];
  for (let x = -30; x < W + 30;) {
    const w = 96 + r() * 70, hh = 80 + r() * 80, y = 440 - hh;
    c.fillStyle = walls[Math.floor(r() * walls.length)];
    c.fillRect(x, y, w, hh); c.lineWidth = 3; c.strokeStyle = OUT; c.strokeRect(x, y, w, hh);
    for (let k = 0; k < 2; k++) {
      const chx = x + w * (0.2 + k * 0.5);
      c.fillStyle = '#d9744a'; c.fillRect(chx, y - 50, 16, 24); c.strokeRect(chx, y - 50, 16, 24);
      c.fillStyle = '#b55a36'; c.fillRect(chx + 3, y - 58, 4, 8); c.fillRect(chx + 9, y - 58, 4, 8);
    }
    c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 10, y - 32); c.lineTo(x + w - 10, y - 32); c.lineTo(x + w + 5, y); c.closePath();
    blob(c, '#6f8db3', 3);
    for (let dx = x + 20; dx < x + w - 26; dx += 36) {
      c.fillStyle = '#fbeed3'; c.fillRect(dx, y - 24, 18, 20); c.strokeRect(dx, y - 24, 18, 20);
      c.fillStyle = '#9fd4f5'; c.fillRect(dx + 4, y - 20, 10, 12);
    }
    for (let wy = y + 14; wy < 440 - 30; wy += 40) {
      for (let wx = x + 14; wx < x + w - 22; wx += 30) {
        c.fillStyle = r() < 0.25 ? '#ffe58a' : '#9fd4f5';
        c.fillRect(wx, wy, 15, 22); c.lineWidth = 2; c.strokeRect(wx, wy, 15, 22);
        c.beginPath(); c.moveTo(wx - 3, wy + 24); c.lineTo(wx + 18, wy + 24); c.lineWidth = 3; c.stroke();
      }
    }
    x += w + 2;
  }
  // rooftop floor
  const fg = c.createLinearGradient(0, 446, 0, 540);
  fg.addColorStop(0, '#a5bdd6'); fg.addColorStop(1, '#6f8cab');
  c.fillStyle = fg; c.fillRect(0, 446, W, 94);
  c.strokeStyle = 'rgba(30,50,90,.3)'; c.lineWidth = 3;
  for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(480 + i * 62, 450); c.lineTo(480 + i * 112, 540); c.stroke(); }
  c.fillStyle = '#f3ead9'; c.fillRect(-4, 434, W + 8, 14); c.lineWidth = 3; c.strokeStyle = OUT; c.strokeRect(-4, 434, W + 8, 14);
  // side chimneys + flag
  for (const x of [4, 902]) {
    c.fillStyle = '#d9744a'; c.fillRect(x, 372, 54, 76); c.strokeRect(x, 372, 54, 76);
    c.fillStyle = '#efe6d6'; c.fillRect(x - 5, 362, 64, 12); c.strokeRect(x - 5, 362, 64, 12);
    for (const px of [x + 8, x + 32]) { c.fillStyle = '#c7603d'; c.fillRect(px, 342, 14, 20); c.strokeRect(px, 342, 14, 20); }
    c.strokeStyle = 'rgba(29,27,58,.3)'; c.lineWidth = 2;
    for (let yy = 390; yy < 446; yy += 16) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 54, yy); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 3;
  }
  c.fillStyle = OUT; c.fillRect(926, 268, 5, 96);
  [['#2f5fd0', 0], ['#ffffff', 1], ['#e8372c', 2]].forEach(([col, i]) => { c.fillStyle = col; c.fillRect(931 - 54 + i * 18 - 5, 270, 18, 34); });
  c.strokeRect(872, 270, 54, 34);
}

const CLOUDS = [[80, 70, 1], [380, 110, 0.8], [640, 50, 1.2], [860, 130, 0.7]];
export function drawArena(ctx, time) {
  if (!skyC) buildArena();
  ctx.drawImage(skyC, 0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  for (const [x0, y, s] of CLOUDS) {
    const x = ((x0 + time * 9 * s) % (W + 240)) - 120;
    ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, 7); ctx.arc(x + 32 * s, y - 12 * s, 32 * s, 0, 7); ctx.arc(x + 68 * s, y, 24 * s, 0, 7);
    ctx.rect(x, y, 68 * s, 22 * s);
    ctx.fill();
  }
  ctx.drawImage(cityC, 0, 0, W, H);
}

// ---------------------------------------------------------------- Fighters
function limb(ctx, a, b, w, col) {
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 7; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}

function drawCroissant(ctx, cy) {
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 28, cy - 26);
    ctx.quadraticCurveTo(s * 80, cy - 10, s * 68, cy + 40);
    ctx.quadraticCurveTo(s * 50, cy + 26, s * 26, cy + 32); ctx.closePath();
    blob(ctx, '#e39a35');
  }
  const g = ctx.createLinearGradient(0, cy - 46, 0, cy + 46);
  g.addColorStop(0, '#ffdc90'); g.addColorStop(1, '#eba23c');
  ctx.beginPath(); ctx.ellipse(0, cy, 50, 45, 0, 0, 7); blob(ctx, g);
  ctx.strokeStyle = '#c9812a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const x of [-38, -24, 45]) {
    ctx.beginPath(); ctx.moveTo(x, cy - 24); ctx.quadraticCurveTo(x - 7, cy + 2, x, cy + 28); ctx.stroke();
  }
  // red neckerchief
  ctx.beginPath(); ctx.moveTo(-22, cy + 34); ctx.lineTo(30, cy + 34); ctx.lineTo(6, cy + 52); ctx.closePath(); blob(ctx, '#e8372c', 3);
}
function overCroissant(ctx, cy) {
  // moustache
  ctx.strokeStyle = '#6b3d14'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(19, cy + 5); ctx.quadraticCurveTo(8, cy + 12, 2, cy + 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(19, cy + 5); ctx.quadraticCurveTo(30, cy + 12, 37, cy + 3); ctx.stroke();
  // captain's hat
  ctx.beginPath(); ctx.ellipse(2, cy - 46, 38, 24, 0, Math.PI, 0); ctx.closePath(); blob(ctx, '#ffffff');
  rrect(ctx, -36, cy - 50, 76, 13, 4); blob(ctx, '#27407a', 3);
  ctx.beginPath(); ctx.moveTo(6, cy - 38); ctx.quadraticCurveTo(44, cy - 42, 60, cy - 30); ctx.quadraticCurveTo(34, cy - 32, 6, cy - 34); ctx.closePath(); blob(ctx, '#1d1b3a', 3);
  star(ctx, 8, cy - 58, 8, 0, '#ffd21f', 2);
}

function backChat(ctx, cy, time) {
  const w = Math.sin(time * 4) * 10;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-20, cy + 34); ctx.quadraticCurveTo(-64, cy + 34, -60, cy - 14 + w);
  ctx.strokeStyle = OUT; ctx.lineWidth = 19; ctx.stroke();
  ctx.strokeStyle = '#b9bcd3'; ctx.lineWidth = 12; ctx.stroke();
}
function drawChat(ctx, cy) {
  ctx.beginPath(); ctx.ellipse(0, cy + 14, 29, 32, 0, 0, 7); blob(ctx, '#2b2d5e');
  ctx.beginPath(); ctx.moveTo(-28, cy + 20); ctx.quadraticCurveTo(0, cy + 28, 28, cy + 20);
  ctx.strokeStyle = '#e8372c'; ctx.lineWidth = 7; ctx.stroke();
  // ears
  for (const [a, b, c2] of [[[-28, cy - 52], [-24, cy - 92], [0, cy - 70]], [[10, cy - 72], [32, cy - 94], [40, cy - 56]]]) {
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.closePath(); blob(ctx, '#b9bcd3');
  }
  ctx.beginPath(); ctx.arc(4, cy - 38, 39, 0, 7); blob(ctx, '#b9bcd3');
  ctx.beginPath(); ctx.ellipse(19, cy - 22, 19, 13, 0, 0, 7); ctx.fillStyle = '#f1f2f9'; ctx.fill();
}
function overChat(ctx, cy, time) {
  // ninja headband
  ctx.save();
  ctx.beginPath(); ctx.arc(4, cy - 38, 37, 0, 7); ctx.clip();
  ctx.fillStyle = '#e8372c'; ctx.fillRect(-40, cy - 64, 90, 13);
  ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-40, cy - 64); ctx.lineTo(50, cy - 64); ctx.moveTo(-40, cy - 51); ctx.lineTo(50, cy - 51); ctx.stroke();
  ctx.restore();
  const w = Math.sin(time * 7) * 6;
  limb(ctx, [-31, cy - 56], [-58, cy - 50 + w], 5, '#e8372c');
  limb(ctx, [-31, cy - 58], [-56, cy - 70 - w], 5, '#e8372c');
  // nose + whiskers
  ctx.beginPath(); ctx.moveTo(15, cy - 30); ctx.lineTo(25, cy - 30); ctx.lineTo(20, cy - 24); ctx.closePath(); blob(ctx, '#ff8fb0', 2);
  ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of [[34, -22, 56, -27], [34, -18, 56, -16], [4, -22, -16, -27], [4, -18, -16, -16]]) {
    ctx.beginPath(); ctx.moveTo(x1, cy + y1); ctx.lineTo(x2, cy + y2); ctx.stroke();
  }
}

export const CHARS = {
  croissant: {
    id: 'croissant', name: 'Capitaine Croissant', tag: 'The flaky hero of the bakery!',
    limb: '#e39a35', glove: '#ffffff', leg: '#27407a', shoe: '#e8372c', iris: '#3a2a1a',
    cy: -84, eyes: [[6, -12], [30, -12]], mouth: [19, 20], head: -150,
    draw: drawCroissant, over: overCroissant,
  },
  chat: {
    id: 'chat', name: 'Le Chat Ninja', tag: 'Quiet paws, super-fast kicks!',
    limb: '#2b2d5e', glove: '#d5d8ea', leg: '#2b2d5e', shoe: '#d5d8ea', iris: '#2fae4e',
    cy: -68, eyes: [[6, -42], [30, -42]], mouth: [20, -15], head: -168,
    back: backChat, draw: drawChat, over: overChat,
  },
};

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
  const c = f.char, P = poseOf(f, time);
  ctx.save();
  ctx.translate(f.x, f.y + P.hop);
  ctx.scale(f.face, 1);
  ctx.rotate(P.lean);
  const cy = c.cy + P.bodyY;
  const at = (p) => [p[0], cy + p[1]];
  const shoe = (p) => { ctx.beginPath(); ctx.ellipse(p[0] + 5, p[1] - 7, 15, 9, 0, 0, 7); blob(ctx, c.shoe, 3.5); };
  const glove = (p, big) => {
    const q = at(p);
    if (big) burst(ctx, q[0], q[1], 26, time * 10, '#ffd21f', 8);
    ctx.beginPath(); ctx.arc(q[0], q[1], big ? 15 : 12, 0, 7); blob(ctx, c.glove, 3.5);
  };
  const hipY = cy + 34;
  limb(ctx, [-14, hipY], [P.fB[0], P.fB[1] - 8], 13, c.leg); shoe(P.fB);
  limb(ctx, [-18, cy - 6], at(P.hB), 12, c.limb); glove(P.hB, false);
  if (c.back) c.back(ctx, cy, time);
  limb(ctx, [16, hipY], [P.fF[0], P.fF[1] - 8], 13, c.leg);
  if (P.big && f.atk && f.atk.type === 'kick') burst(ctx, P.fF[0] + 5, P.fF[1] - 7, 28, time * 10, '#ffd21f', 8);
  shoe(P.fF);
  c.draw(ctx, cy, time);
  drawFace(ctx, c, cy, P, time);
  c.over(ctx, cy, time);
  limb(ctx, [26, cy - 4], at(P.hF), 12, c.limb); glove(P.hF, P.big && (!f.atk || f.atk.type === 'punch'));
  if (P.shield) {
    ctx.beginPath(); ctx.arc(18, cy - 6, 72, -1.05, 1.05);
    ctx.strokeStyle = 'rgba(120,220,255,.85)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
  if (P.stars) {
    const hy = f.y + c.head + (f.air ? 0 : 36) - 6;
    for (let i = 0; i < 4; i++) {
      const a = time * 4 + (i * Math.PI) / 2;
      star(ctx, f.x + Math.cos(a) * 46, hy + Math.sin(a) * 12, 11, a, i % 2 ? '#ffd21f' : '#fff', 3);
    }
  }
}
