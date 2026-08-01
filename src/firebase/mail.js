// mail.js — Envío de correos transaccionales vía la extensión oficial de
// Firebase "Trigger Email from Firestore" (firestore-send-email). Esa
// extensión escucha la colección `mail`: cualquier documento que se
// escriba ahí con {to, message:{subject, html}} se envía solo, a
// través del SMTP que Danny configure al instalarla (recomendado:
// SendGrid, plan gratis 100/día).
//
// IMPORTANTE — esto NO envía nada por sí solo. Requiere:
//   1. Instalar la extensión desde Firebase Console → Extensions →
//      buscar "Trigger Email from Firestore" (firebase/firestore-send-email).
//   2. Configurar el SMTP (SendGrid u otro) durante la instalación.
//   3. Agregar la regla de seguridad para `mail` en firestore.rules
//      (ver snippet en el archivo de contexto de esta sesión).
// Sin esos 3 pasos, los documentos quedan escritos en Firestore pero
// nadie los procesa — no es un error del código, es que la extensión
// no está instalada todavía.

import { db, firebaseListo } from './config';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

const APP_URL = 'https://setsync-bax.pages.dev';

const PLANTILLAS_INVITACION = {
  es: {
    subject_tpl: `{admin} te invitó a su equipo en SetSync`,
    preheader: `Únete al equipo de {admin} en SetSync — acceso Premium incluido.`,
    heading: `Te invitaron a un equipo en SetSync`,
    intro: `<strong>{admin}</strong> te agregó como miembro de su equipo en SetSync — la app para coordinar bandas y equipos de alabanza.`,
    whatIsTeam: `¿Qué significa esto? Al ser parte de este equipo, tienes acceso Premium completo de SetSync sin pagar nada por tu cuenta — el equipo ya cubre tu plan. Vas a poder ver los setlists, letras y acordes de las canciones, y sumarte a los ensayos y eventos que {admin} convoque.`,
    howTo: `Para activar tu acceso:`,
    step1: `Abre SetSync desde el botón de abajo`,
    step2: `Crea tu cuenta usando <strong>este mismo correo</strong> ({email}) — así queda vinculada automáticamente a este equipo`,
    cta: `Abrir SetSync`,
    footer: `Si no esperabas esta invitación, puedes ignorar este correo.`,
  },
  pt: {
    subject_tpl: `{admin} te convidou para a equipe dele no SetSync`,
    preheader: `Junte-se à equipe de {admin} no SetSync — acesso Premium incluído.`,
    heading: `Você foi convidado para uma equipe no SetSync`,
    intro: `<strong>{admin}</strong> te adicionou como membro da equipe dele no SetSync — o app para coordenar bandas e equipes de louvor.`,
    whatIsTeam: `O que isso significa? Ao fazer parte desta equipe, você tem acesso Premium completo ao SetSync sem pagar nada por conta própria — a equipe já cobre seu plano. Você vai poder ver os setlists, letras e cifras das músicas, e participar dos ensaios e eventos que {admin} convocar.`,
    howTo: `Para ativar seu acesso:`,
    step1: `Abra o SetSync pelo botão abaixo`,
    step2: `Crie sua conta usando <strong>este mesmo e-mail</strong> ({email}) — assim ele fica vinculado automaticamente a esta equipe`,
    cta: `Abrir SetSync`,
    footer: `Se você não esperava este convite, pode ignorar este e-mail.`,
  },
  en: {
    subject_tpl: `{admin} invited you to their team on SetSync`,
    preheader: `Join {admin}'s team on SetSync — Premium access included.`,
    heading: `You've been invited to a team on SetSync`,
    intro: `<strong>{admin}</strong> added you as a member of their team on SetSync — the app for coordinating bands and worship teams.`,
    whatIsTeam: `What does this mean? As part of this team, you get full Premium access to SetSync at no cost to you — the team already covers your plan. You'll be able to see setlists, lyrics and chords, and join the rehearsals and events {admin} schedules.`,
    howTo: `To activate your access:`,
    step1: `Open SetSync using the button below`,
    step2: `Create your account using <strong>this same email</strong> ({email}) — it'll link automatically to this team`,
    cta: `Open SetSync`,
    footer: `If you weren't expecting this invitation, you can ignore this email.`,
  },
};

// Arma el HTML final a partir de la plantilla del idioma, con estilos
// inline (los clientes de correo ignoran <style> externo casi siempre).
function armarHtmlInvitacion(lang, adminNombre, emailInvitado){
  const t = PLANTILLAS_INVITACION[lang] || PLANTILLAS_INVITACION.es;
  const admin = (adminNombre||'').trim() || (lang==='pt'?'Alguém':lang==='en'?'Someone':'Alguien');
  const sub = (s)=>s.replaceAll('{admin}', admin).replaceAll('{email}', emailInvitado);
  const subject = sub(t.subject_tpl);
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f4f4f5;">${sub(t.preheader)}</span>
  <table role="presentation" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#161616;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 28px 8px;">
          <div style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#FDFBF8;letter-spacing:.5px;">
            Set<span style="color:#AFFA01;">Sync</span>
          </div>
        </td></tr>
        <tr><td style="padding:20px 28px 0;">
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#FDFBF8;font-weight:700;">${sub(t.heading)}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#D0BB9F;">${sub(t.intro)}</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#D0BB9F;">${sub(t.whatIsTeam)}</p>
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#FDFBF8;">${t.howTo}</p>
          <ol style="margin:0 0 24px;padding-left:18px;font-size:14px;line-height:1.8;color:#D0BB9F;">
            <li>${t.step1}</li>
            <li>${sub(t.step2)}</li>
          </ol>
          <table role="presentation" width="100%"><tr><td align="center" style="padding-bottom:28px;">
            <a href="${APP_URL}" style="display:inline-block;background:#AFFA01;color:#1F1F1F;text-decoration:none;font-weight:700;font-size:15px;padding:13px 32px;border-radius:10px;">${t.cta}</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #2c2c2c;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7d7568;">${t.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
  return {subject, html};
}

// Invita a un correo a un equipo: agrega el registro en orgMiembros (igual
// que agregarMiembroOrg) y, SOLO si es una invitación nueva (no reenvía si
// la persona ya está activa), escribe el documento en `mail` para que la
// extensión de Firebase lo despache. orgId queda en el documento para que
// la regla de seguridad pueda verificar que quien escribe es el admin real
// de ese equipo (ver firestore.rules).
export async function invitarMiembroOrg(orgId, email, adminNombre, adminUid, lang='es'){
  if(!firebaseListo) return null;
  const emailLimpio = String(email).trim().toLowerCase();
  const miembroId = `${orgId}_${emailLimpio}`;
  const ref = doc(db, 'orgMiembros', miembroId);

  // Si ya es miembro activo, no hace nada (evita reenviar spam por doble click).
  const existente = await getDoc(ref);
  const yaActivo = existente.exists() && existente.data().estado === 'activo';

  await setDoc(ref, {
    orgId, email: emailLimpio, uid: null, estado: 'pendiente',
    agregadoEn: Date.now(),
  });

  if(!yaActivo){
    const {subject, html} = armarHtmlInvitacion(lang, adminNombre, emailLimpio);
    await setDoc(doc(collection(db, 'mail')), {
      to: [emailLimpio],
      message: {subject, html},
      orgId, invitadoPor: adminUid, creadoEn: Date.now(),
    });
  }

  return miembroId;
}
