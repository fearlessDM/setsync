// auth.js — Autenticación real (Firebase Auth). No-op seguro si Firebase
// no está configurado (mismo patrón que firestore.js) — así el modo
// 100% local sigue funcionando para cualquiera que no haya configurado
// las variables de entorno todavía.
//
// Métodos habilitados en la consola real (setsync-prod, 01-Jul-2026):
// Correo electrónico/contraseña, Google.

import { auth, firebaseListo } from './config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

// Traduce los códigos de error de Firebase a mensajes que un músico
// entienda, no el texto técnico en inglés que tira el SDK por defecto.
function mensajeError(err){
  const map = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta — intenta iniciar sesión.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos — espera un momento y vuelve a intentar.',
    'auth/popup-closed-by-user': 'Ventana de Google cerrada antes de terminar.',
    'auth/network-request-failed': 'Sin conexión — revisa tu internet.',
  };
  return map[err?.code] || 'Algo salió mal. Intenta de nuevo.';
}

export async function registrarse(nombre, email, password){
  if(!firebaseListo) throw new Error('Firebase no está configurado todavía.');
  try{
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if(nombre?.trim()) await updateProfile(cred.user, {displayName: nombre.trim()});
    return cred.user;
  }catch(err){ throw new Error(mensajeError(err)); }
}

export async function iniciarSesion(email, password){
  if(!firebaseListo) throw new Error('Firebase no está configurado todavía.');
  try{
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  }catch(err){ throw new Error(mensajeError(err)); }
}

export async function iniciarSesionConGoogle(){
  if(!firebaseListo) throw new Error('Firebase no está configurado todavía.');
  try{
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  }catch(err){ throw new Error(mensajeError(err)); }
}

// Login anónimo — para quien se une a una cuenta compartida con un
// código de invitación, sin querer/necesitar registrarse con email. Le
// da una identidad REAL de Firebase Auth (uid estable, verificable por
// las Security Rules), a diferencia del viejo accountId "fantasma" que
// solo vivía en localStorage y no servía para nada ante las reglas.
export async function iniciarSesionAnonima(nombre){
  if(!firebaseListo) throw new Error('Firebase no está configurado todavía.');
  try{
    const cred = await signInAnonymously(auth);
    if(nombre?.trim()) await updateProfile(cred.user, {displayName: nombre.trim()});
    return cred.user;
  }catch(err){ throw new Error(mensajeError(err)); }
}

export async function cerrarSesion(){
  if(!firebaseListo) return;
  await signOut(auth);
}

// cb recibe el user object (o null si no hay sesión). Devuelve unsubscribe.
export function onAuthChange(cb){
  if(!firebaseListo){ cb(null); return ()=>{}; }
  return onAuthStateChanged(auth, cb);
}
