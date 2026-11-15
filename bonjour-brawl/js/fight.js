// The fight itself: movement, punches, kicks, blocking, combos, the French power meter and the super move.
import { W, H, GROUND, OUT, drawArena, drawFighter, txt, star, burst, rrect } from './art.js';
import { sfx, say } from './audio.js';

const SPEED = 250, JUMP = 800, GRAV = 2200;
const ATK = {
  punch: { dur: 0.3, a0: 0.07, a1: 0.19, reach: 112, dmg: 2.4, kb: 190 },
  kick: { dur: 0.44, a0: 0.13, a1: 0.29, reach: 134, dmg: 3.8, kb: 260 },
};
const POW = ['PAF!', 'BOUM!', 'VLAN!', 'BING!', 'TOC!'];
const rnd = Math.random;

function mk(char, x, face, isPlayer) {
  return { char, x, y: GROUND, vx: 0, vy: 0, kbv: 0, face, hp: 100, dispHp: 100, state: 'idle', st: 0, atk: null, inv: 0, air: false, blocking: false, isPlayer, wins: 0, hist: [], seed: isPlayer ? 0 : 2 };
}

export class Fight {
  constructor(o) {
    this.o = o;
    this.player = mk(o.playerChar, 300, 1, true);
    this.cpu = mk(o.cpuChar, 660, -1, false);
    this.time = 0; this.t = 0; this.round = 1;
    this.meter = 0; this.dispMeter = 0; this.superWord = null;
    this.chalT = 4; this.fx = []; this.parts = []; this.banner = null; this.shake = 0; this.sup = null; this.buf = null;
    this.ai = { t: 0, cd: 1.2, blockT: 0, move: 0, jump: false };
    this.mode = o.attract ? 'attract' : 'intro';
    if (!o.attract) this.startIntro();
  }

  startIntro() {
    this.mode = 'intro'; this.t = 0; this.said = false;
    this.banner = { text: 'Round ' + this.round, t: 0, life: 1.1 };
    say([['Round ' + ['one', 'two', 'three'][this.round - 1] + '!', 'en'], ['Allez !', 'fr']]);
  }

  press(a) {
    if (a === 'super') return this.trySuper();
    this.buf = { a, t: 0.2 };
  }

  addMeter(v, word) {
    const was = this.meter;
    this.meter = Math.min(100, this.meter + v);
    if (word) this.superWord = word;
    if (was < 100 && this.meter >= 100) { sfx.meterFull(); return true; }
    return false;
  }

  resume() {
    this.mode = 'fight'; this.chalT = 13; this.ai.cd = 1.1; this.buf = null;
    this.banner = { text: 'Allez!', t: 0, life: 0.7 };
  }

  trySuper() {
    const p = this.player;
    if (this.mode !== 'fight' || this.meter < 100 || p.state === 'hurt') return false;
    this.mode = 'super'; this.meter = 0;
    p.atk = null; p.state = 'super'; p.vx = 0; p.blocking = false;
    this.cpu.atk = null; this.cpu.vx = 0;
    p.face = this.cpu.x >= p.x ? 1 : -1;
    this.sup = { t: 0, word: this.superWord, ball: null, hitT: -1 };
    sfx.superCharge();
    say([[this.superWord.fr + ' !', 'fr']]);
    if (this.o.onSuper) this.o.onSuper();
    return true;
  }

  // ------------------------------------------------------------ update
  update(dt) {
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.dispMeter += (this.meter - this.dispMeter) * Math.min(1, dt * 6);
    for (const f of [this.player, this.cpu]) f.dispHp += (f.hp - f.dispHp) * Math.min(1, dt * 8);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.fx = this.fx.filter((e) => (e.t += dt) < e.life);
    this.parts = this.parts.filter((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; return p.t < p.life; });
    const none = { move: 0 };
    switch (this.mode) {
      case 'intro':
        this.t += dt;
        this.step(this.player, none, dt); this.step(this.cpu, none, dt);
        if (this.t > 1.1 && !this.said) { this.said = true; this.banner = { text: 'Allez!', t: 0, life: 0.7 }; sfx.chime(); }
        if (this.t > 1.7) this.mode = 'fight';
        break;
      case 'fight': this.updateFight(dt); break;
      case 'super': this.updateSuper(dt); break;
      case 'ko':
        this.t += dt;
        this.step(this.player, none, dt); this.step(this.cpu, none, dt);
        if (this.t > 2.7 && !this.rose) {
          this.rose = true;                       // the dizzy fighter bounces back up
          const l = this.loser; l.state = 'idle'; l.vy = -520; l.air = true; sfx.jump();
        }
        if (this.t > 3.5) {
          if (this.winner.wins >= 2) { this.mode = 'over'; this.o.onEnd({ won: this.winner.isPlayer }); }
          else this.nextRound();
        }
        break;
      default: break; // attract, paused, over: fighters just stand and breathe
    }
  }

  nextRound() {
    this.round++;
    const p = this.player, c = this.cpu;
    Object.assign(p, { x: 300, y: GROUND, vx: 0, vy: 0, kbv: 0, hp: 100, state: 'idle', atk: null, inv: 0, face: 1, hist: [] });
    Object.assign(c, { x: 660, y: GROUND, vx: 0, vy: 0, kbv: 0, hp: 100, state: 'idle', atk: null, inv: 0, face: -1, hist: [] });
    this.fx = []; this.chalT = Math.min(this.chalT, 3); this.startIntro();
  }

  playerIntent(dt) {
    const inp = this.o.input, p = this.player;
    const it = { move: (inp.right ? 1 : 0) - (inp.left ? 1 : 0), block: inp.block };
    if (this.buf) {
      const busy = p.state === 'hurt' || p.atk;
      if (this.buf.a === 'jump') { if (!busy && !p.air) { it.jump = true; this.buf = null; } }
      else if (!busy) { it[this.buf.a] = true; this.buf = null; }
      if (this.buf && (this.buf.t -= dt) <= 0) this.buf = null;
    }
    return it;
  }

  cpuIntent(dt) {
    const a = this.ai, c = this.cpu, p = this.player;
    a.cd -= dt; a.t -= dt; a.blockT -= dt;
    const it = { move: 0 };
    const dist = Math.abs(p.x - c.x), dir = Math.sign(p.x - c.x) || 1;
    if (a.blockT > 0) { it.block = true; return it; }
    if (a.t <= 0) {
      a.t = 0.25 + rnd() * 0.3;
      if (dist > 140) a.move = rnd() < 0.85 ? dir : 0;
      else if (dist < 84) a.move = rnd() < 0.5 ? -dir : 0;
      else a.move = rnd() < 0.2 ? -dir : 0;
      a.jump = rnd() < 0.05;
      if (p.atk && dist < 160 && rnd() < 0.3) a.blockT = 0.5;
    }
    it.move = a.move; it.jump = a.jump; a.jump = false;
    if (dist < 128 && a.cd <= 0) { it[rnd() < 0.6 ? 'punch' : 'kick'] = true; a.cd = 1.0 + rnd() * 1.1; }
    return it;
  }

  startAtk(f, type) {
    const h = f.hist.filter((e) => this.time - e.t < 1.5).slice(-2);
    let finisher = false;
    if (h.length === 2) {
      const s = h[0].type[0] + h[1].type[0] + type[0];
      finisher = s === 'ppk' || s === 'kkp';   // Punch-Punch-Kick or Kick-Kick-Punch
    }
    f.atk = { type, t: 0, hit: false, finisher };
    if (finisher) f.hist = [];
    sfx.whoosh();
  }

  step(f, it, dt) {
    if (f.inv > 0) f.inv -= dt;
    if (f.state === 'hurt') { f.st -= dt; if (f.st <= 0) f.state = 'idle'; }
    if (f.atk) { f.atk.t += dt; if (f.atk.t >= ATK[f.atk.type].dur) f.atk = null; }
    const free = f.state === 'idle' && !f.atk;
    f.blocking = free && !f.air && !!it.block;
    if (free && !f.blocking) {
      if (it.punch) this.startAtk(f, 'punch'); else if (it.kick) this.startAtk(f, 'kick');
    }
    if (f.state === 'idle' && !f.atk && !f.blocking) {
      f.vx = (it.move || 0) * SPEED * (f.isPlayer ? 1 : 0.8);
      if (it.jump && !f.air) { f.vy = -JUMP; f.air = true; sfx.jump(); }
    } else if (!f.air) f.vx *= Math.pow(0.001, dt);
    f.vy += GRAV * dt; f.y += f.vy * dt;
    if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; f.air = false; } else f.air = true;
    f.x += (f.vx + f.kbv) * dt;
    f.kbv *= Math.pow(0.02, dt);
    f.x = Math.max(70, Math.min(W - 70, f.x));
  }

  hitCheck(a, d) {
    if (!a.atk || a.atk.hit) return;
    const sp = ATK[a.atk.type];
    if (a.atk.t < sp.a0 || a.atk.t > sp.a1) return;
    const dx = (d.x - a.x) * a.face;
    if (dx < -20 || dx > sp.reach || Math.abs(d.y - a.y) > 115 || d.inv > 0) return;
    a.atk.hit = true;
    const fin = a.atk.finisher;
    let dmg = sp.dmg * (fin ? 2.4 : 1) * (a.air ? 1.3 : 1) * (a.isPlayer ? 1 : 0.8);
    const hx = (a.x + d.x) / 2 + a.face * 14, hy = d.y - 92;
    a.hist.push({ type: a.atk.type, t: this.time });
    if (d.blocking && d.face === -a.face && !fin) {
      d.hp = Math.max(1, d.hp - dmg * 0.15); d.kbv = a.face * 110; sfx.block();
      this.fx.push({ kind: 'spark', x: hx, y: hy, t: 0, life: 0.2 });
      return;
    }
    d.hp -= dmg; d.state = 'hurt'; d.st = fin ? 0.5 : 0.28; d.inv = 0.45; d.atk = null; d.blocking = false;
    d.kbv = a.face * sp.kb * (fin ? 1.9 : 1);
    if (fin) { d.vy = -430; d.air = true; this.shake = 8; sfx.bigHit(); }
    else { this.shake = Math.max(this.shake, 3); sfx.hit(); }
    this.fx.push({ kind: 'pow', x: hx, y: hy, t: 0, life: fin ? 0.7 : 0.4, text: fin ? 'COMBO!' : POW[Math.floor(rnd() * POW.length)], big: fin, rot: rnd() * 6 });
    this.stars(hx, hy, fin ? 8 : 3, '#ffd21f');
    if (d.hp <= 0) this.startKO(a, d);
  }

  stars(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, s = 150 + rnd() * 320;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, t: 0, life: 0.5 + rnd() * 0.5, color, r: 6 + rnd() * 8 });
    }
  }

  startKO(winner, loser) {
    loser.hp = 0; loser.state = 'dizzy'; loser.atk = null; loser.blocking = false; loser.vy = -480; loser.air = true; loser.kbv = winner.face * 300; loser.vx = 0;
    winner.state = 'win'; winner.atk = null; winner.vx = 0; winner.blocking = false; winner.wins++;
    this.winner = winner; this.loser = loser; this.rose = false;
    this.mode = 'ko'; this.t = 0; this.shake = 10;
    this.banner = { text: 'K.O.!', t: 0, life: 2.2, sub: winner.isPlayer ? 'You win the round!' : 'Oops! Shake it off!' };
    sfx.ko();
  }

  updateFight(dt) {
    const p = this.player, c = this.cpu;
    this.chalT -= dt;
    if (this.chalT <= 0 && !p.air && !c.air && !p.atk && !c.atk && p.state === 'idle' && c.state === 'idle') {
      this.mode = 'paused'; p.vx = c.vx = 0; p.blocking = c.blocking = false;
      this.o.onChallenge();
      return;
    }
    this.step(p, this.playerIntent(dt), dt);
    this.step(c, this.cpuIntent(dt), dt);
    for (const [f, o] of [[p, c], [c, p]]) if (!f.atk && f.state === 'idle') f.face = o.x >= f.x ? 1 : -1;
    const dx = c.x - p.x;
    if (Math.abs(dx) < 78 && Math.abs(c.y - p.y) < 70) {
      const push = (78 - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1;
      p.x -= s * push; c.x += s * push;
      p.x = Math.max(70, Math.min(W - 70, p.x)); c.x = Math.max(70, Math.min(W - 70, c.x));
    }
    this.hitCheck(p, c);
    if (this.mode === 'fight') this.hitCheck(c, p);
  }

  updateSuper(dt) {
    const s = this.sup, p = this.player, c = this.cpu;
    s.t += dt;
    this.step(c, { move: 0 }, dt);
    p.vy += GRAV * dt; p.y = Math.min(GROUND, p.y + p.vy * dt); if (p.y >= GROUND) { p.vy = 0; p.air = false; }
    if (s.t > 0.95 && !s.ball && s.hitT < 0) { s.ball = { x: p.x + p.face * 80, y: p.y - 96 }; sfx.whoosh(); }
    if (s.ball) {
      const b = s.ball, ty = c.y - 84;
      b.x += p.face * 1050 * dt; b.y += (ty - b.y) * Math.min(1, dt * 10);
      this.parts.push({ x: b.x, y: b.y, vx: -p.face * 200 + (rnd() - 0.5) * 200, vy: (rnd() - 0.5) * 300 - 100, t: 0, life: 0.4, color: s.word.hex, r: 9 + rnd() * 9 });
      if ((c.x - b.x) * p.face < 30) {
        s.ball = null; s.hitT = s.t;
        c.hp -= 30; c.state = 'hurt'; c.st = 0.8; c.vy = -520; c.air = true; c.kbv = p.face * 520; c.atk = null; c.blocking = false;
        this.shake = 14; sfx.superBoom();
        this.fx.push({ kind: 'pow', x: c.x, y: c.y - 90, t: 0, life: 0.9, text: 'BOUM!', big: true, rot: 0, color: s.word.hex });
        this.stars(c.x, c.y - 90, 22, s.word.hex); this.stars(c.x, c.y - 90, 10, '#ffd21f');
      }
    }
    if (s.hitT >= 0 && s.t > s.hitT + 0.9) {
      this.sup = null; p.state = 'idle';
      if (c.hp <= 0) this.startKO(p, c); else this.mode = 'fight';
    }
  }

  // ------------------------------------------------------------ draw
  draw(ctx) {
    const p = this.player, c = this.cpu;
    ctx.save();
    if (this.shake > 0) ctx.translate((rnd() - 0.5) * this.shake, (rnd() - 0.5) * this.shake);
    drawArena(ctx, this.time);
    const s = this.sup;
    if (s) {
      ctx.fillStyle = 'rgba(20,16,60,.5)'; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.save(); ctx.translate(p.x, p.y - 90); ctx.rotate(this.time * 1.5);
      ctx.fillStyle = s.word.hex; ctx.globalAlpha = 0.45;
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, 900); ctx.lineTo(60, 900); ctx.fill(); }
      ctx.restore();
    }
    for (const f of [p, c]) {
      const k = 1 - Math.min(0.6, (GROUND - f.y) / 300);
      ctx.beginPath(); ctx.ellipse(f.x, GROUND + 6, 50 * k, 11 * k, 0, 0, 7); ctx.fillStyle = 'rgba(20,30,60,.28)'; ctx.fill();
    }
    const order = c.atk ? [p, c] : [c, p];
    for (const f of order) drawFighter(ctx, f, this.time);
    if (s && s.ball) {
      const b = s.ball, pul = 1 + Math.sin(this.time * 30) * 0.12;
      burst(ctx, b.x, b.y, 46 * pul, this.time * 8, s.word.hex, 9);
      ctx.beginPath(); ctx.arc(b.x, b.y, 16, 0, 7); ctx.fillStyle = s.word.id === 'blanc' ? '#ffe98a' : '#fff'; ctx.fill();
    }
    for (const q of this.parts) { ctx.globalAlpha = Math.max(0, 1 - q.t / q.life); star(ctx, q.x, q.y, q.r, q.t * 9, q.color, 2); }
    ctx.globalAlpha = 1;
    for (const e of this.fx) {
      const k = e.t / e.life, sc = Math.min(1, k * 5) * (e.big ? 1.5 : 1);
      if (e.kind === 'spark') { star(ctx, e.x, e.y, 22 * (0.5 + k), k * 3, '#bfeaff', 3); continue; }
      ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
      burst(ctx, e.x, e.y, 54 * sc, e.rot, e.color || '#ffd21f');
      txt(ctx, e.text, e.x, e.y + 2, 24 * sc, { fill: '#fff' });
      ctx.globalAlpha = 1;
    }
    if (s) {
      const k = Math.min(1, s.t * 3), w = s.word.fr.toUpperCase() + '!';
      const sz = 120 * (0.4 + 0.6 * k) * (1 + Math.sin(this.time * 18) * 0.03);
      txt(ctx, w, W / 2, 255, sz, { fill: s.word.hex, stroke: '#fff', lw: 22 });
      txt(ctx, w, W / 2, 255, sz, { fill: s.word.hex, stroke: OUT, lw: 8 });
      txt(ctx, '⚡ SUPER MOVE ⚡', W / 2, 162, 34, { fill: '#ffd21f' });
    }
    ctx.restore();
    if (this.mode !== 'attract') this.drawHUD(ctx);
    if (this.banner) {
      const b = this.banner, k = Math.min(1, b.t * 7), sc = k < 1 ? k * 1.15 : 1;
      txt(ctx, b.text, W / 2, 230, 96 * sc, { fill: '#ffd21f', lw: 20 });
      if (b.sub) txt(ctx, b.sub, W / 2, 310, 34, { fill: '#fff' });
    }
  }

  drawHUD(ctx) {
    const p = this.player, c = this.cpu;
    const bar = (x, f, flip) => {
      const w = 380, h = 30, y = 22, k = Math.max(0, f.dispHp / 100);
      rrect(ctx, x, y, w, h, 12); ctx.fillStyle = '#3a2f55'; ctx.fill();
      ctx.save(); rrect(ctx, x, y, w, h, 12); ctx.clip();
      ctx.fillStyle = k > 0.5 ? '#4cd964' : k > 0.25 ? '#ffc93c' : '#ff6b5e';
      ctx.fillRect(flip ? x + w * (1 - k) : x, y, w * k, h);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y + 4, w, 7);
      ctx.restore();
      rrect(ctx, x, y, w, h, 12); ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke();
      txt(ctx, f.char.name, flip ? x + w - 4 : x + 4, y + 52, 20, { align: flip ? 'right' : 'left' });
    };
    bar(34, p, false); bar(W - 34 - 380, c, true);
    // round-win stars in the middle
    for (let i = 0; i < 2; i++) {
      star(ctx, 398 - i * 30, 74, 13, 0, p.wins > i ? '#ffd21f' : '#5b5378', 3);
      star(ctx, 562 + i * 30, 74, 13, 0, c.wins > i ? '#ffd21f' : '#5b5378', 3);
    }
    // French power meter
    const x = 34, y = 96, w = 260, h = 22, k = this.dispMeter / 100, full = this.meter >= 100;
    rrect(ctx, x, y, w, h, 10); ctx.fillStyle = '#3a2f55'; ctx.fill();
    ctx.save(); rrect(ctx, x, y, w, h, 10); ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#2f5fd0'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, '#e8372c');
    ctx.fillStyle = g; ctx.fillRect(x, y, w * k, h);
    if (full && Math.sin(this.time * 12) > 0) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    rrect(ctx, x, y, w, h, 10); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
    txt(ctx, full ? '⚡ SUPER READY!' : '⚡ FRENCH POWER', x + w + 10, y + 12, 18, { align: 'left', fill: full ? '#ffd21f' : '#fff' });
  }
}
