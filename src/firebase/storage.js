// storage.js — Subida y borrado de archivos en Firebase Storage.
//
// Antes, los audios (track de Referencia y multitracks de Secuencia) vivían
// solo como URLs `blob:` locales del navegador (URL.createObjectURL) — se
// perdían al recargar la página, porque nunca se subía el binario a ningún
// lado. Este módulo sube el archivo real a Storage y devuelve una URL
// pública persistente, que es lo que se guarda en Firestore (archivosDB)
// vía el mecanismo ya existente en firestore.js — Storage nunca reemplaza
// a Firestore, solo resuelve dónde vive el binario del audio.
//
// Estructura de carpetas en el bucket:
//   accounts/{accountId}/songs/{baseName}/referencia/{timestamp}-{nombreArchivo}
//   accounts/{accountId}/songs/{baseName}/multitracks/{timestamp}-{nombreArchivo}
//
// Mismo patrón defensivo que firestore.js: si Firebase no está configurado
// (firebaseListo===false), estas funciones no truenan — lanzan un error
// claro que el caller puede mostrar como toast, en vez de romper la app.

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, firebaseListo } from './config';

// Tipos de audio aceptados y su tamaño máximo — un multitrack de 3-4 min en
// Opus/AAC a 128kbps pesa 3-6MB; un WAV del mismo largo pesa 30-40MB. El
// límite generoso (25MB) deja pasar WAV cortos si hace falta, pero avisa
// antes de que alguien suba sin querer un archivo gigante.
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

function sanitizeFileName(name) {
  // Firebase Storage acepta casi cualquier caracter en el nombre, pero
  // espacios y acentos generan URLs feas / problemas de encoding en
  // algunos navegadores viejos — se normaliza acá, una sola vez.
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Sube un archivo de audio a Storage y devuelve su URL pública.
 * @param {string} accountId
 * @param {string} baseName - nombre base de la canción (carpeta)
 * @param {'referencia'|'multitracks'} carpeta
 * @param {File} file
 * @param {(pct:number)=>void} [onProgress] - 0-100, opcional, para mostrar barra de subida
 * @returns {Promise<{url:string, path:string, size:number, nombre:string}>}
 */
export async function subirAudio(accountId, baseName, carpeta, file, onProgress) {
  if (!firebaseListo || !storage) {
    throw new Error('Firebase no está configurado — no se puede subir el archivo. Ver src/firebase/config.js');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB — el máximo es 25MB. Preferí formato Opus o AAC en vez de WAV para bajar el peso.`);
  }
  const path = `accounts/${accountId}/songs/${encodeURIComponent(baseName)}/${carpeta}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  await new Promise((resolve, reject) => {
    task.on('state_changed',
      (snap) => { if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
      (err) => reject(err),
      () => resolve(),
    );
  });

  const url = await getDownloadURL(storageRef);
  return { url, path, size: file.size, nombre: file.name };
}

/**
 * Sube varios archivos de audio en paralelo (multitracks). Cada uno reporta
 * su propio progreso; onProgress recibe el promedio global 0-100.
 * @returns {Promise<Array<{url:string,path:string,size:number,nombre:string}>>}
 */
export async function subirAudiosMultiples(accountId, baseName, carpeta, files, onProgress) {
  const progresos = new Array(files.length).fill(0);
  const reportar = () => {
    if (!onProgress) return;
    const total = progresos.reduce((a, b) => a + b, 0) / files.length;
    onProgress(Math.round(total));
  };
  const subidas = files.map((file, i) =>
    subirAudio(accountId, baseName, carpeta, file, (pct) => { progresos[i] = pct; reportar(); })
  );
  return Promise.all(subidas);
}

/**
 * Borra un archivo de Storage por su path (el campo `path` que devolvió
 * subirAudio). No truena si el archivo ya no existe — borrar algo que no
 * está no es un error real para el usuario.
 */
export async function borrarAudio(path) {
  if (!firebaseListo || !storage || !path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    if (e?.code !== 'storage/object-not-found') throw e;
  }
}
