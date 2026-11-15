// Sounds made in code (WebAudio) + spoken voices (browser speech). No audio files.
export const settings = { muted: false };

let ac = null, master = null;
export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { /* no sound available */ }
}

function tone(f, t, d, { type = 'square', v = 0.22, to = null } = {}) {
  if (!ac || settings.muted) return;
  const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime + t;
  o.type = type;
  o.frequency.setValueAtTime(f, s);
  if (to) o.frequency.exponentialRampToValueAtTime(to, s + d);
  g.gain.setValueAtTime(0.0001, s);
  g.gain.exponentialRampToValueAtTime(v, s + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, s + d);
  o.connect(g); g.connect(master);
  o.start(s); o.stop(s + d + 0.03);
}

let noiseBuf = null;
function noise(t, d, { v = 0.3, f = 1200, type = 'lowpass' } = {}) {
  if (!ac || settings.muted) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const a = noiseBuf.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain(), s = ac.currentTime + t;
  src.buffer = noiseBuf;
  flt.type = type; flt.frequency.value = f;
  g.gain.setValueAtTime(v, s);
  g.gain.exponentialRampToValueAtTime(0.0001, s + d);
  src.connect(flt); flt.connect(g); g.connect(master);
  src.start(s); src.stop(s + d + 0.02);
}

export const sfx = {
  tap() { tone(660, 0, 0.07, { type: 'triangle', v: 0.2 }); },
  whoosh() { noise(0, 0.12, { v: 0.12, f: 2500, type: 'bandpass' }); },
  hit() { noise(0, 0.1, { v: 0.4, f: 900 }); tone(190, 0, 0.12, { type: 'sine', v: 0.4, to: 70 }); },
  bigHit() { noise(0, 0.22, { v: 0.5, f: 700 }); tone(240, 0, 0.25, { type: 'sine', v: 0.5, to: 50 }); tone(880, 0.02, 0.12, { type: 'square', v: 0.12, to: 440 }); },
  block() { tone(520, 0, 0.06, { type: 'square', v: 0.14 }); noise(0, 0.05, { v: 0.15, f: 3000, type: 'highpass' }); },
  jump() { tone(300, 0, 0.16, { type: 'triangle', v: 0.2, to: 640 }); },
  chime() { [784, 988, 1175].forEach((f, i) => tone(f, i * 0.09, 0.22, { type: 'triangle', v: 0.22 })); },
  correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.2, { type: 'triangle', v: 0.25 })); },
  wrong() { tone(392, 0, 0.18, { type: 'sine', v: 0.22 }); tone(330, 0.16, 0.26, { type: 'sine', v: 0.22 }); },
  meterFull() { [523, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.06, 0.25, { type: 'square', v: 0.13 })); },
  superCharge() { tone(140, 0, 0.9, { type: 'sawtooth', v: 0.2, to: 1400 }); noise(0, 0.9, { v: 0.1, f: 4000, type: 'bandpass' }); },
  superBoom() { noise(0, 0.6, { v: 0.6, f: 500 }); tone(160, 0, 0.6, { type: 'sine', v: 0.6, to: 35 }); [1319, 1568, 2093].forEach((f, i) => tone(f, 0.05 + i * 0.07, 0.3, { type: 'triangle', v: 0.15 })); },
  ko() { tone(700, 0, 0.7, { type: 'triangle', v: 0.25, to: 180 }); [1568, 1319, 1568, 1319, 1568].forEach((f, i) => tone(f, 0.5 + i * 0.12, 0.1, { type: 'sine', v: 0.14 })); },
  star() { tone(1175, 0, 0.1, { type: 'triangle', v: 0.25 }); tone(1568, 0.08, 0.22, { type: 'triangle', v: 0.25 }); },
  jingle() {
    const n = [[523, 0], [523, 0.13], [523, 0.26], [659, 0.39], [784, 0.58], [659, 0.75], [784, 0.9], [1047, 1.08]];
    n.forEach(([f, t], i) => { tone(f, t, i === n.length - 1 ? 0.6 : 0.16, { type: 'square', v: 0.14 }); tone(f / 2, t, 0.16, { type: 'triangle', v: 0.16 }); });
  },
};

// ---------- Speech (browser built-in voices; nothing is sent by the game) ----------
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
function refreshVoices() { try { voices = synth.getVoices() || []; } catch (e) { voices = []; } }
if (synth) {
  refreshVoices();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', refreshVoices);
  else synth.onvoiceschanged = refreshVoices;
}

function voiceFor(lang) {
  const exact = lang === 'fr' ? ['fr-fr'] : ['en-us', 'en-gb'];
  let best = null, score = 0;
  for (const v of voices) {
    const l = (v.lang || '').replace('_', '-').toLowerCase();
    let s = 0;
    if (exact.includes(l)) s = 3 - exact.indexOf(l) * 0.5;
    else if (l.startsWith(lang)) s = 1;
    if (s && v.localService) s += 0.2;
    if (s > score) { score = s; best = v; }
  }
  return best;
}

let seq = 0, keep = null;
export function stopSpeech() { seq++; try { if (synth) synth.cancel(); } catch (e) {} }

function speakOne(text, lang) {
  return new Promise((res) => {
    if (!synth || settings.muted || !text) return res();
    if (!voices.length) refreshVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    const v = voiceFor(lang);
    if (v) u.voice = v;
    u.rate = lang === 'fr' ? 0.8 : 0.95;
    u.pitch = 1.1;
    let done = false;
    const fin = () => { if (!done) { done = true; clearTimeout(to); res(); } };
    const to = setTimeout(fin, voices.length ? 1500 + text.length * 120 : 350);
    u.onend = fin; u.onerror = fin;
    keep = u; // keep a reference so the browser doesn't drop the "finished" event
    try { synth.speak(u); } catch (e) { fin(); }
  });
}

// say([['Listen!', 'en'], ['rouge', 'fr']]) – speaks each part in order; a new say() interrupts the old one.
export async function say(parts) {
  const my = ++seq;
  try { if (synth && (synth.speaking || synth.pending)) synth.cancel(); } catch (e) {}
  for (const [text, lang] of parts) {
    if (my !== seq) return;
    await speakOne(text, lang);
  }
}
