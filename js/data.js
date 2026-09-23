// Alle inhoud van Letterland: letters (in leervolgorde), woorden en instructies.
//
// Per letter:
//   id        unieke sleutel (enkel a-z, want wordt gebruikt in Firestore-veldpaden)
//   name      letternaam zoals kinderen die soms al kennen ("bee"), of null
//   say       benadering van de klank voor de ingebouwde spraak, enkel gebruikt
//             zolang de ouder de klank nog niet zelf heeft ingesproken
//   start     voorbeelden die met deze klank BEGINNEN (bruikbaar voor "met welke letter begint...")
//   mid       voorbeelden waar de klank ergens anders in zit (enkel voor de les)
//   look      letters die er visueel op lijken (voor de "zoek de letter"-oefening)

export const LETTERS = [
  // ---- Blok 1 ----
  { id: 'i',  block: 1, name: 'ie',  say: 'i',    look: ['l', 'j', 'ie'], start: [['🦑', 'inktvis'], ['🐛', 'insect']], mid: [['🐟', 'vis'], ['🐔', 'kip']] },
  { id: 'm',  block: 1, name: 'em',  say: 'mmm',  look: ['n', 'w'],       start: [['🐭', 'muis'], ['🌙', 'maan'], ['🔪', 'mes']], mid: [] },
  { id: 'aa', block: 1, name: null,  say: 'aa',   look: ['a', 'oo', 'ee'], start: [['🐒', 'aap'], ['🍓', 'aardbei'], ['🥔', 'aardappel']], mid: [['🌙', 'maan'], ['🧀', 'kaas']] },
  { id: 'r',  block: 1, name: 'er',  say: 'rrr',  look: ['n', 'v'],       start: [['🌹', 'roos'], ['🚀', 'raket'], ['🤖', 'robot']], mid: [] },
  { id: 's',  block: 1, name: 'es',  say: 'sss',  look: ['z', 'c'],       start: [['🧦', 'sok'], ['🐌', 'slak'], ['⭐', 'ster']], mid: [] },
  { id: 'oo', block: 1, name: null,  say: 'oo',   look: ['o', 'aa', 'ee'], start: [['👂', 'oor'], ['👁️', 'oog']], mid: [['🌹', 'roos'], ['👑', 'kroon']] },
  { id: 'v',  block: 1, name: 'vee', say: 'vvv',  look: ['w', 'u', 'y'],  start: [['🐟', 'vis'], ['🦊', 'vos'], ['🐦', 'vogel']], mid: [] },
  { id: 'n',  block: 1, name: 'en',  say: 'nnn',  look: ['m', 'u', 'h'],  start: [['👃', 'neus'], ['🪺', 'nest'], ['🌰', 'noot']], mid: [] },
  { id: 'k',  block: 1, name: 'kaa', say: 'k',    look: ['h', 't', 'x'],  start: [['🐱', 'kat'], ['🐄', 'koe'], ['🧀', 'kaas']], mid: [] },
  // ---- Blok 2 ----
  { id: 'e',  block: 2, name: 'ee',  say: 'e',    look: ['c', 'o', 'a'],  start: [['🪣', 'emmer'], ['🧝', 'elf']], mid: [['🔪', 'mes'], ['🖊️', 'pen']] },
  { id: 't',  block: 2, name: 'tee', say: 't',    look: ['f', 'l'],       start: [['⛺', 'tent'], ['🦷', 'tand'], ['🍅', 'tomaat']], mid: [] },
  { id: 'ee', block: 2, name: null,  say: 'ee',   look: ['e', 'aa', 'oo'], start: [['🦆', 'eend'], ['🦔', 'egel'], ['🐿️', 'eekhoorn']], mid: [['🌊', 'zee']] },
  { id: 'p',  block: 2, name: 'pee', say: 'p',    look: ['q', 'b', 'd'],  start: [['🍐', 'peer'], ['🐴', 'paard'], ['🖊️', 'pen']], mid: [] },
  { id: 'a',  block: 2, name: 'aa',  say: 'a',    look: ['o', 'd', 'e'],  start: [['🍎', 'appel'], ['🍍', 'ananas'], ['🥑', 'avocado']], mid: [['🐱', 'kat']] },
  { id: 'd',  block: 2, name: 'dee', say: 'd',    look: ['b', 'p', 'q'],  start: [['🚪', 'deur'], ['🐬', 'dolfijn'], ['🦕', 'dino']], mid: [] },
  { id: 'o',  block: 2, name: 'oo',  say: 'o',    look: ['a', 'e', 'c'],  start: [['🐘', 'olifant'], ['🐙', 'octopus'], ['🦦', 'otter']], mid: [['🧦', 'sok'], ['🦊', 'vos']] },
  { id: 'z',  block: 2, name: 'zet', say: 'zzz',  look: ['s', 'x'],       start: [['☀️', 'zon'], ['🌊', 'zee'], ['🦓', 'zebra']], mid: [] },
  // ---- Blok 3 ----
  { id: 'ie', block: 3, name: null,  say: 'ie',   look: ['ei', 'ij', 'i'], start: [], mid: [['🐜', 'mier'], ['🚲', 'fiets'], ['🐞', 'lieveheersbeestje']] },
  { id: 'l',  block: 3, name: 'el',  say: 'lll',  look: ['i', 't'],       start: [['🦁', 'leeuw'], ['🥄', 'lepel'], ['💡', 'lamp']], mid: [] },
  { id: 'oe', block: 3, name: null,  say: 'oe',   look: ['ou', 'ee'],     start: [['🦪', 'oester']], mid: [['🐄', 'koe'], ['🎩', 'hoed'], ['🦶', 'voet']] },
  { id: 'h',  block: 3, name: 'haa', say: 'h',    look: ['n', 'k'],       start: [['🐶', 'hond'], ['🏠', 'huis'], ['🔨', 'hamer']], mid: [] },
  { id: 'u',  block: 3, name: 'uu',  say: 'u',    look: ['n', 'v', 'uu'], start: [], mid: [['🚌', 'bus'], ['🦟', 'mug'], ['💋', 'kus']] },
  { id: 'w',  block: 3, name: 'wee', say: 'w',    look: ['v', 'm'],       start: [['☁️', 'wolk'], ['🐺', 'wolf'], ['🐋', 'walvis']], mid: [] },
  { id: 'j',  block: 3, name: 'jee', say: 'j',    look: ['i', 'g'],       start: [['🧥', 'jas'], ['🪀', 'jojo'], ['👦', 'jongen']], mid: [] },
  { id: 'uu', block: 3, name: null,  say: 'uu',   look: ['u', 'oo'],      start: [], mid: [['🔥', 'vuur'], ['🧱', 'muur']] },
  // ---- Blok 4 ----
  { id: 'ij', block: 4, name: null,  say: 'ij',   look: ['ei', 'ie', 'y'], start: [['🍦', 'ijs'], ['🧊', 'ijsblokje']], mid: [['🐝', 'bij']] },
  { id: 'ui', block: 4, name: null,  say: 'ui',   look: ['uu', 'ie'],     start: [['🦉', 'uil'], ['🧅', 'ui']], mid: [['🏠', 'huis'], ['🐭', 'muis']] },
  { id: 'b',  block: 4, name: 'bee', say: 'b',    look: ['d', 'p', 'h'],  start: [['⚽', 'bal'], ['🐻', 'beer'], ['🌳', 'boom']], mid: [] },
  { id: 'ei', block: 4, name: null,  say: 'ei',   look: ['ie', 'ij'],     start: [['🥚', 'ei']], mid: [['🐐', 'geit'], ['🚂', 'trein']] },
  { id: 'g',  block: 4, name: 'gee', say: 'g',    look: ['q', 'p', 'y'],  start: [['🐐', 'geit'], ['🎸', 'gitaar'], ['🦒', 'giraf']], mid: [] },
  { id: 'eu', block: 4, name: null,  say: 'eu',   look: ['ou', 'ee'],     start: [['💶', 'euro']], mid: [['👃', 'neus'], ['🚪', 'deur']] },
  { id: 'f',  block: 4, name: 'ef',  say: 'fff',  look: ['t', 'l'],       start: [['🚲', 'fiets'], ['🍟', 'friet'], ['🦩', 'flamingo']], mid: [] },
  { id: 'ou', block: 4, name: null,  say: 'ou',   look: ['au', 'oe'],     start: [], mid: [['🪢', 'touw'], ['🥶', 'koud']] },
  { id: 'au', block: 4, name: null,  say: 'au',   look: ['ou', 'aa'],     start: [['🚗', 'auto']], mid: [['🦚', 'pauw']] },
  // ---- Blok 5 ----
  { id: 'ch', block: 5, name: null,  say: 'ch',   look: ['nk', 'ng'],     start: [], mid: [['😂', 'lachen'], ['🌃', 'nacht'], ['💡', 'licht']] },
  { id: 'ng', block: 5, name: null,  say: 'ng',   look: ['nk', 'ch'],     start: [], mid: [['💍', 'ring'], ['🐍', 'slang'], ['🐧', 'pinguïn']] },
  { id: 'nk', block: 5, name: null,  say: 'nk',   look: ['ng', 'ch'],     start: [], mid: [['🦑', 'inktvis'], ['🍹', 'drinken']] },
  { id: 'c',  block: 5, name: 'cee', say: 'k',    look: ['e', 'o'],       start: [['🌵', 'cactus'], ['🍋', 'citroen']], mid: [] },
  { id: 'x',  block: 5, name: 'iks', say: 'ks',   look: ['k', 'z', 'y'],  start: [], mid: [['🎷', 'saxofoon'], ['🚕', 'taxi']] },
  { id: 'y',  block: 5, name: 'ij',  say: 'j',    look: ['v', 'ij', 'j'], start: [['🧘', 'yoga'], ['🥛', 'yoghurt']], mid: [] },
  { id: 'q',  block: 5, name: 'kuu', say: 'k',    look: ['p', 'g', 'd'],  start: [], mid: [['🐠', 'aquarium']] },
];

export const LETTER_BY_ID = Object.fromEntries(LETTERS.map(l => [l.id, l]));

// Letters die (ongeveer) dezelfde klank maken. Die mogen nooit samen als
// antwoordmogelijkheid verschijnen bij een oefening waar je op klank kiest.
const SAME_SOUND = [['ei', 'ij', 'y'], ['ou', 'au'], ['c', 'k', 'q'], ['g', 'ch'], ['y', 'j'], ['ie', 'y']];
export function soundsAlike(a, b) {
  if (a === b) return true;
  return SAME_SOUND.some(g => g.includes(a) && g.includes(b));
}

// Woorden voor fase 2. Een woord wordt pas vrijgegeven als alle klanken erin gekend zijn.
export const WORDS = [
  ['maan', '🌙'], ['roos', '🌹'], ['vis', '🐟'], ['kaas', '🧀'], ['raam', '🪟'], ['vaas', '🏺'],
  ['oor', '👂'], ['kroon', '👑'], ['kraan', '🚰'],
  ['aap', '🐒'], ['pen', '🖊️'], ['tent', '⛺'], ['mes', '🔪'], ['zon', '☀️'], ['zee', '🌊'],
  ['tak', '🌿'], ['kat', '🐱'], ['ster', '⭐'], ['peer', '🍐'], ['pet', '🧢'], ['rok', '👗'],
  ['sok', '🧦'], ['zeep', '🧼'], ['kip', '🐔'], ['doos', '📦'], ['vos', '🦊'],
  ['mier', '🐜'], ['wiel', '🛞'], ['hoed', '🎩'], ['koe', '🐄'], ['bus', '🚌'], ['jas', '🧥'],
  ['muur', '🧱'], ['vuur', '🔥'], ['wolk', '☁️'], ['wolf', '🐺'], ['lamp', '💡'], ['hond', '🐶'],
  ['voet', '🦶'], ['hand', '✋'], ['hut', '🛖'],
  ['ijs', '🍦'], ['huis', '🏠'], ['muis', '🐭'], ['uil', '🦉'], ['bal', '⚽'], ['beer', '🐻'],
  ['boom', '🌳'], ['boek', '📖'], ['geit', '🐐'], ['neus', '👃'], ['bij', '🐝'], ['ei', '🥚'],
  ['trein', '🚂'], ['touw', '🪢'], ['fiets', '🚲'], ['duif', '🕊️'], ['bed', '🛏️'], ['deur', '🚪'],
  ['ring', '💍'], ['slang', '🐍'],
].map(([word, emoji]) => ({ id: word, word, emoji, parts: splitWord(word) }));

// Splits een woord in klanken, langste match eerst ("koe" -> k, oe).
export function splitWord(word) {
  const multi = LETTERS.map(l => l.id).filter(id => id.length > 1).sort((a, b) => b.length - a.length);
  const out = [];
  let i = 0;
  while (i < word.length) {
    const m = multi.find(id => word.startsWith(id, i));
    const part = m || word[i];
    out.push(part);
    i += part.length;
  }
  return out;
}

// Instructies en aanmoedigingen. De ouder kan elk ervan zelf inspreken;
// anders gebruikt de app de ingebouwde (Vlaamse) stem van het toestel.
export const PHRASES = {
  hallo:   'Hallo [naam]! (welkomstwoord)',  // zonder opname: "Hallo" + de naam uit de instellingen
  hoor:    'Welke letter hoor je?',
  klank:   'Tik op de knopjes en luister. Welke klank hoort bij deze letter?',
  begin:   'Met welke letter begint dit woord?',
  zoek:    'Tik op alle letters die je hoort.',
  lees:    'Lees het woord. Welk plaatje hoort erbij?',
  leg:     'Leg het woord met de letters.',
  nieuw:   'Kijk! Een nieuwe letter.',
  goed1:   'Goed zo!',
  goed2:   'Super!',
  goed3:   'Knap gedaan!',
  fout:    'Oei. Kijk, dit is het goede antwoord.',
  klaar:   'Hoera! Je bent klaar!',
  toets:   'Dit is de toets. Probeer alles juist te doen!',
  geslaagd:'Joepie! Je kent deze letter nu!',
  bijna:   'Bijna! Nog even oefenen en dan probeer je opnieuw.',
  zegt:    'Deze letter zegt:',
  twee:    'Dit zijn twee letters samen. Samen zeggen ze:',
  oefenen: 'Goed zo! Nu gaan we oefenen.',
  later:   'Die letter komt later!',
  meer:    'Eerst nog wat meer letters leren!',
  joepie:  'Joepie! Ga het maar aan mama of papa vertellen!',
};
