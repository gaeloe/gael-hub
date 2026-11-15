// Bonjour Brawl – screens, controls and the main loop.
import { W, H, GROUND, CHARS, drawFighter } from './art.js';
import { Fight } from './fight.js';
import { sfx, say, stopSpeech, unlockAudio, settings } from './audio.js';
import {
  save, persist, planSession, nextChallenge, record, starsFor, byId, picSVG, THEMES, FLOORS, ROSTER, FIGHTER_STARS, COSTUME_STARS,
  totalStars, level, floorOpen, nextFloor, fighterOpen, costumeOpen, streakNow, touchStreak, isLearned, strength,
} from './words.js';
import { runChallenge, mic } from './challenge.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage'), pad = $('pad');
const screens = ['title', 'tower', 'select', 'howto', 'result', 'pauseMenu', 'words'];
const input = { left: false, right: false, block: false };
let scale = 1, fight = null, session = null, paused = false, afterHow = null, toldSuper = false;
let mode = 'arcade', floorI = 0, afterSelect = null, selected = 'croissant';

settings.muted = save.muted;
const palOf = (id) => CHARS[id].costumes[costumeOpen(save.costume[id] || 0) ? save.costume[id] || 0 : 0];

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
  if (name) $(name).scrollTop = 0;
  resize();
}

// ---------------------------------------------------------------- title
function refreshTitle() {
  $('soundBtn').textContent = settings.muted ? '🔇 Sound off' : '🔊 Sound on';
  $('stats').innerHTML = `<span>🔥 ${streakNow()}</span><span>★ ${totalStars()}/24</span><span>Level ${level()}</span>`;
  $('micBtn').classList.toggle('hidden', !mic.supported);
  $('micNote').classList.toggle('hidden', !mic.supported);
  $('micBtn').textContent = '🎤 Speaking: ' + (save.mic ? 'on' : 'off');
}
function attract() {
  const fl = FLOORS[Math.floor(Math.random() * FLOORS.length)];
  const a = save.fighter || 'croissant', b = fl.char === a ? (a === 'chat' ? 'croissant' : 'chat') : fl.char;
  fight = new Fight({ attract: true, playerChar: CHARS[a], playerPal: palOf(a), cpuChar: CHARS[b], arena: fl.arena, input });
}
function goTitle() { stopSpeech(); attract(); refreshTitle(); show('title'); }

const needFighter = (then) => { if (save.fighter && fighterOpen(save.fighter)) then(); else openSelect(then); };
$('arcadeBtn').addEventListener('click', () => {
  unlockAudio(); sfx.tap();
  const n = nextFloor();
  if (n < 0) return openTower('You climbed the whole tower! 🏆');
  mode = 'arcade';
  needFighter(() => begin(n));
});
$('practiceBtn').addEventListener('click', () => { unlockAudio(); sfx.tap(); openTower('Practice: pick an opponent'); });
$('wordsBtn').addEventListener('click', () => { unlockAudio(); sfx.tap(); openWords(); });
$('fightersBtn').addEventListener('click', () => { unlockAudio(); sfx.tap(); openSelect(goTitle); });
$('soundBtn').addEventListener('click', () => {
  settings.muted = save.muted = !settings.muted; persist();
  if (settings.muted) stopSpeech(); else { unlockAudio(); sfx.chime(); }
  refreshTitle();
});
$('micBtn').addEventListener('click', () => { save.mic = !save.mic; persist(); sfx.tap(); refreshTitle(); });
$('helpBtn').addEventListener('click', () => { unlockAudio(); showHow(goTitle); });
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); goTitle(); }));

// ---------------------------------------------------------------- the tower (also used for practice)
const still = (id, pal) => ({ char: CHARS[id], pal, x: 0, y: 0, face: 1, state: 'idle', vx: 0, air: false, seed: 0 });
function portrait(canvas, id, pal, time = 0.4) {
  const c = canvas.getContext('2d'), k = canvas.width / 240;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
  c.setTransform(k, 0, 0, k, 120 * k, 212 * k);
  c.beginPath(); c.ellipse(0, 4, 58, 11, 0, 0, 7); c.fillStyle = 'rgba(20,30,60,.2)'; c.fill();
  drawFighter(c, still(id, pal), time);
}
function openTower(title) {
  $('towerTitle').textContent = title;
  const box = $('floors'); box.innerHTML = '';
  const next = nextFloor();
  for (const fl of FLOORS) {
    const open = floorOpen(fl.i), c = CHARS[fl.char];
    const b = el('button', 'floor' + (open ? '' : ' locked') + (fl.i === next ? ' next' : ''));
    const pc = el('canvas'); pc.width = 144; pc.height = 138;
    portrait(pc, fl.char, c.costumes[0]);
    const st = save.stars[fl.i];
    b.append(el('span', 'num', fl.boss ? '👑' : String(fl.i + 1)), pc,
      el('span', 'who', `<b>${c.name}</b><i>${fl.theme.emoji} ${fl.theme.name}${fl.boss ? ' + everything!' : ''}</i>`),
      el('span', 'st', open ? '★'.repeat(st) + '<u>' + '★'.repeat(3 - st) + '</u>' : '🔒'));
    b.addEventListener('click', () => {
      unlockAudio();
      if (!open) { sfx.wrong(); say([['Win the fight before this one first!', 'en']]); return; }
      sfx.chime(); mode = 'practice';
      needFighter(() => begin(fl.i));
    });
    box.append(b);
  }
  show('tower');
  say([[title.replace(/[^\w :!']/g, ''), 'en']]);
  const nx = box.querySelector('.next') || box.firstChild;
  if (nx && nx.scrollIntoView) nx.scrollIntoView({ block: 'center' });
}

// ---------------------------------------------------------------- fighter + costume select
const cards = {};
for (const id of ROSTER) {
  const c = CHARS[id];
  const card = el('button', 'fcard');
  const pc = el('canvas'); pc.width = 240; pc.height = 230;
  const lock = el('span', 'lock');
  card.append(pc, el('b', null, c.name), el('span', 'tagl', c.tag), lock);
  card.addEventListener('click', () => {
    unlockAudio();
    if (!fighterOpen(id)) { sfx.wrong(); say([[`You need ${FIGHTER_STARS[id]} stars to unlock this fighter.`, 'en']]); return; }
    sfx.chime(); selected = id; say([[c.name + ' !', 'fr']]); refreshSelect();
  });
  $('cards').append(card);
  cards[id] = { card, pc, lock };
}
function refreshSelect() {
  for (const id of ROSTER) {
    const open = fighterOpen(id), k = cards[id];
    k.card.classList.toggle('locked', !open);
    k.card.classList.toggle('sel', id === selected);
    k.lock.textContent = open ? '' : `🔒 ${FIGHTER_STARS[id]}★`;
  }
  const row = $('costumes'); row.innerHTML = '';
  CHARS[selected].costumes.forEach((co, i) => {
    const open = costumeOpen(i);
    const b = el('button', 'cost' + ((save.costume[selected] || 0) === i ? ' sel' : '') + (open ? '' : ' locked'), `<i style="background:${co.body}"></i><i style="background:${co.accent}"></i> ${open ? co.name : '🔒 ' + COSTUME_STARS[i] + '★'}`);
    b.addEventListener('click', () => {
      if (!open) { sfx.wrong(); say([[`You need ${COSTUME_STARS[i]} stars for this costume.`, 'en']]); return; }
      sfx.tap(); save.costume[selected] = i; persist(); refreshSelect();
    });
    row.append(b);
  });
}
function openSelect(then) {
  afterSelect = then;
  selected = save.fighter && fighterOpen(save.fighter) ? save.fighter : 'croissant';
  refreshSelect(); show('select');
  say([['Pick your fighter!', 'en']]);
}
$('selGo').addEventListener('click', () => { sfx.tap(); save.fighter = selected; persist(); stopSpeech(); afterSelect(); });

// ---------------------------------------------------------------- how to play
const HOW = [['Punch and kick to win the fight!', 'en'], ['Answer French questions to fill your power meter.', 'en'], ['When it is full, press Super!', 'en']];
function showHow(then) { afterHow = then; show('howto'); say(HOW); }
$('howGo').addEventListener('click', () => { sfx.tap(); save.howTo = true; persist(); stopSpeech(); afterHow(); });

// ---------------------------------------------------------------- fight
const micOK = () => save.mic && mic.supported && !mic.broken;
function begin(i) { if (!save.howTo) showHow(() => startFloor(i)); else startFloor(i); }

function startFloor(i) {
  floorI = i;
  const fl = FLOORS[i], me = CHARS[save.fighter] || CHARS.croissant, foe = CHARS[fl.char];
  const myC = costumeOpen(save.costume[me.id] || 0) ? save.costume[me.id] || 0 : 0;
  session = planSession(fl); toldSuper = false; paused = false;
  $('superBtn').disabled = true;
  show(null);
  fight = new Fight({
    playerChar: me, playerPal: me.costumes[myC], cpuChar: foe, cpuPal: foe.costumes[foe === me ? (myC + 1) % 3 : 0],
    arena: fl.arena, cpuHp: fl.boss ? 110 : 100,
    diff: { cd0: 1.1 - i * 0.08, cd1: 1.0 - i * 0.08, block: 0.25 + i * 0.05, dmg: 0.7 + i * 0.07, speed: 0.75 + i * 0.03 },
    sub: `${fl.theme.emoji} ${fl.theme.name}`, intro: [[foe.name + ' !', 'fr'], [fl.theme.name + '!', 'en']],
    input, onChallenge: doChallenge, onEnd: endFight, onSuper: () => { $('superBtn').disabled = true; },
  });
}

async function doChallenge() {
  const f = fight;
  input.left = input.right = input.block = false;
  sfx.chime();
  const ch = nextChallenge(session, micOK());
  window.__bb.ch = ch;
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

const unlockedNow = () => [
  ...ROSTER.filter(fighterOpen).map((id) => 'New fighter: ' + CHARS[id].name),
  ...(costumeOpen(1) ? ['New costumes unlocked!'] : []), ...(costumeOpen(2) ? ['Even more costumes unlocked!'] : []),
];
function endFight({ won }) {
  const stars = starsFor(won, session), before = unlockedNow(), wasNext = nextFloor();
  save.fights++; if (won) save.wins++;
  save.stars[floorI] = Math.max(save.stars[floorI], stars);
  const xp = session.right * 10 + (won ? 20 : 5) + stars * 10, lvl = level();
  save.xp += xp;
  const newDay = touchStreak();
  persist();
  const fresh = unlockedNow().filter((u) => !before.includes(u));
  if (won && wasNext === floorI && floorI < 7) fresh.unshift('Next floor open: ' + CHARS[FLOORS[floorI + 1].char].name);
  if (level() > lvl) fresh.push('Level ' + level() + '!');
  const f = fight;
  setTimeout(() => {
    if (fight !== f || f.mode !== 'over') return;
    const champion = won && floorI === 7;
    $('resTitle').textContent = champion ? 'You beat the tower! 🏆' : won ? 'You win! 🎉' : 'So close! 💪';
    $('resLine').textContent = (session.asked ? `French answers: ${session.right} out of ${session.asked} · ` : '') + `+${xp} XP · 🔥 ${save.streak} day${save.streak === 1 ? '' : 's'}`;
    $('resUnlock').innerHTML = fresh.map((u) => `<span>🎉 ${u}</span>`).join('');
    const box = $('resStars'); box.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = el('span', null, '★');
      if (i < stars) { s.className = 'on'; s.style.animationDelay = 0.3 + i * 0.35 + 's'; setTimeout(() => sfx.star(), 300 + i * 350); }
      box.append(s);
    }
    const chips = $('resWords'); chips.innerHTML = '';
    for (const id of session.used) chips.append(chip(byId[id]));
    $('nextBtn').classList.toggle('hidden', !(won && floorI < 7));
    $('againBtn').className = won && floorI < 7 ? 'btn small' : 'btn huge';
    show('result');
    if (won) {
      sfx.jingle();
      setTimeout(() => say([[(champion ? 'You beat the whole tower! ' : 'You win! ') + ['', 'One star!', 'Two stars!', 'Three stars!'][stars], 'en'], ['Bravo !', 'fr'],
        ...(newDay && save.streak > 1 ? [[save.streak + ' days in a row!', 'en']] : []), ...(fresh.length ? [[fresh[0].replace(':', ''), 'en']] : [])]), 1300);
    } else say([['So close! Let us try again!', 'en']]);
  }, 900);
}
$('againBtn').addEventListener('click', () => { unlockAudio(); sfx.tap(); stopSpeech(); startFloor(floorI); });
$('nextBtn').addEventListener('click', () => { unlockAudio(); sfx.tap(); stopSpeech(); startFloor(floorI + 1); });

// pause
$('pauseBtn').addEventListener('click', () => { if (fight && fight.mode !== 'over') { paused = true; show('pauseMenu'); } });
$('resumeBtn').addEventListener('click', () => { sfx.tap(); paused = false; show(null); });
$('quitBtn').addEventListener('click', () => { sfx.tap(); paused = false; goTitle(); });

// ---------------------------------------------------------------- My words
function chip(w) {
  const b = el('button', 'chip', picSVG(w) + `<span>${w.fr}<small>${w.en}</small></span>`);
  b.addEventListener('click', () => { unlockAudio(); say([[w.fr, 'fr'], [w.en, 'en']]); });
  return b;
}
function openWords() {
  const box = $('wordsList'); box.innerHTML = '';
  let total = 0;
  for (const t of THEMES) {
    const got = t.words.filter(isLearned); total += got.length;
    box.append(el('h3', null, `${t.emoji} ${t.name} <small>${got.length}/${t.words.length}</small>`));
    const row = el('div', 'chips');
    for (const w of t.words) {
      if (isLearned(w)) { const c = chip(w); c.append(el('em', null, '●'.repeat(strength(w)) + '<u>' + '●'.repeat(4 - strength(w)) + '</u>')); row.append(c); }
      else row.append(el('span', 'chip unknown', '<span>?</span>'));
    }
    box.append(row);
  }
  $('wordsTitle').textContent = `My words (${total})`;
  show('words');
  say([[total ? `You know ${total} French word${total === 1 ? '' : 's'}! Tap a word to hear it.` : 'Win fights to collect French words!', 'en']]);
}

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
    for (const id of ROSTER) portrait(cards[id].pc, id, id === selected ? CHARS[id].costumes[save.costume[id] || 0] : palOf(id), now / 1000);
  }
  requestAnimationFrame(frame);
}

goTitle();
requestAnimationFrame(frame);
window.__bb = { get fight() { return fight; }, get session() { return session; }, save, input, GROUND, startFloor, FLOORS, persist };
