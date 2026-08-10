// messaging.js — Push notifications (FCM). No-op seguro si Firebase no
// está configurado. Pide permiso del navegador, registra el token en
// Firestore (accounts/{accountId}/tokens, ver firestore.js), y expone un
// listener para mensajes en primer plano (app abierta). Los mensajes con
// la app cerrada/en segundo plano los recibe firebase-messaging-sw.js —
// GENERADO en cada build por el plugin en vite.config.js, no vive en
// public/ como archivo estático porque necesita la config real de
// Firebase inyectada (un Service Worker no tiene import.meta.env).
import { messaging, VAPID_KEY, firebaseListo } from './config';
import { getToken, onMessage } from 'firebase/messaging';
import { getDeviceId, guardarTokenPush, borrarTokenPush } from './firestore';

// Pide permiso, registra el token en el navegador Y lo persiste en
// Firestore de una — así ningún componente tiene que acordarse de hacer
// el segundo paso. Devuelve el token o null (permiso denegado, browser
// sin soporte, o Firebase no configurado — todos casos seguros/no-op).
export async function pedirPermisoYRegistrar(accountId, uid){
  if(!firebaseListo || !messaging || !accountId || !uid) return null;
  try{
    const permiso = await Notification.requestPermission();
    if(permiso !== 'granted') return null;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if(!token) return null;

    await guardarTokenPush(accountId, uid, getDeviceId(), token);
    return token;
  }catch(err){
    console.warn('[FCM] No se pudo registrar:', err.message);
    return null;
  }
}

// Revoca el permiso desde el punto de vista de SetSync — borra el token
// guardado en Firestore para este dispositivo (no puede "des-pedir" el
// permiso del navegador en sí, eso el usuario lo cambia desde el
// candado de la barra de direcciones — solo dejamos de mandarle push).
export async function desactivarPush(accountId, uid){
  if(!firebaseListo || !accountId || !uid) return;
  await borrarTokenPush(accountId, uid, getDeviceId());
}

export function onMensajePrimerPlano(callback){
  if(!firebaseListo || !messaging) return () => {};
  return onMessage(messaging, callback);
}
