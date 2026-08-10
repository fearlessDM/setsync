// firestore.js — Capa de datos. Implementa el modelo de 2 capas definido
// en el roadmap:
//   CAPA 1 — Sesión compartida (Firestore, tiempo real): lo que el líder
//     transmite a todo el equipo — evento activo, canción activa, índice
//     de scroll/sección. Todos los dispositivos en línea la ven igual.
//   CAPA 2 — Vista personal (SOLO local, nunca sube a Firestore): zoom,
//     transposición personal, anotaciones propias, preferencias de
//     SongView de cada músico. Esto YA es así hoy (estado de React local)
//     — esta capa no necesita código nuevo, es una decisión de NO
//     sincronizar ciertas cosas, no una feature a construir.
//
// Si Firebase no está configurado (ver config.js), todas las funciones de
// este archivo son no-ops seguros: no rompen la app, simplemente no
// sincronizan nada — la app sigue funcionando 100% local, como hoy.

import { db, firebaseListo } from './config';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, where, getDocs,
} from 'firebase/firestore';

// ── Identidad de cuenta — temporal hasta que exista un sistema de auth
// real. Por ahora, un ID generado una vez por dispositivo y guardado en
// localStorage. El día que haya login real (email/Google), esto se
// reemplaza por el UID de auth sin cambiar la forma de las funciones de
// abajo (mismo `accountId` como primer parámetro en todas) ─────────────
export function getAccountId(){
  let id = localStorage.getItem('setsync_account_id');
  if(!id){
    id = 'acc_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    localStorage.setItem('setsync_account_id', id);
  }
  return id;
}

const noop = () => () => {}; // unsubscribe vacío, mismo shape que onSnapshot real

// ── Eventos ───────────────────────────────────────────────────────────
export function subscribeEventos(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'accounts', accountId, 'eventos');
  return onSnapshot(query(ref), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}
export async function guardarEvento(accountId, evento){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'eventos', String(evento.id)), evento);
}
export async function borrarEvento(accountId, eventoId){
  if(!firebaseListo) return;
  await deleteDoc(doc(db, 'accounts', accountId, 'eventos', String(eventoId)));
}

// ── Personas ──────────────────────────────────────────────────────────
export function subscribePersonas(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'accounts', accountId, 'personas');
  return onSnapshot(query(ref), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}
export async function guardarPersona(accountId, persona){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'personas', String(persona.id)), persona);
}
export async function borrarPersona(accountId, personaId){
  if(!firebaseListo) return;
  await deleteDoc(doc(db, 'accounts', accountId, 'personas', String(personaId)));
}

// ── Equipos (formaciones: Banda/Sonido/etc, con roles[]) ────────────────
export function subscribeEquipos(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'accounts', accountId, 'equipos');
  return onSnapshot(query(ref), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}
export async function guardarEquipo(accountId, equipo){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'equipos', String(equipo.id)), equipo);
}
export async function borrarEquipo(accountId, equipoId){
  if(!firebaseListo) return;
  await deleteDoc(doc(db, 'accounts', accountId, 'equipos', String(equipoId)));
}

// ── CAPA 1: Sesión compartida (lo que el líder transmite en vivo) ──────
// Documento único por cuenta: accounts/{accountId}/sesion/activa
export function subscribeSesionActiva(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'sesion', 'activa');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? snap.data() : null);
  });
}
export async function publicarSesionActiva(accountId, {eventoId, songIndex, songName, timestamp=Date.now()}){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'sesion', 'activa'),
    {eventoId, songIndex, songName, timestamp}, {merge:true});
}

// ── Modo En Vivo (v90) — extiende la sesión compartida de arriba con
// líder + invitación + transporte sincronizado (play/pause de TODAS las
// pistas de Secuencia, para todo el equipo a la vez). Vive en el MISMO
// doc `sesion/activa` (no una colección aparte) porque es exactamente el
// mismo concepto — "lo que el líder transmite en vivo" — solo que ahora
// incluye control real, no solo qué canción está mirando.
//
// Sincronización SIN servidor de tiempo real: en vez de que cada
// dispositivo reaccione al instante en que le llega el mensaje (variable
// según la red), el líder manda un instante ABSOLUTO futuro cercano
// (tsInicioAbs, epoch ms — reloj propio del dispositivo, que en celulares
// modernos ya viene sincronizado por red/NTU del sistema operativo). Cada
// participante programa su propio play para ese mismo instante — así la
// variación de latencia de Firestore deja de importar tanto. No es
// sample-perfect de estudio, pero alcanza para tocar en vivo con click.
export async function iniciarModoVivo(accountId, {liderUid, liderNombre, eventoId, songIndex, songName}){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'sesion', 'activa'), {
    eventoId, songIndex, songName, timestamp:Date.now(),
    liderUid, liderNombre, estado:'llamando',
    transporte:{reproduciendo:false, tsInicioAbs:null, posBaseSeg:0},
  }, {merge:true});
}
export async function finalizarModoVivo(accountId){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'sesion', 'activa'),
    {estado:'finalizada', transporte:{reproduciendo:false, tsInicioAbs:null, posBaseSeg:0}}, {merge:true});
}
// El líder llama esto para poner en 'activa' apenas alguien acepta, o
// para reflejar play/pause/cambio de canción durante la sesión.
export async function actualizarModoVivo(accountId, cambios){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'sesion', 'activa'), cambios, {merge:true});
}

// Participantes — subcolección del mismo doc. Sin pre-crear invitados:
// cualquiera que vea estado 'llamando'/'activa' y no tenga su propio
// participantes/{deviceId} puede responder. Simple y suficiente para
// equipos chicos/medianos (tope real de Cuenta Equipo son 35-36+ personas).
export function subscribeParticipantesVivo(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'accounts', accountId, 'sesion', 'activa', 'participantes');
  return onSnapshot(ref, snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}
export async function responderModoVivo(accountId, deviceId, nombre, respuesta){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'sesion', 'activa', 'participantes', deviceId),
    {nombre, estado:respuesta, respondidoEn:Date.now()});
}

// Identidad de ESTE dispositivo — separada de accountId a propósito: en
// equipos que comparten una sola Cuenta (invite por código, ver más abajo),
// accountId es el mismo para todos, pero cada celular sigue necesitando
// su propia identidad para saber quién aceptó qué en Modo En Vivo.
export function getDeviceId(){
  let id = localStorage.getItem('setsync_device_id');
  if(!id){
    id = 'dev_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    localStorage.setItem('setsync_device_id', id);
  }
  return id;
}

// ── Invitación por código (unirse al equipo de la cuenta sin login) ────
// invites/{codigo} -> {accountId, creadoEn}. Código corto, fácil de
// dictar o poner en un QR. Sin expiración por ahora (se puede agregar
// luego comparando creadoEn contra una fecha límite al resolver).
function generarCodigo(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I, evita confusión
  return Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}
export async function crearInvitacion(accountId){
  if(!firebaseListo) return null;
  const codigo = generarCodigo();
  await setDoc(doc(db, 'invites', codigo), {accountId, creadoEn:Date.now()});
  return codigo;
}
export async function resolverInvitacion(codigo){
  if(!firebaseListo) return null;
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'invites', codigo.toUpperCase().trim()));
  return snap.exists() ? snap.data().accountId : null;
}

// ── Miembros de una cuenta compartida (v90) — reemplaza el modelo viejo
// donde "unirse por código" solo sobreescribía un accountId en
// localStorage, sin ninguna identidad verificable por las Security
// Rules. Ahora: la persona se autentica (aunque sea anónima, ver
// auth.js → iniciarSesionAnonima) y queda registrada acá — las reglas
// verifican esto con exists(), no un match exacto de uid.
export async function agregarMiembroCuenta(accountId, uid, nombre){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'miembros', uid), {
    nombre, agregadoEn: Date.now(),
  });
}

// El accountId "real" (dueño) sigue siendo currentUser.uid por defecto.
// Pero alguien que se unió por código necesita que accountId apunte a
// la cuenta COMPARTIDA, no a su propio uid nuevo — este override, guardado
// en localStorage, gana sobre currentUser.uid cuando existe. Ver App.jsx.
export function getAccountIdOverride(){
  return localStorage.getItem('setsync_invited_account_id') || null;
}
export function setAccountIdOverride(accountId){
  localStorage.setItem('setsync_invited_account_id', accountId);
}
export function limpiarAccountIdOverride(){
  localStorage.removeItem('setsync_invited_account_id');
}

// ── Ensayos (v44-ampliación) — misma forma que Eventos/Personas/Equipos ──
export function subscribeEnsayos(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'accounts', accountId, 'ensayos');
  return onSnapshot(query(ref), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}
export async function guardarEnsayo(accountId, ensayo){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'ensayos', String(ensayo.id)), ensayo);
}
export async function borrarEnsayo(accountId, ensayoId){
  if(!firebaseListo) return;
  await deleteDoc(doc(db, 'accounts', accountId, 'ensayos', String(ensayoId)));
}

// ── Colecciones (v44-ampliación) — misma forma que Eventos/Personas/Equipos.
// Antes vivía SOLO como estado local dentro de Cancionero.jsx, nunca subía
// a ningún lado — se perdía al recargar y no se compartía entre
// dispositivos. Ahora sigue el mismo patrón que el resto. ─────────────────
export function subscribeColecciones(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'accounts', accountId, 'colecciones');
  return onSnapshot(query(ref), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}
export async function guardarColeccion(accountId, coleccion){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'colecciones', String(coleccion.id)), coleccion);
}
export async function borrarColeccion(accountId, coleccionId){
  if(!firebaseListo) return;
  await deleteDoc(doc(db, 'accounts', accountId, 'colecciones', String(coleccionId)));
}

// ── variacionesDB / archivosDB (v44-ampliación) — estas NO son listas de
// ítems con id propio, son mapas {nombreCancion: [...] / {...}}. En vez de
// una colección de un doc por canción (más compleja y sin beneficio real a
// esta escala), se guardan como UN solo documento con el mapa completo —
// más simple, y de sobra dentro del límite de 1MB/doc de Firestore para el
// tamaño de un cancionero real. ──────────────────────────────────────────
export function subscribeVariacionesDB(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'variacionesDB');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? (snap.data().db||{}) : null);
  });
}
export async function guardarVariacionesDB(accountId, db_){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'variacionesDB'), {db: db_});
}
export function subscribeArchivosDB(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'archivosDB');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? (snap.data().db||{}) : null);
  });
}
export async function guardarArchivosDB(accountId, db_){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'archivosDB'), {db: db_});
}
// ── estructurasDB — arreglo por canción (base name) con la ESTRUCTURA DE
// INTERPRETACIÓN (orden de ejecución en vivo: Intro→Verso1→Coro→Verso1...),
// separada del texto de la letra en sí. Mismo patrón que archivosDB/
// variacionesDB (un solo documento con el mapa completo, sincronizado
// entero cada vez que cambia).
export function subscribeEstructurasDB(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'estructurasDB');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? (snap.data().db||{}) : null);
  });
}
export async function guardarEstructurasDB(accountId, db_){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'estructurasDB'), {db: db_});
}

// ── contentDB — letra y acordes de cada canción (base name → texto crudo,
// formato SETSYNC con bloques ===LABEL=== y notas {ACORDE:pos}). Antes vivía
// solo en memoria (objeto JS mutado directo, contentDB[name]=content) y se
// perdía al recargar la página — cualquier canción cargada por un usuario
// real (más allá de las de fábrica sembradas en songs-banda.js/songs-iglesia.js)
// desaparecía sin aviso. Mismo patrón que estructurasDB: un solo documento
// con el diccionario completo, sincronizado entero cada vez que cambia.
export function subscribeContentDB(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'contentDB');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? (snap.data().db||{}) : null);
  });
}
export async function guardarContentDB(accountId, db_){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'contentDB'), {db: db_});
}

// ── importDB — estado de revisión por canción importada (base name →
// {status:'sin_revisar'|'revisada', warnings:[string]}). Separado de
// contentDB a propósito: es metadata SOBRE el origen de la canción (vino
// de un parser automático), no el contenido en sí — así una canción nunca
// pierde su historial de import solo por editarse el texto, y las
// canciones que no vienen de import (manuales, de fábrica) simplemente no
// tienen entrada acá (undefined = no aplica badge). Mismo patrón un-solo-
// documento-sincronizado-entero que estructurasDB/contentDB.
export function subscribeImportDB(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'importDB');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? (snap.data().db||{}) : null);
  });
}
export async function guardarImportDB(accountId, db_){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'importDB'), {db: db_});
}

// ── Líderes delegados (Backstage → Delegar permisos) — antes vivían solo
// en state local de BackstageView.jsx (lideresActuales, sembrado con datos
// de ejemplo hardcodeados) y se perdían al recargar. Un solo documento con
// la lista completa, mismo patrón que variacionesDB/contentDB.
export function subscribeLideres(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'lideres');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? (snap.data().lista||[]) : []);
  });
}
export async function guardarLideres(accountId, lista){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'lideres'), {lista});
}

// ── Palabra del Pastor — versículo/notas/mensaje de la semana en curso.
// Antes el botón "Guardar" solo mostraba un toast; el texto nunca se
// persistía en ningún lado. Documento único, mismo patrón.
export function subscribePastor(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'pastor');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? snap.data() : {versiculo:'',texto:'',notas:''});
  });
}
export async function guardarPastor(accountId, data){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'pastor'), data);
}

// ── Perfil de organización (Backstage/Personalización → Mi organización) ──
// Documento único por cuenta: nombre, tipo (banda/iglesia/otro) y
// ubicación — reemplaza la maqueta sin estado que había antes.
export function subscribePerfilOrg(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = doc(db, 'accounts', accountId, 'data', 'perfilOrg');
  return onSnapshot(ref, snap=>{
    onChange(snap.exists() ? snap.data() : {nombre:'',tipo:'iglesia',ubicacion:''});
  });
}
export async function guardarPerfilOrg(accountId, data){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'accounts', accountId, 'data', 'perfilOrg'), data, {merge:true});
}

// ── Cuenta Equipo (v90) — un admin paga y sus miembros, CADA UNO con su
// propia cuenta/login independiente, quedan en Premium completo. Ojo:
// esto NO es lo mismo que `equipos` más arriba (roster de integrantes
// con roles, tipo "Sonido"/"Visuales", dentro de UNA sola cuenta) — no
// confundir los dos conceptos, coexisten a propósito con nombres
// distintos: `orgs` / `orgMiembros` acá vs `equipos` arriba.
//
// `orgMiembros` es una colección PLANA en la raíz (no subcolección de
// `orgs`) para poder resolver "en qué orgs está el uid X" con un solo
// query — necesario para soportar que una persona esté en más de un
// equipo a la vez (multi-equipo, decisión v90).
//
// El admin agrega miembros por email. Si esa persona todavía no tiene
// cuenta en SetSync, el registro queda con uid:null y estado:'pendiente'
// — se resuelve solo la primera vez que esa persona inicia sesión con
// ese mismo correo (ver vincularMembresiasPendientes, llamada desde
// App.jsx apenas currentUser se confirma).

export async function crearOrg({adminUid, adminEmail, tramoId}){
  if(!firebaseListo) return null;
  const ref = doc(collection(db, 'orgs'));
  await setDoc(ref, {
    adminUid, tramoId, estado:'activa', fechaLimiteGracia:null,
    creadoEn:Date.now(), actualizadoEn:Date.now(),
  });
  // El admin también es miembro activo de su propio equipo desde el día 1.
  await agregarMiembroOrg(ref.id, adminEmail, adminUid);
  return ref.id;
}

export async function actualizarEstadoOrg(orgId, estado, fechaLimiteGracia=null){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'orgs', orgId), {estado, fechaLimiteGracia, actualizadoEn:Date.now()}, {merge:true});
}

export async function actualizarTramoOrg(orgId, tramoId){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'orgs', orgId), {tramoId, actualizadoEn:Date.now()}, {merge:true});
}

export function subscribeOrg(orgId, onChange){
  if(!firebaseListo || !orgId) return noop();
  return onSnapshot(doc(db, 'orgs', orgId), snap=>{
    onChange(snap.exists() ? {...snap.data(), id:snap.id} : null);
  });
}

// Los orgs donde el uid dado es el admin (para mostrarle su panel de gestión).
export function subscribeOrgsComoAdmin(uid, onChange){
  if(!firebaseListo || !uid) return noop();
  const ref = collection(db, 'orgs');
  return onSnapshot(query(ref, where('adminUid','==',uid)), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}

// Miembros de UN org puntual (pantalla del admin: lista + estado de cada uno).
export function subscribeMiembrosOrg(orgId, onChange){
  if(!firebaseListo || !orgId) return noop();
  const ref = collection(db, 'orgMiembros');
  return onSnapshot(query(ref, where('orgId','==',orgId)), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})).filter(m=>m.estado!=='removido'));
  });
}

export async function agregarMiembroOrg(orgId, email, uidConocido=null){
  if(!firebaseListo) return null;
  const emailLimpio = String(email).trim().toLowerCase();
  // ID determinístico (orgId_email), NO autogenerado — a propósito: así
  // las Security Rules pueden verificar "¿pertenezco a este org?" con un
  // get() a una ruta conocida (orgId + mi email del token de Auth), sin
  // necesitar una query dentro de la regla (Firestore Rules no soporta
  // eso). Efecto secundario útil: agregar el mismo email dos veces al
  // mismo org no duplica, solo sobreescribe.
  const miembroId = `${orgId}_${emailLimpio}`;
  const ref = doc(db, 'orgMiembros', miembroId);
  await setDoc(ref, {
    orgId, email: emailLimpio,
    uid: uidConocido, estado: uidConocido ? 'activo' : 'pendiente',
    agregadoEn: Date.now(),
  });
  return ref.id;
}

export async function quitarMiembroOrg(miembroId){
  if(!firebaseListo) return;
  await setDoc(doc(db, 'orgMiembros', miembroId), {estado:'removido'}, {merge:true});
}

// Los orgs vigentes a los que pertenece un uid (miembro activo) — fuente
// de datos de usePlanEfectivo(). Soporta multi-equipo: puede devolver
// más de un registro.
export function subscribeMisMembresias(uid, onChange){
  if(!firebaseListo || !uid) return noop();
  const ref = collection(db, 'orgMiembros');
  return onSnapshot(query(ref, where('uid','==',uid), where('estado','==','activo')), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}

// Al confirmar login, vincula membresías que el admin agregó por email
// ANTES de que esta persona tuviera cuenta en SetSync. Idempotente — si
// no hay nada pendiente con ese correo, no hace nada.
export async function vincularMembresiasPendientes(uid, email){
  if(!firebaseListo || !uid || !email) return;
  const { getDocs, updateDoc } = await import('firebase/firestore');
  const emailLimpio = String(email).trim().toLowerCase();
  const ref = collection(db, 'orgMiembros');
  const snap = await getDocs(query(ref, where('email','==',emailLimpio), where('estado','==','pendiente')));
  await Promise.all(snap.docs.map(d=>updateDoc(d.ref, {uid, estado:'activo'})));
}

// Vincula este uid a su propio registro dentro de equipos[].miembros[]
// (el roster interno, distinto de orgMiembros de arriba) — necesario
// para que los avisos/push le lleguen a la persona correcta: el roster
// nace con solo {name,email,role}, sin uid, porque el líder lo agrega a
// mano antes de que esa persona tenga cuenta. Se ejecuta sobre los
// equipos de la MISMA cuenta donde el usuario ya inició sesión (mismo
// alcance de accountId que ve el resto de la app) — el roster de
// equipos vive embebido en cada doc de equipo (guardarEquipo reescribe
// el array completo), no es una colección plana como orgMiembros, así
// que acá SÍ hace falta traer los documentos completos y reescribirlos.
export async function vincularUidEnEquipos(accountId, uid, email){
  if(!firebaseListo || !accountId || !uid || !email) return;
  const emailLimpio = String(email).trim().toLowerCase();
  const ref = collection(db, 'accounts', accountId, 'equipos');
  const snap = await getDocs(ref);
  const { updateDoc } = await import('firebase/firestore');
  await Promise.all(snap.docs.map(async d=>{
    const equipo = d.data();
    const miembros = equipo.miembros||[];
    let cambio = false;
    const actualizados = miembros.map(m=>{
      if(!m.uid && (m.email||'').trim().toLowerCase()===emailLimpio){
        cambio = true;
        return {...m, uid};
      }
      return m;
    });
    if(cambio) await updateDoc(d.ref, {miembros: actualizados});
  }));
}

// ── Ultra Admin (v91) — el DUEÑO de la plataforma (Danny), distinto de un
// admin de Cuenta Equipo cualquiera (que solo administra SU propio org).
// Mientras no exista pasarela de pago real, Danny confirma manualmente los
// pagos (transferencia, etc.) fuera de la app y ajusta acá el estado de
// CUALQUIER org. Gateado por uid fijo — el chequeo de acá es solo para
// esconder la UI; la barrera de seguridad real vive en firestore.rules
// (orgs solo acepta writes de estado/fechaLimiteGracia de este uid).
// Si Danny cambia de cuenta/uid alguna vez, este valor debe actualizarse
// ACÁ y en firestore.rules a la vez, o el panel queda inaccesible.
export const PLATFORM_OWNER_UID = 'uskOltgjasMMIY8lyqFa00eXUxu2';
export function esUltraAdmin(uid){
  return !!uid && uid === PLATFORM_OWNER_UID;
}

// Todos los orgs de la plataforma, sin filtro — SOLO para el panel de
// Ultra Admin. No es la barrera de seguridad (eso lo hacen las Rules):
// si alguien sin ser el dueño llega a llamar esto, Firestore rechaza la
// lectura igual.
export function subscribeTodosLosOrgs(onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'orgs');
  return onSnapshot(ref, snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})));
  });
}

// Cancelación VOLUNTARIA por el propio admin del equipo — a diferencia de
// 'vencida' (se le venció el período de gracia sin pagar), 'cancelada' es
// una decisión propia. Mismo efecto práctico en planEfectivoDesdeOrgs
// (ninguno de los dos cuenta como vigente) — se separan solo para que el
// historial/UI puedan distinguir el motivo si hace falta más adelante.
export async function cancelarOrg(orgId){
  if(!firebaseListo) return;
  await actualizarEstadoOrg(orgId, 'cancelada', null);
}

// ── Tokens de notificaciones push (FCM) ─────────────────────────────────
// Colección aparte (NO un campo dentro de equipos[].miembros[]) porque:
// (1) una persona puede tener el token registrado en más de un
//     dispositivo (celular + notebook) — acá cada uno es su propio doc;
// (2) equipos[].miembros[] vive dentro del documento completo del
//     equipo (guardarEquipo reescribe el array entero) — refrescar un
//     token ahí reescribiría todo el equipo en cada apertura de app;
// (3) la Cloud Function que dispara el push necesita poder leer/filtrar
//     tokens rápido sin descargar y recorrer todos los equipos.
// tokenId determinístico (uid_deviceId) — mismo patrón que orgMiembros:
// registrar el mismo dispositivo dos veces sobreescribe, no duplica.
export async function guardarTokenPush(accountId, uid, deviceId, token){
  if(!firebaseListo || !uid || !token) return;
  const ref = doc(db, 'accounts', accountId, 'tokens', `${uid}_${deviceId}`);
  await setDoc(ref, {uid, deviceId, token, actualizadoEn: Date.now()});
}
export async function borrarTokenPush(accountId, uid, deviceId){
  if(!firebaseListo) return;
  await deleteDoc(doc(db, 'accounts', accountId, 'tokens', `${uid}_${deviceId}`));
}
// Tokens de un conjunto de personas (uids) — usado por la Cloud Function
// para armar la lista de destinatarios reales de un mensaje. Query 'in'
// de Firestore tiene tope de 30 valores — si un envío convoca a más de
// 30 personas de una vez, hay que trocear en tandas de 30 (anotado, no
// resuelto acá porque hoy ningún equipo real se acerca a ese tamaño).
export async function getTokensPorUids(accountId, uids){
  if(!firebaseListo || !uids?.length) return [];
  const ref = collection(db, 'accounts', accountId, 'tokens');
  const snap = await getDocs(query(ref, where('uid','in',uids.slice(0,30))));
  return snap.docs.map(d=>d.data().token);
}

// ── Mensajes / avisos al equipo ─────────────────────────────────────────
// Reemplaza los toasts falsos de "Enviar" (Backstage → Notificaciones) y
// "Programar" (Próx Fecha → aviso). Escribir acá es lo único que hace el
// cliente — el envío real (push FCM + correo) lo dispara la Cloud
// Function `onMensajeCreado` (functions/index.js) al detectar el
// documento nuevo, nunca el cliente directo (values de service-account
// no pueden vivir en el navegador).
export function subscribeMensajes(accountId, onChange){
  if(!firebaseListo) return noop();
  const ref = collection(db, 'accounts', accountId, 'mensajes');
  return onSnapshot(query(ref), snap=>{
    onChange(snap.docs.map(d=>({...d.data(), id:d.id})).sort((a,b)=>b.creadoEn-a.creadoEn));
  });
}
export async function crearMensaje(accountId, {texto, tipo, destinatarioUids, destinatarioEmails=[], tambienCorreo=false, enviadoPor, eventoId=null, lang='es', programadoPara=null}){
  if(!firebaseListo) return null;
  const ref = doc(collection(db, 'accounts', accountId, 'mensajes'));
  await setDoc(ref, {
    texto, tipo, destinatarioUids, destinatarioEmails, tambienCorreo, enviadoPor, eventoId, lang,
    // Sin programadoPara (o ya vencido) → se envía apenas la Cloud
    // Function onMensajeCreado lo detecte, casi al instante. Con
    // programadoPara en el futuro → onMensajeCreado lo deja en estado
    // 'programado' sin hacer nada, y es el scheduler periódico
    // (despacharMensajesProgramados, cada 15 min) el que lo dispara
    // cuando llega la hora real.
    programadoPara: programadoPara || null,
    creadoEn: Date.now(), estado: 'pendiente',
  });
  return ref.id;
}
