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

// ── Sistema Nashville (grados numéricos) ─────────────────────────────────────
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

  // Mapa de semitonos a número de grado — NÚMEROS ROMANOS
  const DEGREE_MAP = {
    0: 'I',
    1: 'I#',   // bII
    2: 'II',
    3: 'II#',  // bIII
    4: 'III',
    5: 'IV',
    6: 'IV#',  // bV / #IV
    7: 'V',
    8: 'V#',   // bVI
    9: 'VI',
    10: 'VI#', // bVII
    11: 'VII',
  };

  const num = DEGREE_MAP[degree] || String(degree);
  // Minúscula si el acorde original es menor (m), mantiene mayúscula si es mayor
  const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj');
  const roman = isMinor ? num.toLowerCase() : num;
  return roman + suffix;
}
