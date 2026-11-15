// French words, saved progress (in this browser only) and the "words come back" logic.
const KEY = 'bonjourBrawl.v1';

export const WORDS = [
  { id: 'rouge', fr: 'rouge', en: 'red', hex: '#e8372c', alts: ['rouge', 'rouges'] },
  { id: 'bleu', fr: 'bleu', en: 'blue', hex: '#2f7fe6', alts: ['bleu', 'bleue', 'bleus', 'blue'] },
  { id: 'jaune', fr: 'jaune', en: 'yellow', hex: '#ffd21f', alts: ['jaune', 'jaunes', 'jeune'] },
  { id: 'vert', fr: 'vert', en: 'green', hex: '#35b34a', alts: ['vert', 'verte', 'verts', 'verre', 'vers', 'ver'] },
  { id: 'orange', fr: 'orange', en: 'orange', hex: '#ff8a1f', alts: ['orange', 'oranges'] },
  { id: 'rose', fr: 'rose', en: 'pink', hex: '#ff6fb1', alts: ['rose', 'roses'] },
  { id: 'violet', fr: 'violet', en: 'purple', hex: '#8e4fd6', alts: ['violet', 'violette', 'violets'] },
  { id: 'noir', fr: 'noir', en: 'black', hex: '#23232b', alts: ['noir', 'noire', 'noirs'] },
  { id: 'blanc', fr: 'blanc', en: 'white', hex: '#ffffff', alts: ['blanc', 'blancs', 'blanche'] },
  { id: 'marron', fr: 'marron', en: 'brown', hex: '#8a5a33', alts: ['marron', 'marrons', 'marrant'] },
];
export const byId = Object.fromEntries(WORDS.map((w) => [w.id, w]));

const fresh = () => ({ v: 1, fighter: null, bestStars: 0, fights: 0, wins: 0, howTo: false, muted: false, mic: false, words: {} });
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) return Object.assign(fresh(), s);
  } catch (e) {}
  return fresh();
}
export const save = load();
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

const seenCount = (id) => (save.words[id] ? save.words[id].seen : 0);
function stat(id) { return save.words[id] || (save.words[id] = { box: 0, seen: 0, right: 0, wrong: 0 }); }
export function learnedWords() { return WORDS.filter((w) => seenCount(w.id) > 0); }

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// One fight = up to 5 new words + review of every word seen before.
export function planSession() {
  const seen = WORDS.filter((w) => seenCount(w.id) > 0);
  const unseen = WORDS.filter((w) => seenCount(w.id) === 0);
  let nNew;
  if (seen.length < 5) nNew = 5 - seen.length;
  else nNew = seen.reduce((a, w) => a + stat(w.id).box, 0) / seen.length >= 1.5 ? 5 : 0;
  return { review: seen.slice(), newQ: unseen.slice(0, nNew), retry: [], n: 0, last: null, typeI: 0, newI: 0, asked: 0, right: 0, used: new Set() };
}

export function nextChallenge(s, micOK) {
  s.n++;
  let word = null, isNew = false;
  const ri = s.retry.findIndex((r) => r.due <= s.n && r.id !== s.last);
  if (ri >= 0) {
    word = byId[s.retry.splice(ri, 1)[0].id];           // a word they got wrong comes back
  } else if (s.newQ.length && (s.review.length < 2 || s.n % 2 === 1)) {
    word = s.newQ.shift(); isNew = true; s.review.push(word);
  } else {
    let pool = s.review.filter((w) => w.id !== s.last);
    if (!pool.length) pool = s.review;
    // weaker words (low "box") are picked more often
    const wts = pool.map((w) => 1 / Math.pow(1 + stat(w.id).box, 1.4));
    let r = Math.random() * wts.reduce((a, b) => a + b, 0);
    word = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { r -= wts[i]; if (r <= 0) { word = pool[i]; break; } }
  }
  let type;
  if (isNew) type = s.newI++ % 2 === 0 ? 'listen' : 'pick';
  else {
    const cyc = micOK ? ['sentence', 'listen', 'mic', 'pick'] : ['sentence', 'listen', 'pick'];
    type = cyc[s.typeI++ % cyc.length];
  }
  // wrong choices: prefer words the child has already met
  const known = shuffle(s.review.filter((w) => w.id !== word.id));
  const rest = shuffle(WORDS.filter((w) => w.id !== word.id && !known.includes(w)));
  const others = known.concat(rest).slice(0, 2);
  const ch = { type, word, isNew, options: shuffle([word, ...others]) };
  ch.sentence = { fr: ['Le', 'ballon', 'est', word.fr], en: `The balloon is ${word.en}`, tiles: shuffle(['Le', 'ballon', 'est', word.fr, others[0].fr]) };
  return ch;
}

export function record(s, word, correct) {
  const st = stat(word.id);
  st.seen++; s.asked++; s.used.add(word.id);
  if (correct) { st.right++; st.box = Math.min(4, st.box + 1); s.right++; }
  else { st.wrong++; st.box = Math.max(0, st.box - 1); s.retry.push({ id: word.id, due: s.n + 2 }); }
  s.last = word.id;
  persist();
}

export function starsFor(won, s) {
  if (!won) return 0;
  const acc = s.asked ? s.right / s.asked : 1;
  return acc >= 0.85 ? 3 : acc >= 0.6 ? 2 : 1;
}

// Pictures drawn as code (SVG), no image files.
const INK = '#1d1b3a';
export function picSVG(word, kind = 'splat') {
  const c = word.hex;
  if (kind === 'balloon') {
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 74 q-8 12 2 24" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M44 76 l12 0 l-6 -9z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="50" cy="38" rx="30" ry="34" fill="${c}" stroke="${INK}" stroke-width="5"/><ellipse cx="39" cy="24" rx="7" ry="11" fill="#fff" opacity=".55" transform="rotate(-25 39 24)"/></svg>`;
  }
  const dots = [[50, 50, 30], [22, 34, 12], [76, 30, 10], [80, 64, 13], [30, 76, 12], [56, 84, 9], [12, 58, 6], [90, 44, 5], [50, 15, 9]];
  const circ = (extra) => dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" ${extra}/>`).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${INK}" stroke="${INK}" stroke-width="9">${circ('')}</g><g fill="${c}">${circ('')}</g><ellipse cx="40" cy="38" rx="9" ry="5" fill="#fff" opacity=".5" transform="rotate(-30 40 38)"/></svg>`;
}
