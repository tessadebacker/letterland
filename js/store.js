// Toestand van de app + synchronisatie tussen toestellen.
//
// localStorage is de directe lokale kopie (werkt altijd, ook offline).
// Firestore is de synchronisatielaag erbovenop, met twee lessen uit Tafels Kampioen:
//  1. De Firebase-SDK wordt via een dynamische import() in een try/catch geladen,
//     zodat de app gewoon blijft werken als dat niet lukt (offline, ad-blocker...).
//  2. Elke wijziging schrijft ENKEL de gewijzigde velden weg (updateDoc met
//     veldpaden zoals "progress.m.hoor"), nooit het hele document. Anders
//     overschrijft het ene toestel wat een ander toestel net veranderde.
//     Enkel de allereerste bootstrap en "alles wissen" vervangen het hele document.
//
// Opnames zitten in een aparte collectie (1 document per opname), en in het
// hoofddocument staat per opname enkel een versienummer (state.audio).

import { firebaseConfig } from './firebase-config.js?v=2';
import * as audio from './audio.js?v=2';

const LS_KEY = 'letterland-state-v1';
const DOC_PATH = ['progress', 'letterland-familie'];
const AUDIO_COLLECTION = 'letterlandAudio';
const FB_VERSION = '10.12.2';

export const DEL = Symbol('delete');

export function defaultState() {
  return {
    name: '',
    points: 0,
    progress: {},     // letter -> { hoor, klank, begin, zoek }: aantal keer na elkaar juist (max 3)
    passed: {},       // letter -> true als de toets gehaald is
    lessonSeen: {},   // letter -> true
    words: {},        // woord -> aantal keer na elkaar juist
    readyFor: null,   // letter waarvoor net een foutloze sessie gedaan werd -> toets mag
    retest: null,     // letter waarvan de toets mislukte -> eerst een sessie oefenen
    settings: { ptsSession: 5, ptsToets: 10, ptsWords: 5 },
    rewards: [
      { id: 'r1', emoji: '🍪', name: 'Samen koekjes bakken', price: 30 },
      { id: 'r2', emoji: '📚', name: 'Extra verhaaltje', price: 15 },
      { id: 'r3', emoji: '🛝', name: 'Naar de speeltuin', price: 40 },
    ],
    redeemed: [],     // { name, emoji, price, at }
    audio: {},        // opname-sleutel -> versie (tijdstip)
  };
}

export let state = load();
const listeners = new Set();
export const onChange = fn => listeners.add(fn);
const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return withDefaults(JSON.parse(raw));
  } catch (e) {}
  return defaultState();
}

function withDefaults(s) {
  const d = defaultState();
  return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
}

function persistLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {};
    o = o[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (value === DEL) delete o[last];
  else o[last] = value;
}

// Wijzig één of meer velden: update({ 'progress.m.hoor': 2, points: 15 })
export function update(changes) {
  for (const [path, value] of Object.entries(changes)) setPath(state, path, value);
  persistLocal();
  emit();
  if (fb.ready) {
    const remote = {};
    for (const [path, value] of Object.entries(changes)) {
      remote[path] = value === DEL ? fb.deleteField() : value;
    }
    fb.updateDoc(fb.ref, remote).catch(e => {
      console.warn('Synchroniseren mislukt', e);
      syncStatus = 'fout: ' + e.code;
    });
  }
}

// Alles wissen (enkel voortgang; opnames en beloningen blijven).
export function resetProgress() {
  const keep = { name: state.name, settings: state.settings, rewards: state.rewards, audio: state.audio };
  state = { ...defaultState(), ...keep };
  persistLocal();
  emit();
  if (fb.ready) fb.setDoc(fb.ref, state).catch(e => console.warn(e));
}

// ---------- Opnames ----------

export async function saveRecording(key, blob) {
  const v = await audio.saveClip(key, blob);
  update({ ['audio.' + key]: v });
  if (fb.ready) {
    const data = await audio.blobToDataURL(blob);
    await fb.setDoc(fb.doc(fb.db, AUDIO_COLLECTION, key), { data, v }).catch(e => console.warn(e));
  }
}

export async function deleteRecording(key) {
  await audio.deleteClip(key);
  update({ ['audio.' + key]: DEL });
  if (fb.ready) fb.deleteDoc(fb.doc(fb.db, AUDIO_COLLECTION, key)).catch(e => console.warn(e));
}

// Haal opnames binnen die op een ander toestel gemaakt of gewijzigd zijn.
async function pullRecordings() {
  const wanted = state.audio || {};
  for (const [key, v] of Object.entries(wanted)) {
    if (audio.clipVersion(key) >= v) continue;
    try {
      const snap = await fb.getDoc(fb.doc(fb.db, AUDIO_COLLECTION, key));
      if (!snap.exists()) continue;
      const d = snap.data();
      await audio.saveClip(key, await audio.dataURLToBlob(d.data), d.v);
    } catch (e) { console.warn('Opname ophalen mislukt', key, e); }
  }
  for (const key of audio.clipKeys()) if (!(key in wanted)) await audio.deleteClip(key);
  emit();
}

// Opnames die op dit toestel nieuwer zijn dan op de server (bv. ingesproken
// vóór Firebase gekoppeld was) alsnog uploaden.
async function pushNewerRecordings() {
  for (const key of audio.clipKeys()) {
    const v = audio.clipVersion(key);
    if ((state.audio?.[key] || 0) >= v) continue;
    try {
      const data = await audio.blobToDataURL(audio.clipBlob(key));
      await fb.setDoc(fb.doc(fb.db, AUDIO_COLLECTION, key), { data, v });
      update({ ['audio.' + key]: v });
    } catch (e) { console.warn('Opname uploaden mislukt', key, e); }
  }
}

// ---------- Firebase ----------

const fb = { ready: false };
export let syncStatus = firebaseConfig ? 'verbinden…' : 'enkel op dit toestel (Firebase nog niet ingesteld)';

export async function initSync() {
  if (!firebaseConfig) return;
  try {
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
    const [{ initializeApp }, fs] = await Promise.all([
      import(base + 'firebase-app.js'),
      import(base + 'firebase-firestore.js'),
    ]);
    const app = initializeApp(firebaseConfig);
    Object.assign(fb, {
      db: fs.getFirestore(app),
      doc: fs.doc, getDoc: fs.getDoc, setDoc: fs.setDoc, updateDoc: fs.updateDoc,
      deleteDoc: fs.deleteDoc, deleteField: fs.deleteField, onSnapshot: fs.onSnapshot,
    });
    fb.ref = fb.doc(fb.db, ...DOC_PATH);

    const snap = await fb.getDoc(fb.ref);
    if (!snap.exists()) {
      // Allereerste keer: dit toestel zet het gedeelde document op
      // (zonder opname-versies; die komen er via pushNewerRecordings bij).
      state = { ...state, audio: {} };
      await fb.setDoc(fb.ref, state);
    } else {
      state = withDefaults(snap.data());
    }
    persistLocal();
    fb.ready = true;
    await pushNewerRecordings();
    syncStatus = 'verbonden ✓';
    emit();

    fb.onSnapshot(fb.ref, s => {
      if (!s.exists() || s.metadata.hasPendingWrites) return;
      state = withDefaults(s.data());
      persistLocal();
      emit();
      pullRecordings();
    });
    pullRecordings();
  } catch (e) {
    console.warn('Firebase niet beschikbaar, de app werkt lokaal verder', e);
    syncStatus = 'offline (enkel op dit toestel)';
    emit();
  }
}
