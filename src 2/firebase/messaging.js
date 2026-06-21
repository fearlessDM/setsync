// messaging.js — Push notifications (FCM). No-op seguro si Firebase no
// está configurado. Pide permiso del navegador, registra el token, y
// expone un listener para mensajes en primer plano (cuando la app está
// abierta — los mensajes en segundo plano requieren un Service Worker
// aparte, `public/firebase-messaging-sw.js`, que se agrega cuando se
// quiera notificaciones con la app cerrada — no incluido en esta pasada
// por simplicidad, queda anotado como pendiente).
import { messaging, VAPID_KEY, firebaseListo } from './config';
import { getToken, onMessage } from 'firebase/messaging';

export async function pedirPermisoYRegistrar(){
  if(!firebaseListo || !messaging) return null;
  try{
    const permiso = await Notification.requestPermission();
    if(permiso !== 'granted') return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token; // guardar este token en Firestore junto a la persona, para poder targetear envíos
  }catch(err){
    console.warn('[FCM] No se pudo registrar:', err.message);
    return null;
  }
}

export function onMensajePrimerPlano(callback){
  if(!firebaseListo || !messaging) return () => {};
  return onMessage(messaging, callback);
}
