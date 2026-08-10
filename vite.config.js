import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin mínimo: genera dist/firebase-messaging-sw.js en cada build,
// inyectando las mismas VITE_FIREBASE_* que ya usa src/firebase/config.js.
// Necesario porque un Service Worker no tiene acceso a import.meta.env —
// solo puede recibir estos valores si quedan escritos literal en el
// archivo. No son secretos (son los mismos que ya viajan en el bundle
// JS del cliente, visibles en cualquier navegador con devtools), así
// que no hay problema de seguridad en que queden en texto plano acá.
function fcmServiceWorkerPlugin(env) {
  return {
    name: 'fcm-service-worker',
    generateBundle() {
      const cfg = {
        apiKey: env.VITE_FIREBASE_API_KEY || '',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: env.VITE_FIREBASE_APP_ID || '',
      }
      const swSource = `// firebase-messaging-sw.js — GENERADO EN BUILD, no editar a mano.
// Ver el plugin fcmServiceWorkerPlugin en vite.config.js — la fuente
// real vive ahí, este archivo se regenera en cada 'npm run build'.
// Maneja push de FCM con la app cerrada o en segundo plano.
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(cfg)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || 'SetSync';
  const opciones = {
    body: payload.notification?.body || '',
    icon: '/FAVICON SS.png',
    data: payload.data || {},
  };
  self.registration.showNotification(titulo, opciones);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('https://setsync-bax.pages.dev'));
});
`
      this.emitFile({ type: 'asset', fileName: 'firebase-messaging-sw.js', source: swSource })
    },
  }
}

export default defineConfig(({ mode }) => {
  // '.' en vez de process.cwd() — vite.config.js corre en un contexto
  // donde eslint solo tiene globals de browser cargados (ver
  // eslint.config.js), 'process' no está declarado ahí. Vite resuelve
  // '.' contra la raíz del proyecto igual de bien para este propósito.
  const env = loadEnv(mode, '.', 'VITE_')
  return {
    plugins: [react(), fcmServiceWorkerPlugin(env)],
    // En Netlify se sirve desde la raíz. Base '/' funciona para ambos casos.
    base: '/',
  }
})