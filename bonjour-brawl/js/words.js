// French words for all 8 themes, saved progress (in this browser only), and the "words come back" logic.
const KEY = 'bonjourBrawl.v1';
const strip = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[^a-z ]/g, ' ').trim();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// [id, french, english, picture, sentence tiles, sentence in English, extra things the mic may hear]
const RAW = {
  greetings: ['Greetings', '👋', '#ff8a1f', [
    ['bonjour', 'bonjour', 'hello', '☀️'], ['aurevoir', 'au revoir', 'goodbye', '👋'], ['merci', 'merci', 'thank you', '🎁'],
    ['oui', 'oui', 'yes', '👍'], ['non', 'non', 'no', '👎'], ['svp', "s'il te plaît", 'please', '🙏'],
    ['bonnenuit', 'bonne nuit', 'good night', '🌙'], ['pardon', 'pardon', 'sorry', '🙈'],
  ]],
  colours: ['Colours', '🎨', '#e8372c', [
    ['rouge', 'rouge', 'red', '#e8372c'], ['bleu', 'bleu', 'blue', '#2f7fe6', 0, 0, ['blue']], ['jaune', 'jaune', 'yellow', '#ffd21f', 0, 0, ['jeune']],
    ['vert', 'vert', 'green', '#35b34a', 0, 0, ['verre', 'vers']], ['orange', 'orange', 'orange', '#ff8a1f'], ['rose', 'rose', 'pink', '#ff6fb1'],
    ['violet', 'violet', 'purple', '#8e4fd6'], ['noir', 'noir', 'black', '#23232b'], ['blanc', 'blanc', 'white', '#ffffff', 0, 0, ['blanche']],
    ['marron', 'marron', 'brown', '#8a5a33', 0, 0, ['marrant']],
  ]],
  numbers: ['Numbers', '🔢', '#35b34a', [
    ['un', 'un', 'one', 1], ['deux', 'deux', 'two', 2], ['trois', 'trois', 'three', 3], ['quatre', 'quatre', 'four', 4], ['cinq', 'cinq', 'five', 5],
    ['six', 'six', 'six', 6], ['sept', 'sept', 'seven', 7, 0, 0, ['cet', 'set']], ['huit', 'huit', 'eight', 8, 0, 0, ['oui']], ['neuf', 'neuf', 'nine', 9], ['dix', 'dix', 'ten', 10, 0, 0, ['dis']],
  ]],
  animals: ['Animals', '🐾', '#8a5a33', [
    ['chat', 'le chat', 'cat', '🐱', ["C'est", 'un', 'chat'], "It's a cat"], ['chien', 'le chien', 'dog', '🐶', ["C'est", 'un', 'chien'], "It's a dog"],
    ['oiseau', "l'oiseau", 'bird', '🐦', ["C'est", 'un', 'oiseau'], "It's a bird"], ['poisson', 'le poisson', 'fish', '🐟', ["C'est", 'un', 'poisson'], "It's a fish"],
    ['cheval', 'le cheval', 'horse', '🐴', ["C'est", 'un', 'cheval'], "It's a horse"], ['lapin', 'le lapin', 'rabbit', '🐰', ["C'est", 'un', 'lapin'], "It's a rabbit"],
    ['vache', 'la vache', 'cow', '🐮', ["C'est", 'une', 'vache'], "It's a cow"], ['cochon', 'le cochon', 'pig', '🐷', ["C'est", 'un', 'cochon'], "It's a pig"],
  ]],
  food: ['Food', '🍎', '#e8372c', [
    ['pomme', 'la pomme', 'apple', '🍎', ['Je', 'mange', 'une', 'pomme'], 'I eat an apple'], ['pain', 'le pain', 'bread', '🥖', ['Je', 'mange', 'du', 'pain'], 'I eat bread'],
    ['fromage', 'le fromage', 'cheese', '🧀', ['Je', 'mange', 'du', 'fromage'], 'I eat cheese'], ['gateau', 'le gâteau', 'cake', '🍰', ['Je', 'mange', 'un', 'gâteau'], 'I eat a cake'],
    ['lait', 'le lait', 'milk', '🥛', ['Je', 'bois', 'du', 'lait'], 'I drink milk', ['les']], ['eau', "l'eau", 'water', '💧', ['Je', 'bois', 'de', "l'eau"], 'I drink water', ['lo', 'leau']],
    ['banane', 'la banane', 'banana', '🍌', ['Je', 'mange', 'une', 'banane'], 'I eat a banana'], ['croissant', 'le croissant', 'croissant', '🥐', ['Je', 'mange', 'un', 'croissant'], 'I eat a croissant'],
  ]],
  body: ['My body', '🖐️', '#ff6fb1', [
    ['main', 'la main', 'hand', '✋', ["C'est", 'ma', 'main'], 'This is my hand'], ['pied', 'le pied', 'foot', '🦶', ["C'est", 'mon', 'pied'], 'This is my foot'],
    ['nez', 'le nez', 'nose', '👃', ["C'est", 'mon', 'nez'], 'This is my nose', ['ne']], ['bouche', 'la bouche', 'mouth', '👄', ["C'est", 'ma', 'bouche'], 'This is my mouth'],
    ['yeux', 'les yeux', 'eyes', '👀', ['Voici', 'mes', 'yeux'], 'Here are my eyes', ['yeu', 'zyeux']], ['oreille', "l'oreille", 'ear', '👂', ["C'est", 'mon', 'oreille'], 'This is my ear'],
    ['bras', 'le bras', 'arm', '💪', ["C'est", 'mon', 'bras'], 'This is my arm'], ['jambe', 'la jambe', 'leg', '🦵', ["C'est", 'ma', 'jambe'], 'This is my leg'],
  ]],
  family: ['Family', '👪', '#8e4fd6', [
    ['maman', 'maman', 'mum', '👩', ["J'aime", 'ma', 'maman'], 'I love my mum'], ['papa', 'papa', 'dad', '👨', ["J'aime", 'mon', 'papa'], 'I love my dad'],
    ['frere', 'le frère', 'brother', '👦', ["J'aime", 'mon', 'frère'], 'I love my brother'], ['soeur', 'la sœur', 'sister', '👧', ["J'aime", 'ma', 'sœur'], 'I love my sister', ['soeur', 'sur']],
    ['bebe', 'le bébé', 'baby', '👶', ["J'aime", 'le', 'bébé'], 'I love the baby'], ['mamie', 'mamie', 'grandma', '👵', ["J'aime", 'ma', 'mamie'], 'I love my grandma'],
    ['papi', 'papi', 'grandpa', '👴', ["J'aime", 'mon', 'papi'], 'I love my grandpa', ['papy']], ['famille', 'la famille', 'family', '👪', ["J'aime", 'ma', 'famille'], 'I love my family'],
  ]],
  clothes: ['Clothes', '👕', '#2f7fe6', [
    ['tshirt', 'le t-shirt', 'T-shirt', '👕', ['Je', 'porte', 'un', 't-shirt'], 'I am wearing a T-shirt', ['shirt']], ['pantalon', 'le pantalon', 'trousers', '👖', ['Je', 'porte', 'un', 'pantalon'], 'I am wearing trousers'],
    ['robe', 'la robe', 'dress', '👗', ['Je', 'porte', 'une', 'robe'], 'I am wearing a dress'], ['chaussures', 'les chaussures', 'shoes', '👟', ['Je', 'porte', 'des', 'chaussures'], 'I am wearing shoes', ['chaussure']],
    ['chapeau', 'le chapeau', 'hat', '🎩', ['Je', 'porte', 'un', 'chapeau'], 'I am wearing a hat'], ['chaussettes', 'les chaussettes', 'socks', '🧦', ['Je', 'porte', 'des', 'chaussettes'], 'I am wearing socks', ['chaussette']],
    ['manteau', 'le manteau', 'coat', '🧥', ['Je', 'porte', 'un', 'manteau'], 'I am wearing a coat'], ['echarpe', "l'écharpe", 'scarf', '🧣', ['Je', 'porte', 'une', 'écharpe'], 'I am wearing a scarf'],
  ]],
};

export const THEMES = Object.entries(RAW).map(([id, [name, emoji, hex, list]]) => {
  const theme = { id, name, emoji, hex, words: [] };
  for (const [wid, fr, en, pic, sent, sentEn, extra] of list) {
    const w = { id: wid, fr, en, theme, hex: id === 'colours' ? pic : hex };
    if (id === 'colours') { w.kind = 'colour'; w.sent = ['Le', 'ballon', 'est', fr]; w.sentEn = 'The balloon is ' + en; }
    else if (id === 'numbers') { w.kind = 'number'; w.n = pic; w.sent = pic === 1 ? ["J'ai", 'un', 'ballon'] : ["J'ai", fr, 'ballons']; w.sentEn = pic === 1 ? 'I have one balloon' : `I have ${en} balloons`; }
    else if (id === 'greetings') { w.kind = 'emoji'; w.emoji = pic; w.sent = [cap(fr), 'mon', 'ami']; w.sentEn = cap(en) + ', my friend'; }
    else { w.kind = 'emoji'; w.emoji = pic; w.sent = sent; w.sentEn = sentEn; }
    w.key = w.sent[id === 'greetings' ? 0 : w.sent.length - 1];      // the tile that belongs to this word
    if (id === 'numbers') w.key = fr;
    w.alts = [strip(fr).split(' ').pop(), ...(extra || [])];
    theme.words.push(w);
  }
  return theme;
});
export const WORDS = THEMES.flatMap((t) => t.words);
export const byId = Object.fromEntries(WORDS.map((w) => [w.id, w]));

// The tower: 8 opponents, one theme each. The last one is the boss and reviews everything.
export const FLOORS = [
  { char: 'chat', arena: 'paris' }, { char: 'croissant', arena: 'bakery' }, { char: 'robo', arena: 'paris' }, { char: 'coq', arena: 'beach' },
  { char: 'macaron', arena: 'bakery' }, { char: 'fromage', arena: 'beach' }, { char: 'escargot', arena: 'castle' }, { char: 'roi', arena: 'castle' },
].map((f, i) => ({ ...f, i, theme: THEMES[i], boss: i === 7 }));
export const ROSTER = ['croissant', 'chat', 'robo', 'coq', 'macaron', 'fromage', 'escargot', 'roi'];
export const FIGHTER_STARS = { croissant: 0, chat: 0, robo: 2, coq: 4, macaron: 7, fromage: 10, escargot: 13, roi: 17 };
export const COSTUME_STARS = [0, 5, 12];

// ---------------------------------------------------------------- saved progress
const fresh = () => ({ v: 1, fighter: null, costume: {}, stars: [0, 0, 0, 0, 0, 0, 0, 0], xp: 0, streak: 0, lastDay: '', fights: 0, wins: 0, howTo: false, muted: false, mic: false, words: {} });
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      const m = Object.assign(fresh(), s);
      if (s.bestStars && !s.stars) m.stars[1] = s.bestStars;   // progress from the first small version (colours)
      return m;
    }
  } catch (e) {}
  return fresh();
}
export const save = load();
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

export const totalStars = () => save.stars.reduce((a, b) => a + b, 0);
export const level = () => Math.floor(save.xp / 100) + 1;
export const floorOpen = (i) => i === 0 || save.stars[i] > 0 || save.stars[i - 1] > 0;
export const nextFloor = () => { const i = save.stars.findIndex((s) => s === 0); return i < 0 ? -1 : i; };
export const fighterOpen = (id) => totalStars() >= FIGHTER_STARS[id];
export const costumeOpen = (i) => totalStars() >= COSTUME_STARS[i];

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export function streakNow() {      // the flame only counts if they played today or yesterday
  const t = new Date(), y = new Date(); y.setDate(y.getDate() - 1);
  return save.lastDay === dayKey(t) || save.lastDay === dayKey(y) ? save.streak : 0;
}
export function touchStreak() {
  const t = new Date(), y = new Date(); y.setDate(y.getDate() - 1);
  if (save.lastDay === dayKey(t)) return false;
  save.streak = save.lastDay === dayKey(y) ? save.streak + 1 : 1;
  save.lastDay = dayKey(t);
  return true;
}

const seenCount = (id) => (save.words[id] ? save.words[id].seen : 0);
function stat(id) { return save.words[id] || (save.words[id] = { box: 0, seen: 0, right: 0, wrong: 0 }); }
export const isLearned = (w) => seenCount(w.id) > 0;
export const strength = (w) => (save.words[w.id] ? save.words[w.id].box : 0);

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function weighted(pool) {      // weaker words (low "box") are picked more often
  const wts = pool.map((w) => 1 / Math.pow(1 + stat(w.id).box, 1.4));
  let r = Math.random() * wts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= wts[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

// One fight = up to 5 new words from the opponent's theme + review of older words.
export function planSession(floor) {
  const words = floor.theme.words;
  const seen = words.filter(isLearned), unseen = words.filter((w) => !isLearned(w));
  let nNew;
  if (seen.length < 5) nNew = 5 - seen.length;
  else nNew = seen.reduce((a, w) => a + stat(w.id).box, 0) / seen.length >= 1.5 ? 5 : 0;
  const older = WORDS.filter((w) => w.theme !== floor.theme && isLearned(w));
  return { floor, review: seen.slice(), older, olderRate: floor.boss ? 0.6 : 0.25, newQ: unseen.slice(0, nNew), retry: [], n: 0, last: null, typeI: 0, newI: 0, asked: 0, right: 0, used: new Set() };
}

export function nextChallenge(s, micOK) {
  s.n++;
  let word = null, isNew = false;
  const ri = s.retry.findIndex((r) => r.due <= s.n && r.id !== s.last);
  if (s.newQ.length && (s.review.length < 2 || s.n % 2 === 1)) {
    word = s.newQ.shift(); isNew = true; s.review.push(word);
  } else if (ri >= 0) {
    word = byId[s.retry.splice(ri, 1)[0].id];           // a word they got wrong comes back
  } else {
    const useOlder = s.older.length && (Math.random() < s.olderRate || !s.review.length);
    let pool = (useOlder ? s.older : s.review).filter((w) => w.id !== s.last);
    if (!pool.length) pool = s.review.length ? s.review : s.older;
    word = weighted(pool);
  }
  let type;
  if (isNew) type = s.newI++ % 2 === 0 ? 'listen' : 'pick';
  else {
    const cyc = micOK ? ['sentence', 'listen', 'mic', 'pick'] : ['sentence', 'listen', 'pick'];
    type = cyc[s.typeI++ % cyc.length];
  }
  // wrong choices come from the same theme; prefer words the child has already met
  const mates = word.theme.words.filter((w) => w.id !== word.id);
  const known = shuffle(mates.filter(isLearned).concat(s.review.filter((w) => w.theme === word.theme && w.id !== word.id && !isLearned(w))));
  const rest = shuffle(mates.filter((w) => !known.includes(w)));
  const others = known.concat(rest).slice(0, 2);
  const decoy = others.find((o) => o.key !== word.key && !word.sent.includes(o.key)) || others[0];
  return { type, word, isNew, options: shuffle([word, ...others]), sentence: { fr: word.sent, en: word.sentEn, tiles: shuffle([...word.sent, decoy.key]) } };
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

// ---------------------------------------------------------------- pictures (drawn as code, no image files)
const INK = '#1d1b3a';
export function picSVG(word, forSentence) {
  if (word.kind === 'emoji') {
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="54" font-size="70" text-anchor="middle" dominant-baseline="middle">${word.emoji}</text></svg>`;
  }
  if (word.kind === 'number') {
    let dots = '';
    for (let i = 0; i < word.n; i++) dots += `<circle cx="${14 + (i % 5) * 18}" cy="${i < 5 ? 74 : 90}" r="6.5" fill="#ff8a1f" stroke="${INK}" stroke-width="2.5"/>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="36" font-size="${word.n === 10 ? 54 : 62}" font-weight="900" font-family="Arial Rounded MT Bold,Trebuchet MS,Verdana,sans-serif" text-anchor="middle" dominant-baseline="middle" fill="#35b34a" stroke="${INK}" stroke-width="4" paint-order="stroke">${word.n}</text>${dots}</svg>`;
  }
  const c = word.hex;
  if (forSentence) {
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 74 q-8 12 2 24" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M44 76 l12 0 l-6 -9z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="50" cy="38" rx="30" ry="34" fill="${c}" stroke="${INK}" stroke-width="5"/><ellipse cx="39" cy="24" rx="7" ry="11" fill="#fff" opacity=".55" transform="rotate(-25 39 24)"/></svg>`;
  }
  const dots = [[50, 50, 30], [22, 34, 12], [76, 30, 10], [80, 64, 13], [30, 76, 12], [56, 84, 9], [12, 58, 6], [90, 44, 5], [50, 15, 9]];
  const circ = dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${INK}" stroke="${INK}" stroke-width="9">${circ}</g><g fill="${c}">${circ}</g><ellipse cx="40" cy="38" rx="9" ry="5" fill="#fff" opacity=".5" transform="rotate(-30 40 38)"/></svg>`;
}
