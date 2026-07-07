import { useState, useCallback } from 'react';

// LABELS_DISPONIBLES: orden y estructura que se muestra en los chips
export const LABELS_DISPONIBLES = [
  'INTRO', 'VERSO', 'VERSO2', 'VERSO3', 'CORO', 'COROX2',
  'INSTRUMENTAL', 'PUENTE', 'PUENTEX2', 'FINAL'
];

/**
 * useMarcarPartes
 * Gestiona la lógica del Paso 2 (marcar partes de la letra):
 * - Captura selecciones de texto (window.getSelection)
 * - Etiqueta rangos con labels (Intro, Verso, Coro, etc.)
 * - Detecta texto repetido y sugiere reutilización
 * - Mantiene array de {start, end, label, text, isRepetido}
 * - Renderiza tramos coloreados
 */
export function useMarcarPartes(textoInicial = '') {
  const [texto, setTexto] = useState(textoInicial);
  const [tramos, setTramos] = useState([]); // {start, end, label, text, isRepetido}
  const [seleccionActual, setSeleccionActual] = useState(null); // {start, end, text}
  const [sugerenciaRepetido, setSugerenciaRepetido] = useState(null); // {tramoPrevio, tramoPrevioIdx}

  // ── Capturar selección cuando el usuario suelta el ratón/dedo
  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel.toString().trim()) {
      setSeleccionActual(null);
      return;
    }

    // Calcular posiciones start/end dentro del texto
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(document.getElementById('text-input-paso2'));
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const start = preCaretRange.toString().length - sel.toString().length;
    const end = start + sel.toString().length;

    const selectedText = sel.toString();
    setSeleccionActual({ start, end, text: selectedText });

    // Detectar si el texto seleccionado coincide con algún tramo previo (sin espacios/mayúsculas)
    const normalizedSelected = selectedText.trim().toLowerCase().replace(/\s+/g, ' ');
    const repetidoIdx = tramos.findIndex(
      t => t.text.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedSelected
    );

    if (repetidoIdx >= 0) {
      setSugerenciaRepetido({
        tramoPrevio: tramos[repetidoIdx],
        tramoPrevioIdx: repetidoIdx,
      });
    } else {
      setSugerenciaRepetido(null);
    }
  }, [tramos]);

  // ── Etiquetar la selección actual con un label
  const etiquetarSeleccion = useCallback(
    (label, isRepetido = false) => {
      if (!seleccionActual) return;

      const nuevoTramo = {
        start: seleccionActual.start,
        end: seleccionActual.end,
        label,
        text: seleccionActual.text,
        isRepetido, // si es true, no se agrega al paso 3 como bloque único
      };

      setTramos(prev => {
        const updated = [...prev];
        // Reemplazar si hay solapamiento con un tramo existente
        const idx = updated.findIndex(t => t.start === nuevoTramo.start && t.end === nuevoTramo.end);
        if (idx >= 0) {
          updated[idx] = nuevoTramo;
        } else {
          updated.push(nuevoTramo);
        }
        return updated.sort((a, b) => a.start - b.start);
      });

      setSeleccionActual(null);
      setSugerenciaRepetido(null);
    },
    [seleccionActual]
  );

  // ── Eliminar un tramo etiquetado
  const eliminarTramo = useCallback((idx) => {
    setTramos(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Editar el texto (Paso 2 permite seguir editando)
  const handleTextoChange = useCallback((nuevoTexto) => {
    setTexto(nuevoTexto);
    // TODO: aquí se podría re-mapear índices de tramos si el texto cambió
    // Por ahora, es simplificado: si el usuario edita mucho, los tramos quedan desalineados
  }, []);

  // ── Reconstruir el string con ===LABEL=== insertados
  const reconstruirConLabels = useCallback(() => {
    if (tramos.length === 0) return texto;

    // Obtener bloques únicos (no repetidos)
    const bloques = tramos.filter(t => !t.isRepetido);

    // Ordenar por start y construir el string
    let result = '';
    let lastEnd = 0;

    bloques.forEach(bloque => {
      // Agregar el contenido antes del bloque
      result += texto.slice(lastEnd, bloque.start);
      // Insertar el marcador de bloque
      result += `\n====${bloque.label}====\n`;
      // Agregar el contenido del bloque
      result += texto.slice(bloque.start, bloque.end);
      lastEnd = bloque.end;
    });

    // Agregar el resto del texto
    result += texto.slice(lastEnd);

    return result.trim();
  }, [texto, tramos]);

  // ── Obtener lista de bloques únicos para Paso 3
  const getBloquesPaso3 = useCallback(() => {
    const unicos = [];
    const yaVistos = new Set();

    tramos.forEach(t => {
      if (!t.isRepetido && !yaVistos.has(t.label)) {
        unicos.push(t.label);
        yaVistos.add(t.label);
      }
    });

    return unicos;
  }, [tramos]);

  return {
    // Estado
    texto,
    tramos,
    seleccionActual,
    sugerenciaRepetido,

    // Handlers
    handleTextSelection,
    handleTextoChange,
    etiquetarSeleccion,
    eliminarTramo,

    // Utilidades
    reconstruirConLabels,
    getBloquesPaso3,
  };
}
