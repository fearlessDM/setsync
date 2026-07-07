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
  collection, doc, setDoc, deleteDoc, onSnapshot, query,
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
