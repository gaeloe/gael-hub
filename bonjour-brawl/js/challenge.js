// The French challenges that pop up during a fight. No timers: the child can take as long as they like.
import { sfx, say, stopSpeech } from './audio.js';
import { picSVG } from './words.js';

const root = document.getElementById('challenge');
const card = document.getElementById('chCard');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const mic = { supported: !!SR, broken: false };

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (b) => new Promise((r) => b.addEventListener('click', () => { sfx.tap(); r(); }, { once: true }));
const strip = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ');

function frame(prompt, parts) {
  card.innerHTML = '';
  const head = el('div', 'ch-head');
  const sp = el('button', 'speak', '🔊');
  sp.setAttribute('aria-label', 'Hear it again');
  sp.addEventListener('click', () => say(parts));
  head.append(sp, el('div', 'ch-prompt', prompt));
  const body = el('div', 'ch-body'), foot = el('div', 'ch-foot');
  card.append(head, body, foot);
  say(parts);
  return { body, foot };
}

async function feedback(ok, word, foot, frText) {
  foot.innerHTML = '';
  if (ok) {
    sfx.correct();
    foot.append(el('div', 'fb good', '⭐ Bravo! ⚡ Power up!'));
    await say([['Bravo !', 'fr'], [frText, 'fr']]);
    await wait(450);
  } else {
    sfx.wrong();
    const b = el('button', 'btn', 'OK 👍');
    foot.append(el('div', 'fb retry', `Good try! It's <b>${frText}</b>`), b);
    say([['Good try! It is', 'en'], [frText, 'fr']]);
    await click(b);
    stopSpeech();
  }
}

async function intro(word) {
  const parts = [['New word!', 'en'], [word.fr, 'fr'], ['It means ' + word.en + '.', 'en'], [word.fr, 'fr']];
  const { body, foot } = frame('New word!', parts);
  const pic = el('button', 'pic big', picSVG(word));
  pic.addEventListener('click', () => say([[word.fr, 'fr']]));
  const col = el('div', 'col');
  col.append(el('div', 'fr-big', word.fr), el('div', 'en-small', '= ' + word.en));
  body.append(pic, col);
  const b = el('button', 'btn', 'Got it! 👍');
  foot.append(b);
  await click(b);
}

async function listenCh(ch) {
  const w = ch.word;
  const { body, foot } = frame('Listen! Tap the right colour.', [['Listen! Tap the right colour.', 'en'], [w.fr, 'fr']]);
  const row = el('div', 'row');
  body.append(row);
  const picked = await new Promise((res) => {
    for (const o of ch.options) {
      const t = el('button', 'pic opt', picSVG(o));
      t.dataset.id = o.id;
      t.addEventListener('click', () => res(t), { once: true });
      row.append(t);
    }
  });
  const ok = picked.dataset.id === w.id;
  for (const t of row.children) {
    t.disabled = true;
    if (t.dataset.id === w.id) { t.classList.add('right'); t.append(el('span', 'lbl', w.fr)); }
    else t.classList.add(t === picked ? 'wrong' : 'dim');
  }
  await feedback(ok, w, foot, w.fr);
  return { correct: ok };
}

async function pickCh(ch) {
  const w = ch.word;
  const { body, foot } = frame('What colour is this?', [['What colour is this? Tap a word to hear it.', 'en']]);
  const col = el('div', 'col');
  body.append(el('div', 'pic big', picSVG(w)), col);
  const go = el('button', 'btn go', '✓ OK');
  go.disabled = true;
  foot.append(go);
  let sel = null;
  for (const o of ch.options) {
    const b = el('button', 'word', o.fr);
    b.dataset.id = o.id;
    b.addEventListener('click', () => {
      if (go.dataset.done) return;
      sel = o; say([[o.fr, 'fr']]);
      for (const x of col.children) x.classList.toggle('sel', x === b);
      go.disabled = false;
    });
    col.append(b);
  }
  await click(go);
  go.dataset.done = '1';
  const ok = sel.id === w.id;
  for (const x of col.children) {
    x.classList.remove('sel');
    if (x.dataset.id === w.id) x.classList.add('right');
    else x.classList.add(x.dataset.id === sel.id ? 'wrong' : 'dim');
  }
  await feedback(ok, w, foot, w.fr);
  return { correct: ok };
}

async function sentenceCh(ch) {
  const w = ch.word, s = ch.sentence, full = s.fr.join(' ');
  const { body, foot } = frame('Build the sentence!', [['Build the sentence!', 'en'], [full + '.', 'fr']]);
  const col = el('div', 'col wide');
  const slots = el('div', 'slots'), bank = el('div', 'bank');
  col.append(el('div', 'en-small', '“' + s.en + '”'), slots, bank);
  body.append(el('div', 'pic mid', picSVG(w, 'balloon')), col);
  const go = el('button', 'btn go', '✓ OK');
  go.disabled = true;
  foot.append(go);
  let locked = false;
  for (const tword of s.tiles) {
    const t = el('button', 'tile', tword);
    t.addEventListener('click', () => {
      if (locked) return;
      if (t.parentNode === bank) {
        if (slots.children.length >= s.fr.length) return;
        say([[tword, 'fr']]); slots.append(t);
      } else bank.append(t);
      sfx.tap();
      go.disabled = slots.children.length !== s.fr.length;
    });
    bank.append(t);
  }
  await click(go);
  locked = true;
  const ok = [...slots.children].map((t) => t.textContent).join(' ') === full;
  slots.classList.add(ok ? 'right' : 'wrong');
  if (!ok) {
    const fix = el('div', 'slots right');
    for (const x of s.fr) fix.append(el('span', 'tile', x));
    bank.replaceWith(fix);
  }
  await feedback(ok, w, foot, full);
  return { correct: ok };
}

function listenOnce() {
  return new Promise((res) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; res(v); } };
    try {
      const r = new SR();
      r.lang = 'fr-FR'; r.maxAlternatives = 5; r.interimResults = false;
      r.onresult = (e) => fin({ alts: Array.from(e.results[0]).map((a) => a.transcript) });
      r.onerror = (e) => fin({ error: e.error || 'error' });
      r.onend = () => fin({ error: 'no-speech' });
      r.start();
      setTimeout(() => { try { r.stop(); } catch (e) {} }, 6000);
    } catch (e) { fin({ error: 'start' }); }
  });
}

async function micCh(ch) {
  const w = ch.word;
  const { body, foot } = frame('Say it in French!', [['Say it in French!', 'en'], [w.fr, 'fr']]);
  const col = el('div', 'col');
  const status = el('div', 'en-small', 'Tap the microphone, then say it!');
  col.append(el('div', 'fr-big', w.fr), status);
  body.append(el('div', 'pic big', picSVG(w)), col);
  const go = el('button', 'btn go micbtn', '🎤');
  const skip = el('button', 'btn ghost', 'Skip ➡');
  foot.append(go, skip);
  for (let tries = 0; tries < 3; tries++) {
    const which = await Promise.race([click(go).then(() => 'go'), click(skip).then(() => 'skip')]);
    if (which === 'skip') return { correct: false, skipped: true };
    stopSpeech();
    go.disabled = true; go.classList.add('listening'); status.textContent = 'Listening… say “' + w.fr + '”';
    const r = await listenOnce();
    go.disabled = false; go.classList.remove('listening');
    if (r.error && r.error !== 'no-speech' && r.error !== 'aborted') { mic.broken = true; return 'fallback'; }
    if (r.alts && r.alts.some((a) => strip(a).split(/\s+/).some((x) => w.alts.includes(x)))) {
      await feedback(true, w, foot, w.fr);
      return { correct: true };
    }
    sfx.wrong();
    status.textContent = tries < 2 ? 'Almost! Listen and try again.' : '';
    await say([[w.fr, 'fr']]);
  }
  // Three goes and the computer still didn't catch it: no punishment, just move on.
  foot.innerHTML = '';
  const b = el('button', 'btn', 'OK 👍');
  foot.append(el('div', 'fb retry', 'Great trying! Keep going!'), b);
  say([['Great trying!', 'en']]);
  await click(b);
  return { correct: false, skipped: true };
}

export async function runChallenge(ch) {
  root.classList.remove('hidden');
  try {
    if (ch.isNew) await intro(ch.word);
    if (ch.type === 'mic') {
      const r = await micCh(ch);
      if (r !== 'fallback') return r;
      return await pickCh(ch);   // mic not working: quietly switch to another kind of question
    }
    return await { listen: listenCh, pick: pickCh, sentence: sentenceCh }[ch.type](ch);
  } finally {
    root.classList.add('hidden');
    card.innerHTML = '';
    stopSpeech();
  }
}
