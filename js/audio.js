// Geluid in Letterland:
//  - eigen opnames van de ouder (bewaard in IndexedDB op het toestel, en via
//    store.js gesynchroniseerd naar Firestore zodat elk toestel ze heeft)
//  - de ingebouwde spraak van het toestel (bij voorkeur Vlaams) als terugval
//
// Alle afspeelacties gaan via één gedeeld <audio>-element: op iOS mag een
// audio-element pas geluid maken nadat het één keer binnen een tik van de
// gebruiker gestart is (zie unlock()), daarna mag het vrij afspelen.

import { LETTER_BY_ID, PHRASES } from './data.js';

const clips = new Map();     // sleutel -> { url, v }
const player = new Audio();
player.preload = 'auto';
let generation = 0;          // verhoogt bij elke nieuwe afspeelopdracht; oude ketens stoppen dan

// ---------- IndexedDB ----------

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('letterland', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('clips');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function idb(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction('clips', mode);
    const req = fn(tx.objectStore('clips'));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  }));
}

export async function initAudio() {
  try {
    const d = await db();
    await new Promise((resolve) => {
      const tx = d.transaction('clips', 'readonly');
      const req = tx.objectStore('clips').openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve();
        clips.set(cur.key, { url: URL.createObjectURL(cur.value.blob), v: cur.value.v, blob: cur.value.blob });
        cur.continue();
      };
      req.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('IndexedDB niet beschikbaar, opnames enkel tijdelijk', e);
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  // Safari 16.4+: laat geluid ook spelen als de iPhone op stil staat.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
}

export const hasClip = key => clips.has(key);
export const clipVersion = key => clips.get(key)?.v || 0;
export const clipKeys = () => [...clips.keys()];
export const clipBlob = key => clips.get(key)?.blob;

export async function saveClip(key, blob, v = Date.now()) {
  const old = clips.get(key);
  if (old) URL.revokeObjectURL(old.url);
  clips.set(key, { url: URL.createObjectURL(blob), v, blob });
  try { await idb('readwrite', s => s.put({ blob, v }, key)); } catch (e) {}
  return v;
}

export async function deleteClip(key) {
  const old = clips.get(key);
  if (old) URL.revokeObjectURL(old.url);
  clips.delete(key);
  try { await idb('readwrite', s => s.delete(key)); } catch (e) {}
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(url) {
  return (await fetch(url)).blob();
}

// ---------- Sleutels ----------
// Enkel [a-z0-9_] zodat ze veilig in Firestore-veldpaden passen.

export const letterKey = id => 'k_' + id;
export const phraseKey = id => 'p_' + id;
export const wordKey = w => 'w_' + w.normalize('NFD').replace(/[^a-z]/g, '');

// ---------- Spraak (terugval) ----------

let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'nl-BE') ||
          vs.find(v => v.lang?.replace('_', '-') === 'nl-BE') ||
          vs.find(v => v.lang?.startsWith('nl')) || null;
}

function speakNow(text, gen) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window) || gen !== generation) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang || 'nl-BE';
    if (voice) u.voice = voice;
    u.rate = 0.85;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    u.onend = finish;
    u.onerror = finish;
    // iOS laat onend soms niet vuren; zorg dat een keten nooit blijft hangen.
    setTimeout(finish, 1200 + text.length * 110);
    speechSynthesis.speak(u);
  });
}

function playUrl(url, gen) {
  return new Promise(resolve => {
    if (gen !== generation) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      player.onended = player.onerror = null;
      resolve();
    };
    player.onended = finish;
    player.onerror = finish;
    player.src = url;
    player.currentTime = 0;
    const p = player.play();
    if (p && p.catch) p.catch(finish);
    setTimeout(finish, 8000);
  });
}

// ---------- Afspelen ----------
// Een "stuk" is { key, text }: de opname als die er is, anders de tekst via spraak.

function pieceFor(kind, id) {
  if (kind === 'letter') return { key: letterKey(id), text: LETTER_BY_ID[id]?.say || id };
  if (kind === 'phrase') return { key: phraseKey(id), text: PHRASES[id] };
  if (kind === 'word') return { key: wordKey(id), text: id };
  if (kind === 'text') return { key: null, text: id };
  throw new Error('onbekend geluid ' + kind);
}

async function playPiece(piece, gen) {
  const clip = piece.key && clips.get(piece.key);
  if (clip) await playUrl(clip.url, gen);
  else if (piece.text) await speakNow(piece.text, gen);
}

export function stopAll() {
  generation++;
  try { player.pause(); } catch (e) {}
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Speelt een reeks geluiden na elkaar, bv. play(['phrase','hoor'], ['letter','m']).
// Een nieuwe play() onderbreekt de vorige. Een getal in de lijst = pauze in ms.
// onStep(i) wordt opgeroepen vlak voor stuk i begint (gebruikt voor oplichten bij zoemen).
export async function play(...items) {
  let onStep = null;
  if (typeof items[items.length - 1] === 'function') onStep = items.pop();
  stopAll();
  const gen = generation;
  let step = 0;
  for (const it of items) {
    if (gen !== generation) return false;
    if (typeof it === 'number') { await wait(it); continue; }
    onStep && onStep(step++);
    await playPiece(pieceFor(it[0], it[1]), gen);
    await wait(120);
  }
  return gen === generation;
}

export const wait = ms => new Promise(r => setTimeout(r, ms));

// Moet opgeroepen worden binnen een tik van de gebruiker (startscherm).
export function unlock() {
  try {
    player.src = SILENT_WAV;
    const p = player.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) {}
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }
}

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

// ---------- Opnemen ----------
// Neemt op via de Web Audio API en maakt zelf een WAV-bestand: dat speelt
// betrouwbaar af op elk toestel (iOS, Android, Windows), wat bij de ingebouwde
// MediaRecorder-formaten niet gegarandeerd is. Stilte voor en na wordt
// automatisch weggeknipt en het volume wordt gelijkgetrokken.

export async function startRecording(maxMs = 3000) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  proc.onaudioprocess = e => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(proc);
  proc.connect(ctx.destination);

  let resolveStop;
  const result = new Promise(r => (resolveStop = r));
  let stopped = false;
  const stop = () => {
    if (stopped) return result;
    stopped = true;
    proc.disconnect();
    src.disconnect();
    stream.getTracks().forEach(t => t.stop());
    const rate = ctx.sampleRate;
    ctx.close();
    resolveStop(encodeWav(trimAndNormalize(concat(chunks), rate), rate));
    return result;
  };
  const timer = setTimeout(stop, maxMs);
  return { stop: () => { clearTimeout(timer); return stop(); }, result };
}

function concat(chunks) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

function trimAndNormalize(s, rate) {
  let peak = 0;
  for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]));
  if (peak < 0.01) return s; // enkel stilte; laat zoals het is
  const th = Math.max(0.02, peak * 0.08);
  let a = 0, b = s.length - 1;
  while (a < s.length && Math.abs(s[a]) < th) a++;
  while (b > a && Math.abs(s[b]) < th) b--;
  const pad = Math.round(rate * 0.08);
  a = Math.max(0, a - pad);
  b = Math.min(s.length - 1, b + pad * 2);
  const out = s.slice(a, b + 1);
  const gain = 0.9 / peak;
  const fade = Math.min(Math.round(rate * 0.01), out.length >> 2);
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fade) g *= i / fade;
    if (i > out.length - fade) g *= (out.length - i) / fade;
    out[i] *= g;
  }
  return out;
}

function encodeWav(samples, inRate) {
  // Herbemonsteren naar 22050 Hz mono, 16-bit: klein genoeg voor Firestore.
  const rate = 22050;
  const ratio = inRate / rate;
  const n = Math.floor(samples.length / ratio);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, samples[Math.floor(i * ratio)]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}
