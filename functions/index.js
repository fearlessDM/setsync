// functions/index.js — Cloud Functions de SetSync.
//
// DOS triggers sobre la misma colección accounts/{accountId}/mensajes:
//
// 1. onMensajeCreado (Firestore trigger, onCreate)
//    Se dispara al instante en que el cliente escribe el mensaje.
//    - Si NO tiene programadoPara (o ya venció) → lo envía ya mismo.
//    - Si programadoPara es una fecha futura → lo deja en estado
//      'programado' y no hace nada más; el scheduler de abajo se
//      encarga cuando llegue la hora.
//
// 2. despacharMensajesProgramados (Cloud Scheduler, cada 15 min)
//    Recorre TODAS las cuentas buscando mensajes en estado 'programado'
//    con programadoPara <= ahora, y los envía. collectionGroup query
//    porque 'mensajes' vive repetida bajo cada accounts/{accountId} —
//    esto es justo el caso de uso que collectionGroup existe para
//    resolver (buscar en una subcolección del mismo nombre, sin
//    importar bajo qué documento padre esté).
//
// El cliente (BackstageView.jsx → Notificaciones, AdminView.jsx →
// MiSetlistNotif) NUNCA interpreta nombres de equipo ni arma el push
// directo — solo resuelve "equipo X" a UIDs/emails reales y escribe el
// documento vía crearMensaje() en firebase/firestore.js. Todo lo que
// necesita el service account con permiso de envío (Admin SDK) vive acá,
// nunca en el navegador.
//
// Requiere plan Blaze (pay-as-you-go) — los triggers de Firestore Y
// Cloud Scheduler no corren en el plan Spark gratuito. Capa gratuita de
// Blaze cubre de sobra el volumen esperado de una app de este tamaño.

const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');
const {logger} = require('firebase-functions');

initializeApp();
const db = getFirestore();

// Firestore 'in' soporta máximo 30 valores por query — si un mensaje
// convoca a más de 30 personas, se resuelve en tandas.
async function getTokensPorUids(accountId, uids) {
  const tandas = [];
  for (let i = 0; i < uids.length; i += 30) tandas.push(uids.slice(i, i + 30));

  const tokens = [];
  for (const tanda of tandas) {
    const snap = await db
        .collection('accounts').doc(accountId).collection('tokens')
        .where('uid', 'in', tanda)
        .get();
    snap.forEach((d) => {
      const t = d.data().token;
      if (t) tokens.push(t);
    });
  }
  return tokens;
}

const TITULOS_POR_TIPO = {
  recordatorio: {es: 'Recordatorio', pt: 'Lembrete', en: 'Reminder'},
  cambio: {es: 'Cambio de setlist', pt: 'Mudança na setlist', en: 'Setlist change'},
  urgente: {es: '⚠️ Urgente', pt: '⚠️ Urgente', en: '⚠️ Urgent'},
  general: {es: 'SetSync', pt: 'SetSync', en: 'SetSync'},
};

// Núcleo de envío — compartido entre el trigger inmediato y el
// scheduler, para no mantener dos copias de la misma lógica de push +
// limpieza de tokens vencidos + correo.
async function enviarMensaje(accountId, mensajeId, msg, ref) {
  try {
    const uids = Array.isArray(msg.destinatarioUids) ? msg.destinatarioUids : [];
    if (uids.length === 0) {
      await ref.update({estado: 'error', errorMsg: 'Sin destinatarios resueltos'});
      return;
    }

    const tokens = await getTokensPorUids(accountId, uids);

    // Sin tokens registrados no es un error del sistema — solo
    // significa que nadie del equipo activó push todavía.
    if (tokens.length === 0) {
      await ref.update({estado: 'sin_destinatarios_push', enviadoEn: Date.now()});
    } else {
      const lang = ['es', 'pt', 'en'].includes(msg.lang) ? msg.lang : 'es';
      const titulo = (TITULOS_POR_TIPO[msg.tipo] || TITULOS_POR_TIPO.general)[lang];

      const resultado = await getMessaging().sendEachForMulticast({
        tokens,
        notification: {
          title: titulo,
          body: String(msg.texto || '').slice(0, 180),
        },
        data: {
          accountId,
          mensajeId,
          eventoId: msg.eventoId ? String(msg.eventoId) : '',
        },
        webpush: {
          fcmOptions: {link: 'https://setsync-bax.pages.dev'},
        },
      });

      // Tokens que fallaron por estar vencidos/desinstalados se limpian
      // solos — evita que la próxima tanda siga intentando mandarle
      // push a un dispositivo que ya no existe.
      const tokensInvalidos = [];
      resultado.responses.forEach((r, i) => {
        const code = r.error?.code;
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token') {
          tokensInvalidos.push(tokens[i]);
        }
      });
      if (tokensInvalidos.length) {
        const snapTokens = await db
            .collection('accounts').doc(accountId).collection('tokens')
            .where('token', 'in', tokensInvalidos.slice(0, 30))
            .get();
        const batch = db.batch();
        snapTokens.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await ref.update({
        estado: 'enviado',
        enviadoEn: Date.now(),
        pushExitosos: resultado.successCount,
        pushFallidos: resultado.failureCount,
      });
    }

    // Correo, además del push, si el que envió tildó la opción.
    if (msg.tambienCorreo && Array.isArray(msg.destinatarioEmails) && msg.destinatarioEmails.length) {
      await db.collection('mail').add({
        to: msg.destinatarioEmails,
        message: {
          subject: `SetSync — ${String(msg.texto || '').slice(0, 60)}`,
          html: `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;color:#1F1F1F;">
            <p style="font-size:15px;line-height:1.6;">${msg.texto}</p>
            <p style="font-size:12px;color:#999;margin-top:24px;">Enviado desde SetSync.</p>
          </div>`,
        },
        accountId,
        mensajeId,
        creadoEn: Date.now(),
      });
    }
  } catch (err) {
    logger.error(`[enviarMensaje] Error en ${accountId}/${mensajeId}`, err);
    await ref.update({estado: 'error', errorMsg: String(err.message || err)});
  }
}

exports.onMensajeCreado = onDocumentCreated(
    'accounts/{accountId}/mensajes/{mensajeId}',
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const {accountId, mensajeId} = event.params;
      const msg = snap.data();
      const ref = snap.ref;

      const programadoPara = msg.programadoPara || null;
      if (programadoPara && programadoPara > Date.now()) {
        // Todavía no toca — el scheduler lo despacha cuando corresponda.
        await ref.update({estado: 'programado'});
        return;
      }

      await enviarMensaje(accountId, mensajeId, msg, ref);
    },
);

// Corre cada 15 minutos, revisa TODAS las cuentas de una — collectionGroup
// porque 'mensajes' se repite bajo cada accounts/{accountId} y acá
// necesitamos verlas todas juntas, no una cuenta a la vez.
exports.despacharMensajesProgramados = onSchedule('every 15 minutes', async () => {
  const ahora = Date.now();
  const snap = await db.collectionGroup('mensajes')
      .where('estado', '==', 'programado')
      .where('programadoPara', '<=', ahora)
      .get();

  if (snap.empty) return;

  logger.info(`[despacharMensajesProgramados] ${snap.size} mensaje(s) para enviar`);

  await Promise.all(snap.docs.map((d) => {
    // El accountId es el segmento anterior a "mensajes" en la ruta del
    // documento: accounts/{accountId}/mensajes/{mensajeId}.
    const accountId = d.ref.parent.parent.id;
    return enviarMensaje(accountId, d.id, d.data(), d.ref);
  }));
});
