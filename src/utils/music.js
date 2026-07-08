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

// ── Detección heurística de tonalidad ────────────────────────────────────
// Dada la lista de acordes usados en una canción, sugiere la tónica más
// probable. No usa IA — es una heurística de teoría musical: para cada una
// de las 12 tónicas posibles, evalúa qué tan bien encajan los acordes
// únicos de la canción en su escala mayor diatónica (I ii iii IV V vi vii°),
// dando más peso a los grados I y V (tónica y dominante) porque son los que
// de verdad anclan el oído a una tonalidad — un acorde IV o vi puede
// aparecer en varias tonalidades relacionadas sin decir mucho por sí solo.
// Un acorde que no encaja en absoluto en la escala de una tónica candidata
// penaliza esa tónica, en vez de simplemente no sumar. Se cuenta por acorde
// ÚNICO usado (no por repetición en el texto), así una canción que repite
// mucho el mismo acorde no le da un peso artificial.
//
// Validada contra progresiones típicas de iglesia/banda (incluyendo casos
// donde la canción no arranca en su propia tónica, ej. "Am F C G" → C).
const GRADOS_MAYOR = [0, 2, 4, 5, 7, 9, 11]; // semitonos de la escala mayor natural, en orden I ii iii IV V vi vii
const ES_MENOR_EN_GRADO = { 2: true, 4: true, 9: true }; // ii, iii, vi son menores en una tonalidad mayor
const PESO_POR_GRADO = [3, 0.5, 0.5, 1, 2.5, 0.5, 0.3]; // I y V pesan mucho más que el resto

export function detectarTonalidad(acordes) {
  if (!acordes || acordes.length === 0) return null;
  const parsed = acordes
    .map((raw) => {
      const m = String(raw).trim().match(/^([A-G][b#]?)(.*)$/);
      if (!m) return null;
      const base = ENHAR[m[1]] || m[1];
      const idx = CHROMATIC.indexOf(base);
      if (idx < 0) return null;
      const suf = m[2] || '';
      const esMenor = suf.startsWith('m') && !suf.startsWith('maj');
      return { idx, esMenor };
    })
    .filter(Boolean);
  if (parsed.length === 0) return null;

  // Reducir a acordes únicos con su frecuencia — evita que repetir el mismo
  // acorde muchas veces en el texto le dé un peso desproporcionado.
  const conteo = new Map();
  parsed.forEach((p) => {
    const k = `${p.idx}_${p.esMenor}`;
    conteo.set(k, (conteo.get(k) || 0) + 1);
  });
  const unicos = [...conteo.entries()].map(([k, freq]) => {
    const [idx, esMenor] = k.split('_');
    return { idx: Number(idx), esMenor: esMenor === 'true', freq };
  });

  let mejorTonica = null;
  let mejorPuntaje = -Infinity;
  for (let tonica = 0; tonica < 12; tonica++) {
    let puntaje = 0;
    unicos.forEach(({ idx, esMenor, freq }) => {
      const gradoIdx = GRADOS_MAYOR.indexOf((idx - tonica + 12) % 12);
      if (gradoIdx === -1) { puntaje -= 2; return; } // acorde fuera de la escala natural de esta tónica candidata
      const esperaMenor = !!ES_MENOR_EN_GRADO[gradoIdx];
      const peso = PESO_POR_GRADO[gradoIdx];
      puntaje += (esperaMenor === esMenor ? peso : peso * 0.3) * freq;
    });
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorTonica = tonica;
    }
  }
  return CHROMATIC[mejorTonica];
}

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
