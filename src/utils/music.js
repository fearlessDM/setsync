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
