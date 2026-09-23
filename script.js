// Letterland — hoofdscript: schermen, oefeningen, toets, woorden, beloningen, instellingen.

import { LETTERS, LETTER_BY_ID, WORDS, PHRASES, soundsAlike } from './js/data.js';
import * as A from './js/audio.js';
import * as S from './js/store.js';

const SESSION_LEN = 10;   // oefeningen per sessie
const TOETS_LEN = 6;      // vragen in een toets (alles moet juist zijn)
const STREAK = 3;         // zoveel keer na elkaar juist = gekend
const REVIEW_SHARE = 0.3; // aandeel herhaling van al gekende letters in een sessie

const ORDER = Object.fromEntries(LETTERS.map((l, i) => [l.id, i]));
const app = document.getElementById('app');
const st = () => S.state;

// ---------- Hulpjes ----------

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const glyph = id => `<span class="glyph">${esc(id)}</span>`;

function weightedPick(items, weight) {
  const total = items.reduce((n, it) => n + weight(it), 0);
  let r = Math.random() * total;
  for (const it of items) { r -= weight(it); if (r <= 0) return it; }
  return items[items.length - 1];
}

// Weergave: elk scherm geeft zijn eigen knop-acties mee (data-act="...").
let screen = '';
let handlers = {};
function render(name, html, acts = {}) {
  screen = name;
  handlers = acts;
  app.innerHTML = html;
  app.scrollTop = 0;
  window.scrollTo(0, 0);
}
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || !app.contains(el)) return;
  const fn = handlers[el.dataset.act];
  if (fn) fn(el, e);
});
app.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && handlers[el.dataset.change]) handlers[el.dataset.change](el, e);
});

function confetti(n = 40) {
  const box = document.createElement('div');
  box.className = 'confetti';
  const bits = ['🎉', '⭐', '🎈', '✨', '🐼', '🎋'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.textContent = pick(bits);
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = Math.random() * 0.6 + 's';
    s.style.fontSize = 18 + Math.random() * 22 + 'px';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3200);
}

// ---------- Voortgangslogica ----------

const passed = id => !!st().passed[id];
const currentLetter = () => LETTERS.find(l => !passed(l.id))?.id || null;
const applicable = id => ['hoor', 'klank', LETTER_BY_ID[id].start.length ? 'begin' : null, 'zoek'].filter(Boolean);
const streakOf = (id, type) => st().progress[id]?.[type] || 0;
const mastered = id => applicable(id).every(t => streakOf(id, t) >= STREAK);
const toetsAvailable = id => !!id && st().retest !== id && (mastered(id) || st().readyFor === id);
const availableWords = () => WORDS.filter(w => w.parts.every(p => passed(p)));
const wordsUnlocked = () => availableWords().length >= 3;

function letterDistractors(target, n, { look = false } = {}) {
  const idx = ORDER[target];
  const ok = id => !soundsAlike(id, target);
  const pool = LETTERS.map(l => l.id).filter(ok);
  const near = pool.filter(id => passed(id) || Math.abs(ORDER[id] - idx) <= 6);
  const out = [];
  if (look && Math.random() < 0.5) {
    const lk = shuffle(LETTER_BY_ID[target].look.filter(x => LETTER_BY_ID[x] && ok(x)));
    if (lk.length) out.push(lk[0]);
  }
  for (const c of [...shuffle(near), ...shuffle(pool)]) {
    if (out.length >= n) break;
    if (!out.includes(c) && out.every(o => !soundsAlike(o, c))) out.push(c);
  }
  return out;
}

// ---------- Startscherm (tik om te beginnen: nodig om geluid te mogen spelen op iOS) ----------

function splash() {
  render('splash', `
    <div class="splash" data-act="go">
      <div class="panda big bounce">🐼</div>
      <h1 class="logo">Letter<span>land</span></h1>
      <button class="btn btn-green btn-xl pulse" data-act="go">▶</button>
    </div>`, {
    go: () => {
      A.unlock();
      home();
      const name = st().name;
      A.play(['text', name ? `Hallo ${name}!` : 'Hallo!']);
    },
  });
}

// ---------- Home ----------

function home() {
  A.stopAll();
  const cur = currentLetter();
  const canToets = toetsAvailable(cur);
  const wOpen = wordsUnlocked();
  const s = st();

  const blocks = [...new Set(LETTERS.map(l => l.block))].map(b => `
    <div class="pad-row">${LETTERS.filter(l => l.block === b).map(l => {
      const cls = passed(l.id) ? 'done' : l.id === cur ? 'current' : 'locked';
      return `<button class="bubble ${cls}" data-act="card" data-id="${l.id}">${glyph(l.id)}</button>`;
    }).join('')}</div>`).join('');

  render('home', `
    <header class="top">
      <button class="icon-btn" data-act="settings" aria-label="Instellingen">⚙️</button>
      <div class="stars-pill">⭐ ${s.points}</div>
    </header>
    <section class="hero">
      <div class="panda bounce" data-act="hello">🐼</div>
      <div class="hero-text">${s.name ? `Hallo ${esc(s.name)}!` : 'Hallo!'}</div>
    </section>
    ${cur ? `
      <section class="now card" data-act="card" data-id="${cur}">
        <div class="now-label">Nu leer je</div>
        <div class="now-letter">${glyph(cur)}</div>
        ${canToets ? '<div class="badge badge-orange">📝 toets klaar!</div>' : st().lessonSeen[cur] ? '' : '<div class="badge">✨ nieuw</div>'}
      </section>` : `
      <section class="now card"><div class="now-label">Je kent alle letters! 🎉</div></section>`}
    <nav class="menu">
      <button class="btn btn-green btn-lg" data-act="practice">▶ Oefenen</button>
      ${canToets ? '<button class="btn btn-orange btn-lg pulse" data-act="toets">📝 Toets</button>' : ''}
      <button class="btn btn-blue btn-lg ${wOpen ? '' : 'is-locked'}" data-act="words">${wOpen ? '📖' : '🔒'} Woorden</button>
      <button class="btn btn-pink btn-lg" data-act="rewards">🎁 Beloningen</button>
    </nav>
    <section class="pad card">
      <div class="pad-title">Mijn letters</div>
      ${blocks}
    </section>`, {
    settings: parentGate,
    hello: () => A.play(['text', s.name ? `Hallo ${s.name}!` : 'Hallo!']),
    practice: startPractice,
    toets: () => startToets(cur),
    words: () => wOpen ? startWords() : A.play(['text', 'Eerst nog wat meer letters leren!']),
    rewards: rewardsScreen,
    card: el => {
      const id = el.dataset.id;
      if (passed(id) || id === cur) letterCard(id);
      else A.play(['text', 'Die letter komt later!']);
    },
  });
}

function letterCard(id) {
  const L = LETTER_BY_ID[id];
  const ex = [...L.start, ...L.mid];
  const overlay = document.createElement('div');
  overlay.className = 'modal-back';
  overlay.innerHTML = `
    <div class="modal card">
      <button class="icon-btn close" data-x>✖</button>
      <button class="big-glyph" data-snd>${glyph(id)}</button>
      <div class="examples">${ex.map(([e, w]) => `<button class="ex" data-w="${esc(w)}"><span class="emoji">${e}</span></button>`).join('')}</div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => { A.stopAll(); overlay.remove(); };
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-x]')) return close();
    if (e.target.closest('[data-snd]')) return A.play(['letter', id]);
    const w = e.target.closest('[data-w]');
    if (w) A.play(['word', w.dataset.w]);
  });
  A.play(['letter', id]);
}

// ---------- Les ----------

function startPractice() {
  const cur = currentLetter();
  if (cur && !st().lessonSeen[cur]) return lesson(cur);
  startRun(buildLetterSession(), 'practice');
}

function lesson(id) {
  const L = LETTER_BY_ID[id];
  const examples = [...L.start, ...L.mid].slice(0, 3);
  const hl = w => {
    const i = w.indexOf(id);
    return i < 0 ? esc(w) : esc(w.slice(0, i)) + `<b>${esc(id)}</b>` + esc(w.slice(i + id.length));
  };
  const steps = [
    {
      html: `<div class="speech">Kijk! Een nieuwe letter.</div><button class="big-glyph pop" data-act="snd">${glyph(id)}</button>`,
      sound: [['phrase', 'nieuw'], 400, ['letter', id], 500, ['letter', id]],
    },
    {
      html: `<button class="big-glyph" data-act="snd">${glyph(id)}</button>
        <div class="speech">${L.name && id.length === 1 ? `Deze letter heet <b>“${esc(L.name)}”</b>…<br>maar hij zegt:` : id.length > 1 ? `Twee letters samen.<br>Samen zeggen ze:` : 'Deze letter zegt:'}</div>
        <button class="btn btn-round btn-blue" data-act="snd">🔊</button>`,
      sound: L.name && id.length === 1
        ? [['text', `Deze letter heet ${L.name}. Maar hij zegt:`], 200, ['letter', id]]
        : id.length > 1
          ? [['text', `Dit zijn twee letters samen. Samen zeggen ze:`], 200, ['letter', id]]
          : [['text', 'Deze letter zegt:'], 200, ['letter', id]],
    },
    {
      html: `<div class="lesson-letter">${glyph(id)}</div>
        <div class="examples">${examples.map(([e, w]) => `
          <button class="ex" data-act="word" data-w="${esc(w)}"><span class="emoji">${e}</span><span class="ex-word">${hl(w)}</span></button>`).join('')}</div>`,
      sound: examples.flatMap(([, w]) => [['letter', id], 150, ['word', w], 500]),
    },
  ];

  let i = 0;
  const show = () => {
    const step = steps[i];
    render('lesson', `
      <header class="top"><button class="icon-btn" data-act="home">✖</button>
        <div class="dots">${steps.map((_, j) => `<span class="${j <= i ? 'on' : ''}"></span>`).join('')}<span></span><span></span></div></header>
      <div class="lesson">${step.html}</div>
      <div class="bottom-bar"><button class="btn btn-green btn-lg" data-act="next">▶</button></div>`, {
      home,
      snd: () => A.play(['letter', id]),
      word: el => A.play(['letter', id], 150, ['word', el.dataset.w]),
      next: () => { i++; i < steps.length ? show() : checks(); },
    });
    A.play(...step.sound);
  };
  // Twee controlevraagjes (tellen niet mee; bij fout mag ze opnieuw proberen).
  const checks = () => {
    const items = [{ kind: 'letter', id, type: 'hoor' }, { kind: 'letter', id, type: L.start.length ? 'begin' : 'klank' }];
    startRun(items, 'lesson', () => {
      S.update({ ['lessonSeen.' + id]: true });
      render('lesson-done', `
        <div class="center-screen">
          <div class="panda big bounce">🐼</div>
          <div class="speech">Goed zo! Nu gaan we oefenen.</div>
          <button class="btn btn-green btn-xl pulse" data-act="go">▶</button>
        </div>`, { go: () => startRun(buildLetterSession(), 'practice') });
      A.play(['text', 'Goed zo! Nu gaan we oefenen.']);
    });
  };
  show();
}

// ---------- Sessies samenstellen ----------

function buildLetterSession() {
  const cur = currentLetter();
  const known = LETTERS.filter(l => passed(l.id)).map(l => l.id);
  const items = [];
  for (let i = 0; i < SESSION_LEN; i++) {
    const review = known.length && (!cur || Math.random() < REVIEW_SHARE);
    if (review) {
      const id = pick(known);
      items.push({ kind: 'letter', id, type: pick(applicable(id)) });
    } else {
      const type = weightedPick(applicable(cur), t => (streakOf(cur, t) < STREAK ? 3 : 1));
      items.push({ kind: 'letter', id: cur, type });
    }
  }
  return items;
}

function buildToets(id) {
  const types = applicable(id);
  const list = [...types];
  while (list.length < TOETS_LEN) list.push(pick(types));
  return shuffle(list).map(type => ({ kind: 'letter', id, type }));
}

function buildWordSession() {
  const avail = availableWords();
  const items = [];
  let prev = null;
  for (let i = 0; i < SESSION_LEN; i++) {
    let w;
    do { w = weightedPick(avail, x => ((st().words[x.id] || 0) < STREAK ? 3 : 1)); } while (w === prev && avail.length > 1);
    prev = w;
    const type = w.parts.length <= 5 && Math.random() < 0.5 ? 'leg' : 'lees';
    items.push({ kind: 'word', id: w.id, type });
  }
  return items;
}

function startToets(id) {
  if (!toetsAvailable(id)) return home();
  render('toets-intro', `
    <div class="center-screen">
      <div class="panda big">🐼📝</div>
      <div class="speech">De toets!<br>Probeer alles juist te doen.</div>
      <div class="big-glyph small">${glyph(id)}</div>
      <button class="btn btn-orange btn-xl pulse" data-act="go">▶</button>
      <button class="btn btn-ghost" data-act="home">Nog niet</button>
    </div>`, { go: () => startRun(buildToets(id), 'toets'), home });
  A.play(['phrase', 'toets']);
}

function startWords() {
  startRun(buildWordSession(), 'words');
}

// ---------- De oefen-motor ----------

let run = null;

function startRun(items, mode, onDone = null) {
  run = { items, i: 0, mode, errors: 0, onDone, letter: currentLetter() };
  nextItem();
}

function nextItem() {
  if (run.i >= run.items.length) return finishRun(true);
  const it = run.items[run.i];
  const ex = RENDERERS[it.type](it);
  const pct = Math.round((run.i / run.items.length) * 100);
  render('exercise', `
    <header class="top">
      <button class="icon-btn" data-act="quit">✖</button>
      <div class="progress ${run.mode === 'toets' ? 'is-toets' : ''}"><div style="width:${pct}%"></div></div>
      ${run.mode === 'toets' ? '<div class="mode-tag">📝</div>' : ''}
    </header>
    <div class="ask">
      <div class="panda" data-act="replay">🐼</div>
      <button class="btn btn-round btn-blue" data-act="replay" aria-label="Nog eens luisteren">🔊</button>
    </div>
    <div class="exercise ex-${it.type}">${ex.html}</div>
    <div class="feedback" id="feedback"></div>`, {
    quit: home,
    replay: () => A.play(...(ex.replay || ex.prompt)),
    ...ex.acts,
  });
  A.play(...ex.prompt);
}

// Wordt door elke oefening opgeroepen zodra het antwoord vaststaat.
function answered(ok, reveal) {
  const it = run.items[run.i];
  app.querySelectorAll('.exercise button').forEach(b => (b.disabled = true));
  record(it, ok);
  const fb = document.getElementById('feedback');
  if (ok) {
    const praise = pick(['goed1', 'goed2', 'goed3']);
    fb.innerHTML = '<div class="fb-good pop">✔</div>';
    const sounds = it.kind === 'word' ? [['word', it.id], 200, ['phrase', praise]] : [['phrase', praise]];
    A.play(...sounds).then(() => {
      if (run && run.items[run.i] === it) { run.i++; nextItem(); }
    });
    return;
  }
  run.errors++;
  reveal && reveal();
  fb.innerHTML = reminderHtml(it);
  fb.classList.add('show');
  A.play(['phrase', 'fout'], 200, ...reminderSound(it));
  handlers.fbReplay = () => A.play(...reminderSound(it));
  handlers.fbNext = () => {
    if (run.mode === 'toets') return finishRun(false);
    if (run.mode !== 'lesson') run.i++;
    nextItem();
  };
}

function reminderHtml(it) {
  if (it.kind === 'word') {
    const w = WORDS.find(x => x.id === it.id);
    return `<div class="reminder card">
      <button class="rem-main" data-act="fbReplay"><span class="emoji">${w.emoji}</span>
        <span class="word-tiles">${w.parts.map(p => `<span class="tile">${esc(p)}</span>`).join('')}</span></button>
      <button class="btn btn-green btn-lg" data-act="fbNext">▶</button></div>`;
  }
  const L = LETTER_BY_ID[it.id];
  const ex = L.start[0] || L.mid[0];
  return `<div class="reminder card">
    <button class="rem-main" data-act="fbReplay">${glyph(it.id)}${ex ? `<span class="emoji">${ex[0]}</span>` : ''}</button>
    <button class="btn btn-green btn-lg" data-act="fbNext">▶</button></div>`;
}

function reminderSound(it) {
  if (it.kind === 'word') return [['word', it.id]];
  const L = LETTER_BY_ID[it.id];
  const ex = L.start[0] || L.mid[0];
  return [['letter', it.id], 300, ...(ex ? [['word', ex[1]]] : [])];
}

function record(it, ok) {
  if (run.mode === 'lesson' || run.mode === 'toets') return;
  if (it.kind === 'letter') {
    const s = streakOf(it.id, it.type);
    S.update({ [`progress.${it.id}.${it.type}`]: ok ? Math.min(STREAK, s + 1) : 0 });
  } else {
    const s = st().words[it.id] || 0;
    S.update({ ['words.' + it.id]: ok ? Math.min(STREAK, s + 1) : 0 });
  }
}

function finishRun(completed) {
  const { mode, errors, onDone, letter } = run;
  run = null;
  if (onDone) return onDone();
  const s = st();

  if (mode === 'toets') {
    if (completed) {
      S.update({ ['passed.' + letter]: true, readyFor: null, retest: null, points: s.points + s.settings.ptsToets });
      const next = currentLetter();
      confetti(60);
      render('toets-done', `
        <div class="center-screen">
          <div class="panda big dance">🐼</div>
          <div class="speech">Joepie! Je kent de letter</div>
          <div class="big-glyph small">${glyph(letter)}</div>
          <div class="stars-won">+${s.settings.ptsToets} ⭐</div>
          ${next ? `<button class="btn btn-green btn-lg pulse" data-act="next">✨ Nieuwe letter</button>` : '<div class="speech">Je kent ALLE letters! 🏆</div>'}
          <button class="btn btn-ghost" data-act="home">🏠</button>
        </div>`, { next: startPractice, home });
      A.play(['phrase', 'geslaagd']);
    } else {
      S.update({ retest: letter, readyFor: null });
      render('toets-fail', `
        <div class="center-screen">
          <div class="panda big">🐼💛</div>
          <div class="speech">Bijna! Nog even oefenen,<br>dan probeer je opnieuw.</div>
          <button class="btn btn-green btn-lg" data-act="practice">▶ Oefenen</button>
          <button class="btn btn-ghost" data-act="home">🏠</button>
        </div>`, { practice: startPractice, home });
      A.play(['phrase', 'bijna']);
    }
    return;
  }

  const pts = mode === 'words' ? s.settings.ptsWords : s.settings.ptsSession;
  const changes = { points: s.points + pts };
  if (mode === 'practice' && letter) {
    if (errors === 0) changes.readyFor = letter;
    if (s.retest === letter) changes.retest = null;
  }
  S.update(changes);
  const stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1;
  const canToets = mode === 'practice' && toetsAvailable(letter);
  confetti(errors === 0 ? 50 : 25);
  render('done', `
    <div class="center-screen">
      <div class="panda big dance">🐼</div>
      <div class="speech">Hoera! Klaar!</div>
      <div class="stars-row">${'⭐'.repeat(stars)}${'<span class="dim">⭐</span>'.repeat(3 - stars)}</div>
      <div class="stars-won">+${pts} ⭐</div>
      ${canToets ? '<button class="btn btn-orange btn-lg pulse" data-act="toets">📝 Doe de toets!</button>' : `<button class="btn btn-green btn-lg" data-act="again">▶ Nog eens</button>`}
      <button class="btn btn-ghost" data-act="home">🏠</button>
    </div>`, {
    toets: () => startToets(letter),
    again: () => (mode === 'words' ? startWords() : startPractice()),
    home,
  });
  A.play(['phrase', 'klaar']);
}

// ---------- Oefentypes ----------
// Elke renderer geeft { html, prompt, replay?, acts } terug.

const RENDERERS = {
  // Klank horen -> juiste letter tikken
  hoor(it) {
    const opts = shuffle([it.id, ...letterDistractors(it.id, 2, { look: true })]);
    return {
      html: `<div class="options">${opts.map(o => `<button class="opt" data-act="pick" data-v="${o}">${glyph(o)}</button>`).join('')}</div>`,
      prompt: [['phrase', 'hoor'], 250, ['letter', it.id]],
      replay: [['letter', it.id]],
      acts: { pick: el => choose(el, el.dataset.v === it.id, it.id) },
    };
  },

  // Letter zien -> juiste klank kiezen uit knopjes die je kan beluisteren
  klank(it) {
    const opts = shuffle([it.id, ...letterDistractors(it.id, 2)]);
    const colors = ['btn-blue', 'btn-pink', 'btn-purple'];
    let chosen = null;
    return {
      html: `<div class="big-glyph">${glyph(it.id)}</div>
        <div class="sound-opts">${opts.map((o, i) => `<button class="btn btn-round ${colors[i]} snd-opt" data-act="listen" data-v="${o}">🔊</button>`).join('')}</div>
        <button class="btn btn-green btn-lg confirm" data-act="confirm" disabled>✔</button>`,
      prompt: [['phrase', 'klank']],
      acts: {
        listen: el => {
          chosen = el.dataset.v;
          app.querySelectorAll('.snd-opt').forEach(b => b.classList.toggle('selected', b === el));
          app.querySelector('.confirm').disabled = false;
          A.play(['letter', chosen]);
        },
        confirm: () => {
          if (!chosen) return;
          const ok = chosen === it.id;
          answered(ok, () => {
            app.querySelectorAll('.snd-opt').forEach(b => {
              if (b.dataset.v === it.id) b.classList.add('right');
              else if (b.dataset.v === chosen) b.classList.add('wrong');
            });
          });
        },
      },
    };
  },

  // Plaatje -> met welke letter begint het?
  begin(it) {
    const L = LETTER_BY_ID[it.id];
    const [emoji, word] = pick(L.start);
    const opts = shuffle([it.id, ...letterDistractors(it.id, 2)]);
    return {
      html: `<button class="picture" data-act="say"><span class="emoji">${emoji}</span></button>
        <div class="options">${opts.map(o => `<button class="opt" data-act="pick" data-v="${o}">${glyph(o)}</button>`).join('')}</div>`,
      prompt: [['phrase', 'begin'], 250, ['word', word]],
      replay: [['word', word]],
      acts: {
        say: () => A.play(['word', word]),
        pick: el => choose(el, el.dataset.v === it.id, it.id),
      },
    };
  },

  // Tik alle letters die je hoort, tussen letters die erop lijken
  zoek(it) {
    const L = LETTER_BY_ID[it.id];
    let others = L.look.filter(x => LETTER_BY_ID[x] && !soundsAlike(x, it.id));
    if (others.length < 2) others = [...others, ...letterDistractors(it.id, 2 - others.length)];
    const targets = 3;
    const tiles = shuffle([...Array(targets).fill(it.id), ...Array.from({ length: 8 - targets }, (_, i) => others[i % others.length])]);
    let found = 0;
    return {
      html: `<div class="grid">${tiles.map(t => `<button class="opt small" data-act="tap" data-v="${t}">${glyph(t)}</button>`).join('')}</div>`,
      prompt: [['phrase', 'zoek'], 250, ['letter', it.id]],
      replay: [['letter', it.id]],
      acts: {
        tap: el => {
          if (el.dataset.v === it.id) {
            el.classList.add('right');
            el.disabled = true;
            found++;
            if (found === targets) answered(true);
            else A.play(['letter', it.id]);
          } else {
            el.classList.add('wrong');
            answered(false, () => app.querySelectorAll(`.grid [data-v="${it.id}"]`).forEach(b => b.classList.add('right')));
          }
        },
      },
    };
  },

  // Woord lezen (met zoem-knop) -> juiste plaatje kiezen
  lees(it) {
    const w = WORDS.find(x => x.id === it.id);
    const others = shuffle(WORDS.filter(x => x.id !== w.id && x.emoji !== w.emoji)).slice(0, 2);
    const opts = shuffle([w, ...others]);
    return {
      html: `<div class="word-tiles big">${w.parts.map((p, i) => `<span class="tile" data-i="${i}">${esc(p)}</span>`).join('')}</div>
        <button class="btn btn-yellow" data-act="zoem">🐝 zoem</button>
        <div class="options pics">${opts.map(o => `<button class="opt pic" data-act="pick" data-v="${o.id}"><span class="emoji">${o.emoji}</span></button>`).join('')}</div>`,
      prompt: [['phrase', 'lees']],
      acts: {
        zoem: () => {
          const tiles = app.querySelectorAll('.word-tiles .tile');
          A.play(...w.parts.map(p => ['letter', p]), i => {
            tiles.forEach((t, j) => t.classList.toggle('lit', j === i));
          }).then(() => tiles.forEach(t => t.classList.remove('lit')));
        },
        pick: el => choose(el, el.dataset.v === w.id, w.id),
      },
    };
  },

  // Plaatje + gesproken woord -> woord leggen met letterblokjes
  leg(it) {
    const w = WORDS.find(x => x.id === it.id);
    const extra = shuffle(LETTERS.map(l => l.id).filter(x => passed(x) && !w.parts.includes(x))).slice(0, w.parts.length > 3 ? 1 : 2);
    const bank = shuffle([...w.parts, ...extra]);
    let pos = 0;
    return {
      html: `<button class="picture" data-act="say"><span class="emoji">${w.emoji}</span></button>
        <div class="word-tiles big slots">${w.parts.map((_, i) => `<span class="tile empty" data-i="${i}"></span>`).join('')}</div>
        <div class="bank">${bank.map((p, i) => `<button class="opt small" data-act="tile" data-v="${esc(p)}" data-k="${i}">${glyph(p)}</button>`).join('')}</div>`,
      prompt: [['phrase', 'leg'], 250, ['word', w.word]],
      replay: [['word', w.word]],
      acts: {
        say: () => A.play(['word', w.word]),
        tile: el => {
          const slots = app.querySelectorAll('.slots .tile');
          if (el.dataset.v === w.parts[pos]) {
            slots[pos].textContent = el.dataset.v;
            slots[pos].classList.remove('empty');
            el.classList.add('used');
            el.disabled = true;
            pos++;
            if (pos === w.parts.length) answered(true);
            else A.play(['letter', el.dataset.v]);
          } else {
            el.classList.add('wrong');
            answered(false, () => slots.forEach((s, i) => { s.textContent = w.parts[i]; s.classList.remove('empty'); s.classList.add('right'); }));
          }
        },
      },
    };
  },
};

// Gemeenschappelijk voor meerkeuze-oefeningen.
function choose(el, ok, rightValue) {
  el.classList.add(ok ? 'right' : 'wrong');
  answered(ok, () => app.querySelectorAll(`.exercise [data-v="${rightValue}"]`).forEach(b => b.classList.add('right')));
}

// ---------- Beloningen ----------

function rewardsScreen() {
  A.stopAll();
  const s = st();
  render('rewards', `
    <header class="top">
      <button class="icon-btn" data-act="home">🏠</button>
      <div class="stars-pill">⭐ ${s.points}</div>
    </header>
    <h2 class="screen-title">🎁 Beloningen</h2>
    <div class="rewards">
      ${s.rewards.length ? s.rewards.map(r => {
        const can = s.points >= r.price;
        const pct = Math.min(100, Math.round((s.points / Math.max(1, r.price)) * 100));
        return `<button class="reward card ${can ? 'can' : ''}" data-act="redeem" data-id="${r.id}">
          <span class="emoji">${esc(r.emoji || '🎁')}</span>
          <span class="r-name">${esc(r.name)}</span>
          <span class="r-price">${r.price} ⭐</span>
          <span class="r-bar"><span style="width:${pct}%"></span></span>
        </button>`;
      }).join('') : '<p class="muted">Nog geen beloningen. Mama of papa kan ze toevoegen bij ⚙️.</p>'}
    </div>`, {
    home,
    redeem: el => {
      const r = st().rewards.find(x => x.id === el.dataset.id);
      if (!r) return;
      if (st().points < r.price) {
        A.play(['text', `Nog ${r.price - st().points} sterretjes sparen!`]);
        return;
      }
      confirmRedeem(r);
    },
  });
}

function confirmRedeem(r) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-back';
  overlay.innerHTML = `
    <div class="modal card center">
      <div class="emoji huge">${esc(r.emoji || '🎁')}</div>
      <div class="speech">${esc(r.name)}<br><b>${r.price} ⭐</b></div>
      <div class="row">
        <button class="btn btn-green btn-lg" data-yes>✔</button>
        <button class="btn btn-ghost btn-lg" data-no>✖</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  A.play(['text', `Wil je ${r.name} kiezen?`]);
  overlay.addEventListener('click', e => {
    if (e.target.closest('[data-yes]')) {
      const s = st();
      S.update({
        points: s.points - r.price,
        redeemed: [{ name: r.name, emoji: r.emoji, price: r.price, at: Date.now() }, ...s.redeemed].slice(0, 50),
      });
      overlay.remove();
      confetti(60);
      A.play(['text', 'Joepie! Ga het maar aan mama of papa vertellen!']);
      rewardsScreen();
    } else if (e.target.closest('[data-no]') || e.target === overlay) {
      overlay.remove();
    }
  });
}

// ---------- Ouderpoort + instellingen ----------

function parentGate() {
  const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
  const overlay = document.createElement('div');
  overlay.className = 'modal-back';
  overlay.innerHTML = `
    <form class="modal card center">
      <div class="muted">Enkel voor ouders</div>
      <div class="speech">${a} + ${b} = ?</div>
      <input class="input big" type="number" inputmode="numeric" autocomplete="off">
      <div class="row">
        <button class="btn btn-green" type="submit">OK</button>
        <button class="btn btn-ghost" type="button" data-no>Annuleer</button>
      </div>
    </form>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('input');
  input.focus();
  overlay.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    if (Number(input.value) === a + b) { overlay.remove(); settings(); }
    else { input.value = ''; input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 500); }
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-no]')) overlay.remove();
  });
}

let recording = null; // { key, ctrl }

function recRow(key, label, hint = '') {
  const has = A.hasClip(key);
  const isRec = recording?.key === key;
  return `<div class="rec-row" data-key="${key}">
    <span class="dot ${has ? 'ok' : ''}"></span>
    <span class="rec-label">${label}${hint ? `<small>${esc(hint)}</small>` : ''}</span>
    <button class="btn btn-sm ${isRec ? 'btn-red pulse' : 'btn-blue'}" data-act="rec" data-key="${key}">${isRec ? '⏹' : '🎙️'}</button>
    <button class="btn btn-sm btn-ghost" data-act="playrec" data-key="${key}" ${has ? '' : 'disabled'}>▶</button>
    <button class="btn btn-sm btn-ghost" data-act="delrec" data-key="${key}" ${has ? '' : 'disabled'}>🗑</button>
  </div>`;
}

function settings(openSections = new Set(['klanken'])) {
  A.stopAll();
  const s = st();
  const missing = LETTERS.filter(l => !A.hasClip(A.letterKey(l.id))).length;
  const exampleWords = [...new Set(LETTERS.flatMap(l => [...l.start, ...l.mid].map(([, w]) => w)))];
  const allWords = [...new Set([...exampleWords, ...WORDS.map(w => w.word)])].sort();
  const open = id => (openSections.has(id) ? 'open' : '');
  const fmt = t => new Date(t).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  render('settings', `
    <header class="top">
      <button class="icon-btn" data-act="home">🏠</button>
      <h2 class="screen-title inline">Instellingen</h2>
    </header>
    <div class="settings">

      <section class="card">
        <label class="field">Naam van je dochter
          <input class="input" data-change="name" value="${esc(s.name)}" placeholder="bv. Lotte">
        </label>
      </section>

      <details class="card" data-sec="klanken" ${open('klanken')}>
        <summary>🎙️ Klanken inspreken <span class="${missing ? 'warn' : 'okc'}">${missing ? `${missing} ontbreken` : 'alles ingesproken ✓'}</span></summary>
        <p class="muted">Spreek de <b>klank</b> in, niet de letternaam: “mmm”, niet “em”. Korte klanken (k, p, t) kort en zonder “uh” erachter. Tik 🎙️, zeg de klank, en tik ⏹ (of wacht 3 seconden). Stilte vooraan en achteraan wordt automatisch weggeknipt.</p>
        ${LETTERS.map(l => recRow(A.letterKey(l.id), glyph(l.id), (l.start[0] || l.mid[0] || [])[1] ? `zoals in ${(l.start[0] || l.mid[0])[1]}` : '')).join('')}
      </details>

      <details class="card" data-sec="zinnen" ${open('zinnen')}>
        <summary>💬 Zinnetjes inspreken <span class="muted">(optioneel)</span></summary>
        <p class="muted">Niet ingesproken? Dan leest de stem van de iPhone ze voor.</p>
        ${Object.entries(PHRASES).map(([id, text]) => recRow(A.phraseKey(id), esc(text))).join('')}
      </details>

      <details class="card" data-sec="woorden" ${open('woorden')}>
        <summary>🗣️ Woorden inspreken <span class="muted">(optioneel)</span></summary>
        <p class="muted">Niet ingesproken? Dan leest de stem van de iPhone ze voor.</p>
        ${allWords.map(w => recRow(A.wordKey(w), esc(w))).join('')}
      </details>

      <details class="card" data-sec="letters" ${open('letters')}>
        <summary>🔤 Letters & voortgang</summary>
        <p class="muted">Kent ze een letter al zeker? Markeer hem dan als gekend, dan slaat de app hem over.</p>
        <div class="letter-admin">
          ${LETTERS.map(l => {
            const status = passed(l.id) ? 'gekend ✓' : l.id === currentLetter() ? (toetsAvailable(l.id) ? 'toets klaar' : 'bezig') : 'nog niet';
            const bars = applicable(l.id).map(t => `<span title="${t}" class="mini ${streakOf(l.id, t) >= STREAK ? 'full' : streakOf(l.id, t) ? 'half' : ''}"></span>`).join('');
            return `<div class="la-row"><span class="la-glyph">${glyph(l.id)}</span><span class="la-status">${status}</span><span class="la-bars">${bars}</span>
              <button class="btn btn-sm btn-ghost" data-act="togglePassed" data-id="${l.id}">${passed(l.id) ? 'terugzetten' : 'gekend'}</button></div>`;
          }).join('')}
        </div>
        <p class="muted">Woorden vrijgegeven: ${availableWords().length} / ${WORDS.length}</p>
      </details>

      <details class="card" data-sec="punten" ${open('punten')}>
        <summary>⭐ Sterren</summary>
        <div class="row">Nu: <b class="big-num">${s.points}</b>
          <button class="btn btn-sm btn-ghost" data-act="pts" data-d="-5">−5</button>
          <button class="btn btn-sm btn-ghost" data-act="pts" data-d="5">+5</button></div>
        <label class="field">Per oefensessie <input class="input num" type="number" min="0" data-change="setting" data-k="ptsSession" value="${s.settings.ptsSession}"></label>
        <label class="field">Per gehaalde toets <input class="input num" type="number" min="0" data-change="setting" data-k="ptsToets" value="${s.settings.ptsToets}"></label>
        <label class="field">Per woordensessie <input class="input num" type="number" min="0" data-change="setting" data-k="ptsWords" value="${s.settings.ptsWords}"></label>
      </details>

      <details class="card" data-sec="beloningen" ${open('beloningen')}>
        <summary>🎁 Beloningen</summary>
        ${s.rewards.map(r => `<div class="reward-edit" data-id="${r.id}">
          <input class="input emoji-in" maxlength="4" data-change="reward" data-f="emoji" value="${esc(r.emoji)}">
          <input class="input" data-change="reward" data-f="name" value="${esc(r.name)}">
          <input class="input num" type="number" min="1" data-change="reward" data-f="price" value="${r.price}">
          <button class="btn btn-sm btn-ghost" data-act="delReward" data-id="${r.id}">🗑</button></div>`).join('')}
        <button class="btn btn-sm btn-blue" data-act="addReward">+ Beloning toevoegen</button>
        ${s.redeemed.length ? `<h4>Ingewisseld</h4><ul class="redeemed">${s.redeemed.map(x => `<li>${esc(x.emoji || '')} ${esc(x.name)} <span class="muted">— ${x.price} ⭐, ${fmt(x.at)}</span></li>`).join('')}</ul>
          <button class="btn btn-sm btn-ghost" data-act="clearRedeemed">Lijst wissen</button>` : ''}
      </details>

      <details class="card" data-sec="sync" ${open('sync')}>
        <summary>🔄 Synchronisatie</summary>
        <p>Status: <b>${esc(S.syncStatus)}</b></p>
        <button class="btn btn-sm btn-red" data-act="reset">Alle voortgang wissen</button>
        <p class="muted">Opnames, beloningen en instellingen blijven bewaard.</p>
      </details>
    </div>`, {
    home,
    name: el => S.update({ name: el.value.trim() }),
    setting: el => S.update({ ['settings.' + el.dataset.k]: Math.max(0, Number(el.value) || 0) }),
    pts: el => { S.update({ points: Math.max(0, st().points + Number(el.dataset.d)) }); rerender(); },
    reward: el => {
      const id = el.closest('.reward-edit').dataset.id;
      const f = el.dataset.f;
      const v = f === 'price' ? Math.max(1, Number(el.value) || 1) : el.value.trim();
      S.update({ rewards: st().rewards.map(r => (r.id === id ? { ...r, [f]: v } : r)) });
    },
    addReward: () => {
      S.update({ rewards: [...st().rewards, { id: 'r' + Date.now(), emoji: '🎁', name: 'Nieuwe beloning', price: 20 }] });
      rerender();
    },
    delReward: el => {
      if (!confirm('Deze beloning verwijderen?')) return;
      S.update({ rewards: st().rewards.filter(r => r.id !== el.dataset.id) });
      rerender();
    },
    clearRedeemed: () => { S.update({ redeemed: [] }); rerender(); },
    togglePassed: el => {
      const id = el.dataset.id;
      S.update({ ['passed.' + id]: passed(id) ? S.DEL : true, readyFor: null, retest: null });
      rerender();
    },
    reset: () => {
      if (!confirm('Alle voortgang (letters, woorden, sterren) wissen?')) return;
      if (!confirm('Echt zeker? Dit kan niet ongedaan gemaakt worden.')) return;
      S.resetProgress();
      rerender();
    },
    rec: async el => {
      const key = el.dataset.key;
      if (recording) {
        const was = recording.key;
        recording.ctrl.stop();
        if (was === key) return;
      }
      try {
        A.stopAll();
        const ctrl = await A.startRecording(3000);
        recording = { key, ctrl };
        refreshRow(key);
        const blob = await ctrl.result;
        recording = null;
        await S.saveRecording(key, blob);
        refreshRow(key);
        A.play(key.startsWith('k_') ? ['letter', key.slice(2)] : key.startsWith('p_') ? ['phrase', key.slice(2)] : ['word', key.slice(2)]);
      } catch (e) {
        recording = null;
        refreshRow(key);
        alert('Opnemen lukt niet. Geef de app toestemming om de microfoon te gebruiken.\n\n(' + e.message + ')');
      }
    },
    playrec: el => {
      const key = el.dataset.key;
      A.play(key.startsWith('k_') ? ['letter', key.slice(2)] : key.startsWith('p_') ? ['phrase', key.slice(2)] : ['word', key.slice(2)]);
    },
    delrec: async el => {
      if (!confirm('Deze opname verwijderen?')) return;
      await S.deleteRecording(el.dataset.key);
      refreshRow(el.dataset.key);
    },
  });

  function rerender() {
    const openNow = new Set([...app.querySelectorAll('details[open]')].map(d => d.dataset.sec));
    const y = window.scrollY;
    settings(openNow);
    window.scrollTo(0, y);
  }
}

function refreshRow(key) {
  const row = app.querySelector(`.rec-row[data-key="${key}"]`);
  if (!row) return;
  const label = row.querySelector('.rec-label').innerHTML;
  row.outerHTML = recRow(key, label);
}

// ---------- Opstarten ----------

S.onChange(() => {
  if (screen === 'home') home();
  else if (screen === 'rewards') rewardsScreen();
});

// Enkel voor testen (…/?debug): geeft toegang tot de interne toestand.
if (location.search.includes('debug')) window.__ll = { get run() { return run; }, S, home, startRun, settings };

(async function boot() {
  await A.initAudio();
  splash();
  S.initSync();
})();
