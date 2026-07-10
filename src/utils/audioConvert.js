// audioConvert.js — Conversión de audio en el navegador, sin servidor.
//
// Contexto: los multitracks que carga el usuario suelen ser WAV exportados
// de un DAW — sin comprimir, ~60MB para una canción de 3-4 minutos. Subir
// eso a Storage (y bajarlo cada vez que se abre la canción) es lento y
// pesado, sobre todo en el celular en el escenario. Este módulo comprime
// el audio ANTES de subir, dando al usuario a elegir entre dos rutas reales
// con trade-offs distintos:
//
// MP3 (lamejs): codifica el buffer decodificado de una sola pasada, sin
// reproducir nada — rápido (unos segundos, no depende de la duración de la
// canción), tamaño ~1MB/min a 128kbps.
//
// Opus (MediaRecorder): el navegador no expone un encoder Opus "offline" —
// solo a través de MediaRecorder grabando un stream en tiempo real. Eso
// significa que convertir una canción de 3:12 tarda ~3:12 (no hay atajo).
// A cambio, mejor calidad que MP3 al mismo bitrate. Se puede convertir
// varias pistas en paralelo (cada una en su propio AudioContext) para no
// multiplicar el tiempo total por la cantidad de pistas.

const BITRATE_KBPS = 128;

// ── Estimación de tamaño/tiempo, para mostrarle al usuario ANTES de elegir ──
// No decodifica el archivo — solo usa su duración aproximada (leída con un
// <audio> temporal) y el bitrate objetivo, así el usuario ve la comparación
// sin esperar a que termine ninguna conversión real.
export async function estimarConversion(file) {
  const duracionSeg = await Promise.race([
    new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => { resolve(audio.duration || 0); URL.revokeObjectURL(audio.src); };
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(file);
    }),
    // Timeout de seguridad: algunos WAV con headers no estándar nunca
    // disparan onloadedmetadata en ciertos navegadores — sin este límite,
    // la promesa quedaba colgada para siempre y, al usarse en Promise.all
    // sobre varios archivos, UN solo archivo problemático bloqueaba el
    // modal completo de elección de formato (nunca llegaba a mostrarse,
    // sin ningún error visible — el bug real reportado por Danny).
    new Promise((resolve) => setTimeout(() => resolve(0), 5000)),
  ]);
  const pesoEstimadoMB = (duracionSeg * BITRATE_KBPS) / 8 / 1024;
  return {
    pesoOriginalMB: file.size / 1024 / 1024,
    pesoEstimadoMB,
    duracionSeg,
    tiempoMp3Seg: 2, // codificación offline, prácticamente instantánea sin importar duración
    tiempoOpusSeg: duracionSeg, // MediaRecorder graba en tiempo real: tarda lo que dura el audio
  };
}

// ── Conversión a MP3 (rápida) ──────────────────────────────────────────────
export async function convertirAMp3(file, onProgress) {
  const lamejs = await import('@breezystack/lamejs');
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const buf = await file.arrayBuffer();
  const audioBuf = await ctx.decodeAudioData(buf);
  const sampleRate = audioBuf.sampleRate;
  const numChannels = Math.min(audioBuf.numberOfChannels, 2); // lamejs solo soporta mono/estéreo

  const left = audioBuf.getChannelData(0);
  const right = numChannels > 1 ? audioBuf.getChannelData(1) : left;

  const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, BITRATE_KBPS);
  const blockSize = 1152; // tamaño de bloque requerido por el encoder MP3
  const chunks = [];
  const toInt16 = (f32) => {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };
  const leftI16 = toInt16(left);
  const rightI16 = numChannels > 1 ? toInt16(right) : null;

  const totalBlocks = Math.ceil(leftI16.length / blockSize);
  for (let i = 0; i < leftI16.length; i += blockSize) {
    const l = leftI16.subarray(i, i + blockSize);
    const r = rightI16 ? rightI16.subarray(i, i + blockSize) : undefined;
    const mp3buf = numChannels > 1 ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
    if (mp3buf.length > 0) chunks.push(mp3buf);
    if (onProgress) onProgress(Math.round(((i / blockSize) / totalBlocks) * 100));
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(end);

  ctx.close();
  const blob = new Blob(chunks, { type: 'audio/mpeg' });
  const nombreNuevo = file.name.replace(/\.[^/.]+$/, '') + '.mp3';
  return new File([blob], nombreNuevo, { type: 'audio/mpeg' });
}

// ── Conversión a Opus (mejor calidad, más lenta — tiempo real) ────────────
export async function convertirAOpus(file, onProgress) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const buf = await file.arrayBuffer();
  const audioBuf = await ctx.decodeAudioData(buf);

  const dest = ctx.createMediaStreamDestination();
  const source = ctx.createBufferSource();
  source.buffer = audioBuf;
  source.connect(dest);

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/ogg;codecs=opus';
  const recorder = new MediaRecorder(dest.stream, { mimeType, audioBitsPerSecond: BITRATE_KBPS * 1000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const donePromise = new Promise((resolve) => { recorder.onstop = resolve; });

  const duracionMs = audioBuf.duration * 1000;
  const inicio = Date.now();
  let progresoInterval = null;
  if (onProgress) {
    progresoInterval = setInterval(() => {
      const pct = Math.min(99, Math.round(((Date.now() - inicio) / duracionMs) * 100));
      onProgress(pct);
    }, 250);
  }

  recorder.start();
  source.start();
  await new Promise((resolve) => { source.onended = resolve; });
  recorder.stop();
  await donePromise;

  if (progresoInterval) clearInterval(progresoInterval);
  if (onProgress) onProgress(100);
  ctx.close();

  const blob = new Blob(chunks, { type: mimeType });
  const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
  const nombreNuevo = file.name.replace(/\.[^/.]+$/, '') + '.' + ext;
  return new File([blob], nombreNuevo, { type: mimeType });
}
