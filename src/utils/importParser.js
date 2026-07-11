// ── Parser rule-based de import (v1, sin IA) ────────────────────────────────
// Toma texto ya extraído de un archivo (.txt plano, .docx vía mammoth, .pdf
// vía pdfjs-dist — ver fileExtract.js) y lo convierte al formato SETSYNC:
//   NOMBRE\nAUTOR\n\n=== LABEL ===\n{ACORDE:pos}...\nletra...\n\n=== LABEL ===...
// — el mismo formato que ya escribe Cancionero.jsx en su función guardar()
// y que parseBloques()/BloqueFranjas ya saben leer.
//
// Es por REGLAS, no por IA — por diseño puede fallar silenciosamente en
// casos ambiguos (columnas dobles de PDF, alineación imprecisa, secciones
// sin etiqueta clara). Por eso nunca decide en silencio: cualquier caso
// donde tuvo que adivinar queda registrado como string en `warnings`, y es
// justamente ese array el que alimenta el sistema de importStatus/
// importWarnings — ver Cancionero.jsx (badge "Por revisar") y App.jsx
// (importDB). Ninguna canción importada por acá nace "confirmada": eso es
// responsabilidad de que el usuario la abra, la mire, y guarde una vez.

import { BLOQUE_COLORS } from '../components/songview/estructura';
import { convertInlineToStacked } from '../components/songview/EditorAcordes';

// Vocabulario de encabezados de sección reconocidos — mismo set que
// BLOQUE_COLORS (fuente única de verdad de qué es una "sección válida" en
// toda la app), más sinónimos comunes en hojas de acordes reales que no
// están en ese mapa de colores pero sí hay que reconocer como encabezado.
const SECTION_KEYWORDS = [
  ...Object.keys(BLOQUE_COLORS),
  'ESTRIBILLO', 'REMATE', 'CODA', 'INTERLUDE',
];

// Un token de acorde suelto (sin corchetes) — misma gramática que
// CHORD_RE_INLINE en EditorAcordes.jsx, pero anclada de punta a punta
// (^...$) porque acá se usa para clasificar tokens completos, no para
// buscar coincidencias dentro de una línea de letra.
const CHORD_TOKEN_RE = /^[A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?$/;

// ¿Esta línea es un encabezado de sección? Reglas: corta (<=28 chars),
// contiene alguna palabra del vocabulario, y no tiene pinta de línea de
// acordes ni de letra con muchas palabras sueltas.
function esEncabezado(lineaTrim) {
  if (!lineaTrim || lineaTrim.length > 28) return false;
  const upper = lineaTrim.toUpperCase().replace(/:$/, '').trim();
  return SECTION_KEYWORDS.some(k => upper === k || upper.startsWith(k + ' ') || upper.startsWith(k));
}

// Normaliza un encabezado detectado a un label limpio, ej: "verso 1:" -> "VERSO 1"
function normalizarLabel(lineaTrim) {
  return lineaTrim.trim().replace(/:$/, '').trim().toUpperCase();
}

// ¿Esta línea es una línea de ACORDES (varios tokens tipo "G", "Em7", "D/F#"
// separados por espacios, nada de letra real)? Si algún token no matchea la
// gramática de acorde, no cuenta como línea de acordes.
function esLineaAcordes(lineaTrim) {
  if (!lineaTrim) return false;
  const tokens = lineaTrim.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every(tok => CHORD_TOKEN_RE.test(tok));
}

// Convierte una línea de acordes ("   G        Em") + su línea de letra
// correspondiente en una línea stacked "{G:3}{Em:12}" — la posición de
// cada acorde es el índice de carácter donde empieza el token en la línea
// de acordes original, que es exactamente la convención de alineación por
// columna que usan casi todas las hojas de acordes en texto plano/Word.
function lineaAStacked(lineaAcordes) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(lineaAcordes)) !== null) {
    out.push(`{${m[0]}:${m.index}}`);
  }
  return out.join('');
}

// Detecta si el bloque de texto tiene acordes inline tipo "[G]letra" en
// alguna línea — si es así, se procesa distinto (vía convertInlineToStacked)
// que el formato de "línea de acordes arriba de la letra".
function tieneAcordesInline(texto) {
  return /\[[A-G][b#]?[^\]]*\]/.test(texto);
}

// ── Parseo de una sola canción (un archivo = una canción) ──────────────────
// Devuelve {nombre, autor, texto, warnings}. `nombreSugerido` es el nombre
// del archivo sin extensión, usado como fallback si no se detecta un título
// claro en las primeras líneas del documento.
export function parseCancionDesdeTexto(rawText, nombreSugerido) {
  const warnings = [];
  const lineasOriginales = (rawText || '').replace(/\r\n/g, '\n').split('\n');
  // Recorta líneas en blanco sobrantes al principio/final sin perder el
  // resto — un PDF/Word exportado casi siempre trae basura de espaciado.
  let inicio = 0, fin = lineasOriginales.length - 1;
  while (inicio < lineasOriginales.length && !lineasOriginales[inicio].trim()) inicio++;
  while (fin >= 0 && !lineasOriginales[fin].trim()) fin--;
  const lineas = lineasOriginales.slice(inicio, fin + 1);

  if (lineas.length === 0) {
    return { nombre: nombreSugerido, autor: '', texto: '', warnings: ['El archivo no tiene contenido de texto legible — revisar el original.'] };
  }

  // ── Título/autor ───────────────────────────────────────────────────────
  // Heurística: si la primera línea NO es un encabezado de sección y no es
  // una línea de acordes y es razonablemente corta, se asume que es el
  // título. La segunda (bajo el mismo criterio) se asume autor. Si no
  // califican, se cae al nombre del archivo y autor vacío — sin inventar.
  let nombre = nombreSugerido;
  let autor = '';
  let cursor = 0;
  const primera = lineas[0]?.trim() || '';
  if (primera && !esEncabezado(primera) && !esLineaAcordes(primera) && primera.length <= 60) {
    nombre = primera;
    cursor = 1;
    const segunda = lineas[1]?.trim() || '';
    if (segunda && !esEncabezado(segunda) && !esLineaAcordes(segunda) && segunda.length <= 60) {
      autor = segunda;
      cursor = 2;
    }
  } else {
    warnings.push('No se detectó un título claro al inicio del documento — se usó el nombre del archivo, verificar.');
  }

  const restoLineas = lineas.slice(cursor);

  // ── Segmentación en bloques ──────────────────────────────────────────────
  const bloques = []; // [{label, contenidoLines:[]}]
  let curLabel = null, curLines = [];
  const cerrarBloque = () => {
    if (curLabel === null && curLines.every(l => !l.trim())) return; // nada que cerrar
    bloques.push({ label: curLabel || 'VERSO 1', contenidoLines: curLines, labelInferido: curLabel === null });
    curLines = [];
  };
  restoLineas.forEach(linea => {
    const t = linea.trim();
    if (esEncabezado(t)) {
      cerrarBloque();
      curLabel = normalizarLabel(t);
    } else {
      curLines.push(linea);
    }
  });
  cerrarBloque();

  if (bloques.length === 1 && bloques[0].labelInferido) {
    warnings.push('No se detectaron secciones (Verso/Coro/Puente) — todo el contenido se agrupó como "Verso 1" por defecto, revisar.');
  } else {
    bloques.filter(b => b.labelInferido).forEach(() => {
      warnings.push('Sección sin etiqueta clara al inicio del documento, se marcó como "Verso 1" por defecto — revisar.');
    });
  }

  // ── Acordes por bloque ───────────────────────────────────────────────────
  const bloquesTexto = bloques.map(b => {
    const label = b.label;
    const lineasBloque = b.contenidoLines;
    const inline = tieneAcordesInline(lineasBloque.join('\n'));
    let contenidoFinal;
    let huboAcordesEnBloque = inline;

    if (inline) {
      contenidoFinal = convertInlineToStacked(lineasBloque.join('\n'));
    } else {
      // Formato "línea de acordes arriba de la letra" — recorre línea por
      // línea emparejando cada línea de acordes con la siguiente línea de
      // letra. Si una línea de acordes queda sin letra debajo (última línea
      // del bloque, o seguida de otra línea de acordes/blank), se conserva
      // igual como línea stacked propia y se avisa — mejor mostrar algo
      // desalineado y marcado para revisar que perder el acorde en silencio.
      const out = [];
      for (let i = 0; i < lineasBloque.length; i++) {
        const linea = lineasBloque[i];
        const t = linea.trim();
        if (esLineaAcordes(t)) {
          huboAcordesEnBloque = true;
          const siguiente = lineasBloque[i + 1];
          const siguienteEsAcordesOVacia = siguiente === undefined || esLineaAcordes((siguiente || '').trim()) || !siguiente.trim();
          if (siguienteEsAcordesOVacia) {
            out.push(lineaAStacked(linea));
            warnings.push(`Línea de acordes sin letra debajo en "${label}" — verificar alineación.`);
          } else {
            out.push(lineaAStacked(linea));
            out.push(siguiente);
            i++; // consumir la línea de letra ya emparejada
          }
        } else {
          out.push(linea);
        }
      }
      contenidoFinal = out.join('\n');
    }

    if (!huboAcordesEnBloque && lineasBloque.some(l => l.trim())) {
      warnings.push(`Sección "${label}" sin ningún acorde detectado — revisar si el original los tenía.`);
    }

    return `=== ${label} ===\n${contenidoFinal.trim()}`;
  }).filter(b => b.split('\n').slice(1).join('').trim()); // descarta bloques 100% vacíos

  const texto = [`${nombre}\n${autor}\n`, ...bloquesTexto].join('\n\n');
  return { nombre, autor, texto, warnings };
}
