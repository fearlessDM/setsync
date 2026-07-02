// config.js — Inicialización de Firebase. Lee la config desde variables
// de entorno de Vite (VITE_FIREBASE_*), NUNCA hardcodeadas en el código.
//
// CÓMO CONFIGURAR (una vez que tengas el proyecto creado en
// console.firebase.google.com y el bloque de config de "Tus apps → Web"):
//
// 1. Local (desarrollo): crear archivo `.env.local` en la raíz del repo
//    (mismo nivel que package.json), NUNCA subirlo a git, con:
//      VITE_FIREBASE_API_KEY=...
//      VITE_FIREBASE_AUTH_DOMAIN=...
//      VITE_FIREBASE_PROJECT_ID=...
//      VITE_FIREBASE_STORAGE_BUCKET=...
//      VITE_FIREBASE_MESSAGING_SENDER_ID=...
//      VITE_FIREBASE_APP_ID=...
//      VITE_FIREBASE_VAPID_KEY=...        (para FCM, Cloud Messaging → "Certificados push web")
//
// 2. Producción (Cloudflare Pages): Dashboard del proyecto → Settings →
//    Environment variables → agregar las mismas variables de arriba,
//    en el ambiente de Production. Cloudflare las inyecta en el build.
//
// IMPORTANTE: nunca usar las URLs *.web.app / *.firebaseapp.com como
// dominio público de nada — esto solo inicializa el SDK (Firestore +
// Messaging), no usamos Firebase Hosting. El dominio público sigue
// siendo el de Cloudflare Pages / tu dominio propio, sin cambios.
//
// Si las variables no están seteadas (todavía no creaste el proyecto),
// `firebaseListo` queda en false y toda la capa de datos (firestore.js)
// usa solo estado local — la app sigue funcionando igual que hoy, sin
// romperse, simplemente sin sync en tiempo real entre dispositivos.

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported as messagingIsSupported } from 'firebase/messaging';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseListo = !!(cfg.apiKey && cfg.projectId);

let app = null, db = null, auth = null, messaging = null;

if (firebaseListo) {
  app = initializeApp(cfg);
  db = getFirestore(app);
  auth = getAuth(app);
  // Messaging solo en navegadores compatibles (no todos soportan FCM web)
  messagingIsSupported().then(soportado => {
    if (soportado) messaging = getMessaging(app);
  });
} else {
  console.warn('[Firebase] Sin configurar — la app funciona en modo local, sin sync en tiempo real. Ver src/firebase/config.js para instrucciones.');
}

export { app, db, auth, messaging };
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
