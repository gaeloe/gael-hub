// Bonjour Brawl – screens, controls and the main loop.
import { W, H, GROUND, CHARS, drawFighter } from './art.js';
import { Fight } from './fight.js';
import { sfx, say, stopSpeech, unlockAudio, settings } from './audio.js';
import { save, persist, planSession, nextChallenge, record, starsFor, byId, picSVG } from './words.js';
import { runChallenge, mic } from './challenge.js';

const $ = (id) => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage'), pad = $('pad');
const screens = ['title', 'select', 'howto', 'result', 'pauseMenu'];
const input = { left: false, right: false, block: false };
let scale = 1, fight = null, session = null, paused = false, afterHow = null, toldSuper = false;

settings.muted = save.muted;

// ---------------------------------------------------------------- layout
function resize() {
  const r = stage.getBoundingClientRect();
  const s = Math.min(r.width / W, r.height / H) || 1;
  const cw = Math.floor(W * s), ch = Math.floor(H * s);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  scale = cv.width / W;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

function show(name) {
  for (const s of screens) $(s).classList.toggle('hidden', s !== name);
  const playing = !name;
  pad.classList.toggle('hidden', !playing);
  $('pauseBtn').classList.toggle('hidden', !playing);
  input.left = input.right = input.block = false;
  document.querySelectorAll('.pb.on').forEach((b) => b.classList.remove('on'));
  resize();
}

// ---------------------------------------------------------------- title
function refreshTitle() {
  $('soundBtn').textContent = settings.muted ? '🔇 Sound off' : '🔊 Sound on';
  $('best').textContent = save.fights ? 'Best: ' + '★'.repeat(save.bestStars) + '☆'.repeat(3 - save.bestStars) : '';
  $('micBtn').classList.toggle('hidden', !mic.supported);
  $('micNote').classList.toggle('hidden', !mic.supported);
  $('micBtn').textContent = '🎤 Speaking: ' + (save.mic ? 'on' : 'off');
}
function attract() {
  const a = CHARS[save.fighter || 'croissant'], b = a === CHARS.chat ? CHARS.croissant : CHARS.chat;
  fight = new Fight({ attract: true, playerChar: a, cpuChar: b, input });
}
function goTitle() { stopSpeech(); attract(); refreshTitle(); show('title'); }

$('playBtn').addEventListener('click', () => {
  unlockAudio(); sfx.tap();
  say([['Bonjour !', 'fr'], ['Pick your fighter!', 'en']]);
  show('select');
});
$('soundBtn').addEventListener('click', () => {
  settings.muted = save.muted = !settings.muted; persist();
  if (settings.muted) stopSpeech(); else { unlockAudio(); sfx.chime(); }
  refreshTitle();
});
$('micBtn').addEventListener('click', () => { save.mic = !save.mic; persist(); sfx.tap(); refreshTitle(); });
$('helpBtn').addEventListener('click', () => { unlockAudio(); showHow(() => goTitle()); });
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  sfx.tap();
  if (b.dataset.go === 'title') goTitle();
  else { attract(); say([['Pick your fighter!', 'en']]); show('select'); }
}));

// ---------------------------------------------------------------- fighter select
const portraits = [];
for (const c of Object.values(CHARS)) {
  const card = document.createElement('button');
  card.className = 'fcard'; card.dataset.id = c.id;
  const pc = document.createElement('canvas'); pc.width = 360; pc.height = 340;
  const name = document.createElement('b'); name.textContent = c.name;
  const tag = document.createElement('span'); tag.textContent = c.tag;
  card.append(pc, name, tag);
  card.addEventListener('click', () => {
    unlockAudio(); sfx.chime();
    save.fighter = c.id; persist();
    say([[c.name + ' !', 'fr']]);
    if (!save.howTo) showHow(startFight); else startFight();
  });
  $('cards').append(card);
  portraits.push({ pc, f: { char: c, x: 180, y: 300, face: 1, state: 'idle', vx: 0, air: false, seed: 0 } });
}

// ---------------------------------------------------------------- how to play
const HOW = [['Punch and kick to win the fight!', 'en'], ['Answer French questions to fill your power meter.', 'en'], ['When it is full, press Super!', 'en']];
function showHow(then) { afterHow = then; show('howto'); say(HOW); }
$('howGo').addEventListener('click', () => { sfx.tap(); save.howTo = true; persist(); stopSpeech(); afterHow(); });

// ---------------------------------------------------------------- fight
const micOK = () => save.mic && mic.supported && !mic.broken;

function startFight() {
  const me = CHARS[save.fighter] || CHARS.croissant;
  const foe = me === CHARS.chat ? CHARS.croissant : CHARS.chat;
  session = planSession(); toldSuper = false; paused = false;
  $('superBtn').disabled = true;
  show(null);
  fight = new Fight({ playerChar: me, cpuChar: foe, input, onChallenge: doChallenge, onEnd: endFight, onSuper: () => { $('superBtn').disabled = true; } });
}

async function doChallenge() {
  const f = fight;
  input.left = input.right = input.block = false;
  sfx.chime();
  const ch = nextChallenge(session, micOK());
  const res = await runChallenge(ch);
  if (fight !== f) return;                 // the player went home meanwhile
  if (!res.skipped) record(session, ch.word, res.correct);
  if (res.correct) {
    f.addMeter(34, ch.word);
    if (f.meter >= 100) {
      $('superBtn').disabled = false;
      if (!toldSuper) { toldSuper = true; say([['Super move ready! Press the lightning button!', 'en']]); }
    }
  }
  f.resume();
}

function endFight({ won }) {
  const stars = starsFor(won, session);
  save.fights++; if (won) save.wins++;
  save.bestStars = Math.max(save.bestStars, stars);
  persist();
  setTimeout(() => {
    if (!fight || fight.mode !== 'over') return;
    $('resTitle').textContent = won ? 'You win! 🎉' : 'So close! 💪';
    $('resLine').textContent = session.asked ? `French answers: ${session.right} out of ${session.asked}` : '';
    const box = $('resStars'); box.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span'); s.textContent = '★';
      if (i < stars) { s.className = 'on'; s.style.animationDelay = 0.3 + i * 0.35 + 's'; setTimeout(() => sfx.star(), 300 + i * 350); }
      box.append(s);
    }
    const chips = $('resWords'); chips.innerHTML = '';
    for (const id of session.used) {
      const w = byId[id], b = document.createElement('button');
      b.className = 'chip'; b.innerHTML = picSVG(w) + '<span>' + w.fr + '</span>';
      b.addEventListener('click', () => say([[w.fr, 'fr'], [w.en, 'en']]));
      chips.append(b);
    }
    show('result');
    if (won) {
      sfx.jingle();
      setTimeout(() => say([['You win! ' + ['', 'One star!', 'Two stars!', 'Three stars!'][stars], 'en'], ['Bravo !', 'fr']]), 1300);
    } else say([['So close! Let us try again!', 'en']]);
  }, 900);
}
$('againBtn').addEventListener('click', () => { unlockAudio(); sfx.tap(); stopSpeech(); startFight(); });

// pause
$('pauseBtn').addEventListener('click', () => { if (fight && fight.mode !== 'over') { paused = true; show('pauseMenu'); } });
$('resumeBtn').addEventListener('click', () => { sfx.tap(); paused = false; show(null); });
$('quitBtn').addEventListener('click', () => { sfx.tap(); paused = false; goTitle(); });

// ---------------------------------------------------------------- controls
const act = (a) => { if (fight && !paused && fight.mode === 'fight') fight.press(a); };
pad.querySelectorAll('[data-tap]').forEach((b) => {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); b.classList.add('on'); act(b.dataset.tap); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('on'));
});
pad.querySelectorAll('[data-hold]').forEach((b) => {
  const set = (v) => { input[b.dataset.hold] = v; b.classList.toggle('on', v); };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); try { b.setPointerCapture(e.pointerId); } catch (er) {} set(true); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => set(false));
});
$('superBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); act('super'); });
document.addEventListener('contextmenu', (e) => e.preventDefault());

const HOLD = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', KeyL: 'block', KeyC: 'block', ArrowDown: 'block', KeyS: 'block' };
const TAP = { ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyJ: 'punch', KeyZ: 'punch', KeyK: 'kick', KeyX: 'kick', Enter: 'super', KeyE: 'super' };
window.addEventListener('keydown', (e) => {
  if (!pad.classList.contains('hidden') && (HOLD[e.code] || TAP[e.code])) e.preventDefault(); else return;
  if (e.repeat) return;
  unlockAudio();
  if (HOLD[e.code]) input[HOLD[e.code]] = true; else act(TAP[e.code]);
});
window.addEventListener('keyup', (e) => { if (HOLD[e.code]) input[HOLD[e.code]] = false; });
window.addEventListener('blur', () => { input.left = input.right = input.block = false; });

// ---------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (fight) {
    if (!paused) fight.update(dt);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    fight.draw(ctx);
  }
  if (!$('select').classList.contains('hidden')) {
    for (const p of portraits) {
      const c = p.pc.getContext('2d');
      c.clearRect(0, 0, 360, 340);
      c.save(); c.scale(1.5, 1.5); c.translate(-60, -80);
      c.beginPath(); c.ellipse(180, 306, 60, 12, 0, 0, 7); c.fillStyle = 'rgba(20,30,60,.2)'; c.fill();
      drawFighter(c, p.f, now / 1000);
      c.restore();
    }
  }
  requestAnimationFrame(frame);
}

goTitle();
requestAnimationFrame(frame);
window.__bb = { get fight() { return fight; }, get session() { return session; }, save, input, GROUND };
