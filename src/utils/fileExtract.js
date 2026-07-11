// ── Extracción de texto crudo desde archivos subidos localmente ────────────
// Tres formatos soportados: .txt (lectura directa), .docx (mammoth), .pdf
// (pdfjs-dist, con heurística de columna doble). Esto es SOLO extracción —
// el parseo a formato SETSYNC (secciones, acordes) vive en importParser.js,
// separado a propósito: acá el output es siempre texto plano + warnings de
// EXTRACCIÓN (ej. posible columna doble), allá los warnings son de PARSEO.

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
// pdfjs necesita su worker cargado aparte — Vite lo resuelve como asset con
// ?url. Sin esto, pdfjs intenta cargar el worker por defecto desde un CDN
// (falla en producción por CSP/red) o revienta con "Failed to fetch worker".
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

function extensionDe(nombreArchivo) {
  const m = /\.([a-z0-9]+)$/i.exec(nombreArchivo || '');
  return m ? m[1].toLowerCase() : '';
}

function leerComoTexto(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsText(file, 'utf-8');
  });
}

function leerComoArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsArrayBuffer(file);
  });
}

async function extraerDeDocx(file) {
  const buffer = await leerComoArrayBuffer(file);
  const { value, messages } = await mammoth.extractRawText({ arrayBuffer: buffer });
  const warnings = [];
  // mammoth reporta "messages" cuando encuentra estilos/estructura que no
  // pudo mapear con confianza (ej. tablas, imágenes) — no son errores
  // fatales, pero sí señal de que el .docx tenía algo no-trivial.
  if (messages && messages.length > 0) {
    warnings.push('El documento Word tenía elementos que el extractor no pudo procesar completo (tablas, imágenes o estilos) — verificar que no falte texto.');
  }
  return { text: value, warnings };
}

// Agrupa los items de texto de una página de PDF en líneas (misma fila
// aproximada de Y) y detecta si el contenido parece estar en dos columnas
// (dos grupos de X bien separados). Si detecta columna doble, arma el orden
// de lectura como columna izquierda completa → columna derecha completa
// (mejor aproximación sin IA), y deja constancia en warnings para que se
// revise manualmente — esta heurística puede fallar en layouts irregulares.
function reconstruirPaginaPDF(items, warnings) {
  if (items.length === 0) return '';
  const xs = items.map(it => it.transform[4]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const rango = maxX - minX;
  // Bucket simple de X en 10 tramos para detectar bimodalidad (dos columnas
  // = dos picos de densidad separados por un tramo casi vacío en el medio).
  let esColumnaDoble = false;
  if (rango > 200) { // umbral mínimo de ancho para que columna doble tenga sentido
    const buckets = new Array(10).fill(0);
    xs.forEach(x => {
      const idx = Math.min(9, Math.floor(((x - minX) / rango) * 10));
      buckets[idx]++;
    });
    // Busca un "valle" (bucket con <15% de la densidad promedio) entre dos
    // "picos" en la zona central del rango — señal clásica de dos columnas.
    const promedio = items.length / 10;
    for (let i = 3; i <= 6; i++) {
      if (buckets[i] < promedio * 0.15 && buckets.slice(0, i).some(b => b > promedio) && buckets.slice(i + 1).some(b => b > promedio)) {
        esColumnaDoble = true;
        break;
      }
    }
  }

  let ordenados;
  if (esColumnaDoble) {
    const mid = minX + rango / 2;
    const izquierda = items.filter(it => it.transform[4] < mid);
    const derecha = items.filter(it => it.transform[4] >= mid);
    const porY = (a, b) => b.transform[5] - a.transform[5]; // PDF: Y crece hacia arriba
    izquierda.sort(porY);
    derecha.sort(porY);
    ordenados = [...izquierda, ...derecha];
    warnings.push('PDF con posible columna doble — el orden de lectura se infirió automáticamente (izquierda completa, luego derecha), verificar que no haya quedado mezclado.');
  } else {
    ordenados = items.slice().sort((a, b) => {
      const dy = b.transform[5] - a.transform[5];
      if (Math.abs(dy) > 3) return dy; // fila distinta
      return a.transform[4] - b.transform[4]; // misma fila: por X
    });
  }

  // Reconstruye líneas agrupando por Y aproximado (tolerancia 3pt) dentro de
  // cada bloque ya ordenado (columna izq/der o página completa).
  const lineas = [];
  let lineaActual = [], yActual = null;
  ordenados.forEach(it => {
    const y = it.transform[5];
    if (yActual === null || Math.abs(y - yActual) > 3) {
      if (lineaActual.length) lineas.push(lineaActual.join(''));
      lineaActual = [it.str];
      yActual = y;
    } else {
      lineaActual.push(it.hasEOL ? it.str : (it.str.startsWith(' ') ? it.str : ' ' + it.str));
    }
  });
  if (lineaActual.length) lineas.push(lineaActual.join(''));
  return lineas.join('\n');
}

async function extraerDePDF(file) {
  const buffer = await leerComoArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const warnings = [];
  const paginas = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    paginas.push(reconstruirPaginaPDF(content.items, warnings));
  }
  return { text: paginas.join('\n\n'), warnings };
}

// ── Punto de entrada único ──────────────────────────────────────────────
// Devuelve {text, warnings, nombreSugerido}. `warnings` acá son de
// EXTRACCIÓN (capa de archivo), separados de los warnings de PARSEO que
// arma importParser.js sobre este mismo `text`.
export async function extraerTextoDeArchivo(file) {
  const ext = extensionDe(file.name);
  const nombreSugerido = file.name.replace(/\.[a-z0-9]+$/i, '').trim().toUpperCase();
  if (ext === 'txt') {
    const text = await leerComoTexto(file);
    return { text, warnings: [], nombreSugerido };
  }
  if (ext === 'docx') {
    const { text, warnings } = await extraerDeDocx(file);
    return { text, warnings, nombreSugerido };
  }
  if (ext === 'pdf') {
    const { text, warnings } = await extraerDePDF(file);
    return { text, warnings, nombreSugerido };
  }
  throw new Error(`Formato ".${ext}" no soportado — solo .txt, .docx y .pdf.`);
}
