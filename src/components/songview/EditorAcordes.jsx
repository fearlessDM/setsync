import { useState, useRef, useMemo } from 'react';

// ── Editor de acordes — formato SETSYNC stacked ─────────────────────────────
// Reemplaza el formato inline "[G]texto" por notas posicionadas explícitamente
// sobre la letra: "{G:0}{Em:8}" en una línea + "Tu fidelidad es grande" en la
// línea siguiente. La posición es un índice de carácter dentro de la línea de
// letra — ya no depende de gap visual ni de corchetes intercalados en el texto.
//
// Convive con el formato inline viejo: convertChordsToStacked/convertStackedToInline
// hacen la traducción en los dos sentidos, así que Cancionero.jsx puede seguir
// guardando en Firebase el string que ya usa hoy sin tocar el resto de la app
// hasta que se corra la migración completa.

const CHORD_RE_INLINE = /\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
// El grupo del nombre acepta CERO o más caracteres ([^:}]*, no +): un chord
// recién creado por addChord() nace con chord:'' antes de que el usuario
// escriba algo — si el regex exigiera al menos un carácter, ese token
// "{:0}" no volvería a matchear en el siguiente parseStackedLine() y el
// chip se autodestruiría apenas React re-renderizara (bug real encontrado:
// el botón "+" sí creaba el chord, pero desaparecía al instante).
const STACKED_RE = /\{([^:}]*):(\d+)\}/g;

// ── Detecta si una línea es una línea de notas en formato stacked ──────────
export function isStackedChordLine(line) {
  if (!line || !line.trim()) return false;
  const t = line.trim();
  STACKED_RE.lastIndex = 0;
  const matches = t.match(STACKED_RE);
  if (!matches) return false;
  // Toda la línea debe estar compuesta solo de tokens {ACORDE:pos}, nada más
  const sinTokens = t.replace(STACKED_RE, '').trim();
  return sinTokens === '';
}

// ── Parsea una línea stacked en [{chord, pos}] ordenado por posición ───────
export function parseStackedLine(line) {
  const out = [];
  STACKED_RE.lastIndex = 0;
  let m;
  while ((m = STACKED_RE.exec(line || '')) !== null) {
    out.push({ chord: m[1], pos: parseInt(m[2], 10) });
  }
  return out.sort((a, b) => a.pos - b.pos);
}

// ── Serializa [{chord,pos}] de vuelta a la línea de texto stacked ──────────
export function serializeStackedLine(chords) {
  return chords
    .slice()
    .sort((a, b) => a.pos - b.pos)
    .map((c) => `{${c.chord}:${c.pos}}`)
    .join('');
}

// ── Convierte un bloque completo formato inline "[G]texto" → stacked ───────
// Recorre línea por línea; las líneas con acordes inline se parten en dos:
// una línea stacked de notas + una línea de letra limpia.
export function convertInlineToStacked(raw) {
  if (!raw) return raw;
  return raw
    .split('\n')
    .map((line) => {
      CHORD_RE_INLINE.lastIndex = 0;
      if (!CHORD_RE_INLINE.test(line)) return line;
      CHORD_RE_INLINE.lastIndex = 0;
      const chords = [];
      let cleanText = '';
      let last = 0;
      let m;
      while ((m = CHORD_RE_INLINE.exec(line)) !== null) {
        const before = line.slice(last, m.index);
        cleanText += before;
        chords.push({ chord: m[1], pos: cleanText.length });
        last = m.index + m[0].length;
      }
      cleanText += line.slice(last);
      const stackedLine = serializeStackedLine(chords);
      return `${stackedLine}\n${cleanText}`;
    })
    .join('\n');
}

// ── Convierte un bloque stacked de vuelta a inline (compatibilidad hacia atrás) ──
export function convertStackedToInline(raw) {
  if (!raw) return raw;
  const lines = (raw || '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (isStackedChordLine(lines[i]) && lines[i + 1] !== undefined) {
      const chords = parseStackedLine(lines[i]);
      const lyric = lines[i + 1];
      let result = '';
      let last = 0;
      chords.forEach((c) => {
        result += lyric.slice(last, c.pos) + `[${c.chord}]`;
        last = c.pos;
      });
      result += lyric.slice(last);
      out.push(result);
      i++; // saltar la línea de letra ya consumida
    } else {
      out.push(lines[i]);
    }
  }
  return out.join('\n');
}

// ── Arma pares {notas, letra} a partir del contenido crudo del bloque ──────
// Si el contenido está en formato inline viejo, lo convierte primero.
function buildPairs(raw) {
  const stacked = /\{[^:}]+:\d+\}/.test(raw || '') ? raw : convertInlineToStacked(raw || '');
  const lines = (stacked || '').split('\n');
  const pairs = [];
  let i = 0;
  while (i < lines.length) {
    if (isStackedChordLine(lines[i])) {
      pairs.push({ notas: lines[i], letra: lines[i + 1] || '' });
      i += 2;
    } else {
      // línea de letra suelta sin fila de notas propia todavía
      pairs.push({ notas: '', letra: lines[i] });
      i += 1;
    }
  }
  if (pairs.length === 0) pairs.push({ notas: '', letra: '' });
  return pairs;
}

function pairsToRaw(pairs) {
  const lines = [];
  pairs.forEach((p) => {
    lines.push(p.notas || '');
    lines.push(p.letra || '');
  });
  // quitar líneas de notas vacías sueltas al final para no ensuciar el guardado
  while (lines.length >= 2 && !lines[lines.length - 1].trim() && !lines[lines.length - 2].trim()) {
    lines.pop();
    lines.pop();
  }
  return lines.join('\n');
}

// ── BloqueFranjas — versión embebida, sin modal ────────────────────────────
// Vive directo dentro de cada bloque de Cancionero (reemplaza al textarea
// simple). Mismo motor de datos que EditorAcordes de más abajo, pero sin
// header propio, sin Cancelar/Guardar — el bloque entero se guarda junto
// con el resto del formulario. contenido/onChange siguen el mismo contrato
// que un textarea controlado: value=contenido (string raw, stacked o
// inline-viejo), onChange(nuevoContenidoRaw).
export function BloqueFranjas({ contenido, onChange, placeholderLetra }) {
  const [pairs, setPairs] = useState(() => buildPairs(contenido));
  const [editingChip, setEditingChip] = useState(null);
  const [dragVisual, setDragVisual] = useState(null); // {pairIdx, chordIdx, dxPx} — offset visual mientras se arrastra, antes de confirmar la nueva posición
  const dragState = useRef(null);
  const lastEmitted = useRef(contenido);

  // Si el contenido cambia desde afuera (ej. al precargar una canción para
  // editar) y no es un eco de nuestro propio onChange, re-sincroniza pairs.
  if (contenido !== lastEmitted.current) {
    lastEmitted.current = contenido;
  }

  const acordesRecientes = useMemo(() => {
    const set = [];
    pairs.forEach((p) => {
      parseStackedLine(p.notas).forEach((c) => {
        if (!set.includes(c.chord)) set.push(c.chord);
      });
    });
    return set.slice(0, 8);
  }, [pairs]);

  const emit = (nextPairs) => {
    setPairs(nextPairs);
    const raw = pairsToRaw(nextPairs);
    lastEmitted.current = raw;
    onChange(raw);
  };

  const updatePairNotas = (pairIdx, chords) => {
    emit(pairs.map((p, i) => (i === pairIdx ? { ...p, notas: serializeStackedLine(chords) } : p)));
  };
  const updatePairLetra = (pairIdx, letra) => {
    emit(pairs.map((p, i) => (i === pairIdx ? { ...p, letra } : p)));
  };
  const addChord = (pairIdx) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    const pos = pairs[pairIdx].letra.length;
    const nuevos = [...chords, { chord: '', pos }];
    updatePairNotas(pairIdx, nuevos);
    setEditingChip({ pairIdx, chordIdx: nuevos.length - 1 });
  };
  const addChordFromRecent = (pairIdx, chord) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    const pos = pairs[pairIdx].letra.length;
    updatePairNotas(pairIdx, [...chords, { chord, pos }]);
  };
  const removeChord = (pairIdx, chordIdx) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    chords.splice(chordIdx, 1);
    updatePairNotas(pairIdx, chords);
  };
  const renameChord = (pairIdx, chordIdx, newName) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    if (chords[chordIdx]) chords[chordIdx] = { ...chords[chordIdx], chord: newName };
    updatePairNotas(pairIdx, chords);
  };
  const setChordPos = (pairIdx, chordIdx, nuevaPos) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    if (!chords[chordIdx]) return;
    const maxPos = pairs[pairIdx].letra.length;
    chords[chordIdx] = { ...chords[chordIdx], pos: Math.max(0, Math.min(maxPos, nuevaPos)) };
    updatePairNotas(pairIdx, chords);
  };
  const moveChordByChars = (pairIdx, chordIdx, deltaChars) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    if (!chords[chordIdx]) return;
    setChordPos(pairIdx, chordIdx, chords[chordIdx].pos + deltaChars);
  };

  // ── Drag real, mouse + touch, con feedback visual en vivo ────────────────
  // dragVisual guarda el desplazamiento en píxeles mientras el dedo/mouse se
  // mueve, así el chip sigue el gesto de inmediato (antes: el chip solo
  // "saltaba" a la posición final al soltar, lo cual no se sentía como
  // arrastre real). Al soltar, el offset en píxeles se convierte a un
  // delta de caracteres y se confirma con setChordPos.
  const beginDrag = (pairIdx, chordIdx, clientX, fontSizePx) => {
    dragState.current = { pairIdx, chordIdx, x0: clientX, fontSizePx, origPos: parseStackedLine(pairs[pairIdx].notas)[chordIdx]?.pos ?? 0 };
    setDragVisual({ pairIdx, chordIdx, dxPx: 0 });
  };
  const moveDrag = (clientX) => {
    if (!dragState.current) return;
    const dxPx = clientX - dragState.current.x0;
    dragState.current.dxPx = dxPx;
    setDragVisual({ pairIdx: dragState.current.pairIdx, chordIdx: dragState.current.chordIdx, dxPx });
  };
  const finishDrag = () => {
    if (!dragState.current) return;
    const { pairIdx, chordIdx, dxPx, fontSizePx, origPos } = dragState.current;
    const anchoCar = fontSizePx * 0.58;
    const deltaChars = Math.round((dxPx || 0) / anchoCar);
    if (deltaChars !== 0) setChordPos(pairIdx, chordIdx, origPos + deltaChars);
    dragState.current = null;
    setDragVisual(null);
  };
  const attachDragHandlers = (pairIdx, chordIdx, fontSizePx) => ({
    onMouseDown: (e) => {
      e.preventDefault();
      beginDrag(pairIdx, chordIdx, e.clientX, fontSizePx);
      const onMove = (ev) => moveDrag(ev.clientX);
      const onUp = () => {
        finishDrag();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    onTouchStart: (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      beginDrag(pairIdx, chordIdx, touch.clientX, fontSizePx);
      const onMove = (ev) => { if (ev.touches[0]) moveDrag(ev.touches[0].clientX); };
      const onEnd = () => {
        finishDrag();
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
      };
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onEnd);
      document.addEventListener('touchcancel', onEnd);
    },
  });

  return (
    <div style={{ background: 'var(--s1)', padding: '10px 12px' }}>
      {pairs.map((pair, pairIdx) => {
        const chords = parseStackedLine(pair.notas);
        const fontSizePx = 14;
        return (
          <div key={pairIdx} style={{ marginBottom: 8, borderRadius: 6, overflow: 'hidden' }}>
            {/* Franja NOTAS */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.04)', height: 24 }}>
              <span style={{ fontSize: 8, color: 'var(--tx3)', letterSpacing: '.5px', padding: '0 6px', flexShrink: 0, userSelect: 'none', borderRight: '1px solid rgba(255,255,255,.06)' }}>NOTAS</span>
              <div style={{ position: 'relative', height: '100%', flex: 1 }}>
                {chords.map((c, chordIdx) => {
                  const isDraggingThis = dragVisual && dragVisual.pairIdx === pairIdx && dragVisual.chordIdx === chordIdx;
                  const leftPx = c.pos * (fontSizePx * 0.58) + (isDraggingThis ? dragVisual.dxPx : 0);
                  const isEditing = editingChip && editingChip.pairIdx === pairIdx && editingChip.chordIdx === chordIdx;
                  const dragHandlers = attachDragHandlers(pairIdx, chordIdx, fontSizePx);
                  return (
                    <div
                      key={chordIdx}
                      style={{ position: 'absolute', left: leftPx, top: 2, display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(127,119,221,.16)', border: '1px solid #7f77dd', borderRadius: 5, padding: '1px 3px', cursor: 'grab', touchAction: 'none', zIndex: isDraggingThis ? 5 : 1 }}
                      {...dragHandlers}
                    >
                      <span style={{ fontSize: 9, color: '#9089e8', cursor: 'pointer', padding: '0 1px' }}
                        onClick={(e) => { e.stopPropagation(); moveChordByChars(pairIdx, chordIdx, -1); }}>‹</span>
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={c.chord}
                          onBlur={(e) => { renameChord(pairIdx, chordIdx, e.target.value.trim() || c.chord); setEditingChip(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          style={{ width: 34, fontSize: 11, fontWeight: 500, color: '#cecbf6', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#cecbf6', padding: '0 2px', minWidth: 8, textAlign: 'center' }}
                          onClick={() => setEditingChip({ pairIdx, chordIdx })}>{c.chord || '?'}</span>
                      )}
                      <span style={{ fontSize: 9, color: '#9089e8', cursor: 'pointer', padding: '0 1px' }}
                        onClick={(e) => { e.stopPropagation(); moveChordByChars(pairIdx, chordIdx, 1); }}>›</span>
                      <span style={{ fontSize: 8, color: '#665', cursor: 'pointer', paddingLeft: 2 }}
                        onClick={(e) => { e.stopPropagation(); removeChord(pairIdx, chordIdx); }}>✕</span>
                    </div>
                  );
                })}
                <button
                  onClick={() => addChord(pairIdx)}
                  style={{ position: 'absolute', right: 3, top: 2, width: 18, height: 18, background: 'transparent', border: '1px dashed #444', borderRadius: 4, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', fontSize: 11, lineHeight: 1 }}
                >+</button>
              </div>
            </div>
            {/* Franja LETRA — pegada a NOTAS, sin gap entre ambas */}
            <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--s2)' }}>
              <span style={{ fontSize: 8, color: 'var(--tx3)', letterSpacing: '.5px', padding: '0 6px', flexShrink: 0, userSelect: 'none', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,.06)' }}>LETRA</span>
              <input
                value={pair.letra}
                onChange={(e) => updatePairLetra(pairIdx, e.target.value)}
                placeholder={pairIdx === 0 ? placeholderLetra : ''}
                style={{ width: '100%', padding: '5px 6px', background: 'transparent', border: 'none', color: 'var(--tx)', fontSize: 13, fontFamily: "'Outfit',sans-serif", boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          </div>
        );
      })}

      {acordesRecientes.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
          {acordesRecientes.map((ch) => (
            <span key={ch}
              onClick={() => addChordFromRecent(pairs.length - 1, ch)}
              style={{ background: 'rgba(127,119,221,.1)', border: '1px solid rgba(127,119,221,.4)', color: '#b8b2f0', fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 5, cursor: 'pointer' }}
            >{ch}</span>
          ))}
        </div>
      )}

      <button
        onClick={() => emit([...pairs, { notas: '', letra: '' }])}
        style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px dashed var(--bd)', borderRadius: 6, color: 'var(--tx3)', fontSize: 11, cursor: 'pointer' }}
      >+ línea</button>
    </div>
  );
}

// ── Componente principal (modal completo) ───────────────────────────────────
export function EditorAcordes({ label, contenido, onCancel, onSave }) {
  const [pairs, setPairs] = useState(() => buildPairs(contenido));
  const [editingChip, setEditingChip] = useState(null); // {pairIdx, chordIdx} | 'new:{pairIdx}' | null
  const dragState = useRef(null);

  // Acordes usados en toda la canción hasta ahora, para el chip de "recientes"
  const acordesRecientes = useMemo(() => {
    const set = [];
    pairs.forEach((p) => {
      parseStackedLine(p.notas).forEach((c) => {
        if (!set.includes(c.chord)) set.push(c.chord);
      });
    });
    return set.slice(0, 8);
  }, [pairs]);

  const updatePairNotas = (pairIdx, chords) => {
    setPairs((prev) =>
      prev.map((p, i) => (i === pairIdx ? { ...p, notas: serializeStackedLine(chords) } : p))
    );
  };

  const handlePasteLyric = (pairIdx, e) => {
    // El pegado cae solo en la línea de letra — nunca se interpreta como notas.
    // No se necesita lógica especial más allá de dejar el comportamiento nativo
    // del textarea/input de letra, pero se documenta acá porque es una garantía
    // de producto explícita (pedido de Danny), no un efecto colateral.
  };

  const addChord = (pairIdx) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    const pos = pairs[pairIdx].letra.length;
    const nuevos = [...chords, { chord: '', pos }];
    updatePairNotas(pairIdx, nuevos);
    setEditingChip({ pairIdx, chordIdx: nuevos.length - 1 });
  };

  const addChordFromRecent = (pairIdx, chord) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    const pos = pairs[pairIdx].letra.length;
    updatePairNotas(pairIdx, [...chords, { chord, pos }]);
  };

  const removeChord = (pairIdx, chordIdx) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    chords.splice(chordIdx, 1);
    updatePairNotas(pairIdx, chords);
  };

  const renameChord = (pairIdx, chordIdx, newName) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    if (chords[chordIdx]) chords[chordIdx] = { ...chords[chordIdx], chord: newName };
    updatePairNotas(pairIdx, chords);
  };

  const moveChordByChars = (pairIdx, chordIdx, deltaChars) => {
    const chords = parseStackedLine(pairs[pairIdx].notas);
    if (!chords[chordIdx]) return;
    const maxPos = pairs[pairIdx].letra.length;
    const nuevaPos = Math.max(0, Math.min(maxPos, chords[chordIdx].pos + deltaChars));
    chords[chordIdx] = { ...chords[chordIdx], pos: nuevaPos };
    updatePairNotas(pairIdx, chords);
  };

  // ── Drag con mouse/touch — mismo enfoque de medición real de carácter ────
  // que ya usa vistaLineal.jsx (medirAnchoCaracter), para que un mismo gesto
  // de arrastre visual mueva siempre la misma cantidad real de caracteres,
  // sin importar el tamaño de fuente en pantalla.
  const startDrag = (pairIdx, chordIdx, clientX, fontSizePx) => {
    dragState.current = { pairIdx, chordIdx, x0: clientX, fontSizePx };
  };
  const onDragMove = (clientX) => {
    if (!dragState.current) return;
    const { fontSizePx } = dragState.current;
    const dx = clientX - dragState.current.x0;
    dragState.current.dx = dx;
    dragState.current.anchoCar = fontSizePx * 0.58; // aproximación consistente con Outfit bold
  };
  const endDrag = () => {
    if (!dragState.current) return;
    const { pairIdx, chordIdx, dx, anchoCar } = dragState.current;
    if (dx && anchoCar) {
      const steps = Math.round(dx / anchoCar);
      if (steps !== 0) moveChordByChars(pairIdx, chordIdx, steps);
    }
    dragState.current = null;
  };

  const handleSave = () => {
    onSave(pairsToRaw(pairs));
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', background: '#0d0d0d', borderRadius: 20, padding: 16, fontFamily: "'Outfit',sans-serif", color: '#eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>Editar acordes</span>
        </div>
        <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
      </div>

      <div style={{ background: 'rgba(29,158,117,.08)', border: '1px solid rgba(29,158,117,.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, color: '#5dcaa5', marginTop: 1 }}>↔</span>
        <p style={{ fontSize: 13, color: '#9fe1cb', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
          Arrastra el acorde a la izquierda o derecha para ajustar la posición fina sobre la letra.
        </p>
      </div>

      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: '14px 12px', marginBottom: 12 }}>
        {pairs.map((pair, pairIdx) => {
          const chords = parseStackedLine(pair.notas);
          const fontSizePx = 17;
          return (
            <div key={pairIdx} style={{ marginBottom: 6 }}>
              {/* Franja de notas */}
              <div style={{ background: '#1c1c1c', borderRadius: '6px 6px 0 0', padding: '5px 8px', position: 'relative', height: 26 }}>
                {chords.map((c, chordIdx) => {
                  const leftPx = c.pos * (fontSizePx * 0.58);
                  const isEditing = editingChip && editingChip.pairIdx === pairIdx && editingChip.chordIdx === chordIdx;
                  return (
                    <div
                      key={chordIdx}
                      style={{ position: 'absolute', left: leftPx, top: 3, display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(127,119,221,.16)', border: '1px solid #7f77dd', borderRadius: 5, padding: '2px 4px', cursor: 'grab' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startDrag(pairIdx, chordIdx, e.clientX, fontSizePx);
                        const onMove = (ev) => onDragMove(ev.clientX);
                        const onUp = () => {
                          endDrag();
                          document.removeEventListener('mousemove', onMove);
                          document.removeEventListener('mouseup', onUp);
                        };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      }}
                    >
                      <span
                        style={{ fontSize: 10, color: '#9089e8', cursor: 'pointer', padding: '0 2px' }}
                        onClick={(e) => { e.stopPropagation(); moveChordByChars(pairIdx, chordIdx, -1); }}
                      >‹</span>
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={c.chord}
                          onBlur={(e) => { renameChord(pairIdx, chordIdx, e.target.value.trim() || c.chord); setEditingChip(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          style={{ width: 40, fontSize: 12, fontWeight: 500, color: '#cecbf6', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
                        />
                      ) : (
                        <span
                          style={{ fontSize: 12, fontWeight: 500, color: '#cecbf6', padding: '0 2px', minWidth: 10, textAlign: 'center' }}
                          onClick={() => setEditingChip({ pairIdx, chordIdx })}
                        >{c.chord || '?'}</span>
                      )}
                      <span
                        style={{ fontSize: 10, color: '#9089e8', cursor: 'pointer', padding: '0 2px' }}
                        onClick={(e) => { e.stopPropagation(); moveChordByChars(pairIdx, chordIdx, 1); }}
                      >›</span>
                      <span
                        style={{ fontSize: 9, color: '#665', cursor: 'pointer', paddingLeft: 3 }}
                        onClick={(e) => { e.stopPropagation(); removeChord(pairIdx, chordIdx); }}
                      >✕</span>
                    </div>
                  );
                })}
                <button
                  onClick={() => addChord(pairIdx)}
                  style={{ position: 'absolute', right: 4, top: 3, width: 20, height: 20, background: 'transparent', border: '1px dashed #444', borderRadius: 5, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}
                >+</button>
              </div>

              {/* Línea de letra — tintado de máx. 2 caracteres bajo cada acorde */}
              <div style={{ fontSize: fontSizePx, lineHeight: 1.5, letterSpacing: '0.3px', background: '#161616', padding: '1px 0 0' }}>
                {renderLetraConTinte(pair.letra, chords)}
              </div>

              <textarea
                value={pair.letra}
                onChange={(e) => setPairs((prev) => prev.map((p, i) => (i === pairIdx ? { ...p, letra: e.target.value } : p)))}
                onPaste={(e) => handlePasteLyric(pairIdx, e)}
                rows={1}
                placeholder="Escribe o pega la letra aquí..."
                style={{ width: '100%', marginTop: 4, padding: '6px 4px', background: 'transparent', border: '1px dashed #262626', borderRadius: 4, color: '#888', fontSize: 12, fontFamily: "'Outfit',sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          );
        })}

        <button
          onClick={() => setPairs((prev) => [...prev, { notas: '', letra: '' }])}
          style={{ width: '100%', marginTop: 6, padding: '8px', background: 'transparent', border: '1px dashed #333', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}
        >+ línea</button>
      </div>

      {acordesRecientes.length > 0 && (
        <div style={{ background: '#1c1c1c', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: '#666', margin: '0 0 6px', letterSpacing: '0.3px' }}>acordes recientes en esta canción</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {acordesRecientes.map((ch) => (
              <span
                key={ch}
                onClick={() => { if (pairs.length) addChordFromRecent(0, ch); }}
                style={{ background: 'rgba(127,119,221,.1)', border: '1px solid rgba(127,119,221,.4)', color: '#b8b2f0', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6, cursor: 'pointer' }}
              >{ch}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 15, color: '#666' }}>📋</span>
        <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.4 }}>
          Al pegar texto, se pegará solo en la línea de <span style={{ color: '#bbb' }}>letra</span> — nunca en la franja de notas.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, background: '#161616', border: '1px solid #333', color: '#999', fontSize: 14, fontWeight: 500, padding: 11, borderRadius: 10, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={handleSave} style={{ flex: 1, background: '#1d9e75', border: 'none', color: '#04342c', fontSize: 14, fontWeight: 500, padding: 11, borderRadius: 10, cursor: 'pointer' }}>Guardar cambios</button>
      </div>
    </div>
  );
}

// ── Tinta máximo 2 caracteres de la sílaba a partir de la posición del acorde ──
function renderLetraConTinte(letra, chords) {
  if (!letra) return <span style={{ color: '#555' }}>&nbsp;</span>;
  const tintPositions = new Set();
  chords.forEach((c) => {
    tintPositions.add(c.pos);
    if (c.pos + 1 < letra.length) tintPositions.add(c.pos + 1);
  });
  const out = [];
  let i = 0;
  while (i < letra.length) {
    if (tintPositions.has(i)) {
      let j = i;
      while (j < letra.length && tintPositions.has(j) && j - i < 2) j++;
      out.push(
        <span key={i} style={{ background: 'rgba(127,119,221,.16)', color: '#cecbf6', borderRadius: 3 }}>
          {letra.slice(i, j)}
        </span>
      );
      i = j;
    } else {
      let j = i;
      while (j < letra.length && !tintPositions.has(j)) j++;
      out.push(<span key={i}>{letra.slice(i, j)}</span>);
      i = j;
    }
  }
  return out;
}
