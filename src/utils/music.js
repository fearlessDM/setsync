// Utilidades de transposición de acordes

export const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const ENHAR = {'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb','Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};

export const tpKey = (key, steps) => {
  const root = key.replace(/m$|maj.*|sus.*|add.*|dim.*|aug.*/, '');
  const suf = key.slice(root.length);
  const base = ENHAR[root] || root;
  const idx = CHROMATIC.indexOf(base);
  if (idx < 0) return key;
  return CHROMATIC[(idx + steps + 12) % 12] + suf;
};

export function transposeChord(chord, offset) {
  if (!offset) return chord;
  const root = chord.replace(/m$|maj.*|sus.*|add.*|dim.*|aug.*/, '');
  const suf = chord.slice(root.length);
  const base = ENHAR[root] || root;
  const idx = CHROMATIC.indexOf(base);
  if (idx < 0) return chord;
  return CHROMATIC[(idx + offset + 12) % 12] + suf;
}

export const initials = n => n.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

// ── Sistemas de notación de acordes ──────────────────────────────────────
// Tres formas de nombrar un acorde, todas representando lo mismo (pedido
// explícito de Danny — quiere las 3 disponibles como opciones del usuario,
// no una sola fija):
//
//  - Americano: A, C, Gm — el nombre "de fábrica" del acorde, sin conversión.
//  - Latino:    La, Do, Sol menor (abreviado "Solm") — nombres de nota en
//               español/solfeo, en vez de letras A-G.
//  - Grados:    I, bIII, v — números romanos relativos a la tonalidad de la
//               canción (sistema Nashville). Mayúscula = acorde mayor,
//               minúscula = acorde menor. Grados fuera de la escala natural
//               se notan con bemol ANTES del número romano (bIII, bVI) —
//               convención confirmada con Danny, más reconocible para
//               músicos que la alternativa de sostenido-después.

// Notación Americano: el acorde tal cual viene, sin transformación. Existe
// como función explícita (no solo "no llamar nada") para que el código que
// elige el sistema de notación tenga una API simétrica entre los 3 modos.
export function chordToAmericano(chord) {
  return chord;
}

const NOMBRES_LATINOS = {
  'C':'Do','D':'Re','E':'Mi','F':'Fa','G':'Sol','A':'La','B':'Si',
  'C#':'Do#','D#':'Re#','F#':'Fa#','G#':'Sol#','A#':'La#',
  'Db':'Reb','Eb':'Mib','Gb':'Solb','Ab':'Lab','Bb':'Sib',
};

// Notación Latino: convierte la raíz del acorde (A-G) a su nombre de nota
// en español, conservando el sufijo (m, 7, sus4, etc.) pero usando "menor"
// abreviado a "m" pegado al nombre (ej. "Sol menor" se abrevia "Solm" en el
// texto del acorde, igual de compacto que "Gm" en notación americana).
export function chordToLatino(chord) {
  if (!chord) return chord;
  const rootMatch = chord.match(/^([A-G][b#]?)(.*)/);
  if (!rootMatch) return chord;
  const root = rootMatch[1];
  const suffix = rootMatch[2];
  const nombreLatino = NOMBRES_LATINOS[root] || root;
  return nombreLatino + suffix;
}

// Convierte un acorde a su grado relativo a la tonalidad base.
// Ej: chordToNashville('G', 'C') → '5'
//     chordToNashville('Am', 'C') → '6m'
//     chordToNashville('G7', 'C') → '57'
export function chordToNashville(chord, rootKey) {
  if (!chord || !rootKey) return chord;

  // Extraer raíz y sufijo del acorde
  const rootMatch = chord.match(/^([A-G][b#]?)(.*)/);
  if (!rootMatch) return chord;
  const chordRoot = rootMatch[1];
  const suffix = rootMatch[2];

  // Normalizar a CHROMATIC
  const chordBase = ENHAR[chordRoot] || chordRoot;
  const keyBase = ENHAR[rootKey] || rootKey;

  const chordIdx = CHROMATIC.indexOf(chordBase);
  const keyIdx = CHROMATIC.indexOf(keyBase);
  if (chordIdx < 0 || keyIdx < 0) return chord;

  // Grado = semitono relativo a la tónica
  const degree = (chordIdx - keyIdx + 12) % 12;

  // Mapa de semitonos a número de grado — NÚMEROS ROMANOS, notación
  // bemol-antes para grados fuera de la escala natural (bIII, bVI), no
  // sostenido-después — convención confirmada con Danny.
  const DEGREE_MAP = {
    0: 'I',
    1: 'bII',
    2: 'II',
    3: 'bIII',
    4: 'III',
    5: 'IV',
    6: 'bV',
    7: 'V',
    8: 'bVI',
    9: 'VI',
    10: 'bVII',
    11: 'VII',
  };

  const num = DEGREE_MAP[degree] || String(degree);
  // Minúscula si el acorde original es menor (m), mantiene mayúscula si es mayor
  const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj');
  const roman = isMinor ? num.toLowerCase() : num;
  return roman + suffix;
}
