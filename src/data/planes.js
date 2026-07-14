// planes.js — Capa de planes de SetSync.
// Precios definitivos: contexto Drive v51→v57 (v55 es la última palabra en
// montos). Cualquier archivo anterior a v51 que mencione otros montos
// queda obsoleto.
//
// ARQUITECTURA — DOS PRODUCTOS DISTINTOS, NO COMPATIBLES ENTRE SÍ:
// Cuenta Unitaria → accede SOLO el usuario logueado (Lite/Pro/Premium).
// Cuenta Equipo   → un súper admin paga UNA VEZ según tramo de personas,
//                   y TODOS los miembros del equipo (incluido el súper
//                   admin) quedan en Premium completo, automático — sin
//                   necesidad de plan personal aparte. El feature set de
//                   Cuenta Equipo NUNCA cambia entre tramos, solo el precio.
//
// "Límite de miembros" en Cuenta Unitaria es SOLO un tope de roster/lista
// de contactos — nunca un otorgamiento de acceso a features. Cada persona
// de esa lista sigue sin nada a menos que tenga su propio plan individual,
// o que el equipo completo esté bajo Cuenta Equipo.
//
// Sin plan anual en ningún producto (decisión v51 — se sacó por completo).

export const PLANES_SETSYNC = {
  lite: {
    id:'lite', label:'Lite', precioMensual:0,
    limiteCanciones:10, limiteMiembros:5,
    cancioneroUniversal:false, premiereExclusivas:false,
    vistaEscenario:false, click:false, multitracks:false, monitoreo:false,
    multiBanda:false, marcaBlanca:false, storageAmpliado:false, exportPDF:false,
  },
  pro: {
    id:'pro', label:'Pro', precioMensual:8,
    limiteCanciones:40, limiteMiembros:30,
    cancioneroUniversal:true, premiereExclusivas:true,
    vistaEscenario:true, click:true, multitracks:true, monitoreo:true,
    multiBanda:false, marcaBlanca:false, storageAmpliado:false, exportPDF:false,
  },
  premium: {
    id:'premium', label:'Premium', precioMensual:12,
    limiteCanciones:100, limiteMiembros:Infinity,
    cancioneroUniversal:true, premiereExclusivas:true,
    vistaEscenario:true, click:true, multitracks:true, monitoreo:true,
    multiBanda:true, marcaBlanca:false,
    // ↓ Nuevos en v52. GB exacto y motor de export PDF: spec técnica pendiente.
    storageAmpliado:true, exportPDF:true,
  },
};

export function getPlan(planId){
  return PLANES_SETSYNC[planId] || PLANES_SETSYNC.lite;
}

// ── CUENTA EQUIPO — 4 tramos, precio fijo por tramo (no por persona,
// salvo el tramo 36+ que agrega +$1 USD/persona sobre 35 — fórmula que
// garantiza matemáticamente el piso de $1 USD/persona para siempre). ────
export const TRAMOS_EQUIPO = [
  {id:'eq-1-10',  min:1,  max:10,       precioBase:18, marcaBlanca:false, label:'1–10 personas'},
  {id:'eq-11-25', min:11, max:25,       precioBase:28, marcaBlanca:false, label:'11–25 personas'},
  {id:'eq-26-35', min:26, max:35,       precioBase:39, marcaBlanca:true,  label:'26–35 personas'},
  {id:'eq-36+',   min:36, max:Infinity, precioBase:39, marcaBlanca:true,  label:'36+ personas'},
];

// Devuelve el tramo que corresponde a una cantidad de personas.
export function getTramoEquipo(numPersonas){
  return TRAMOS_EQUIPO.find(t=>numPersonas>=t.min && numPersonas<=t.max) || TRAMOS_EQUIPO[0];
}

// Precio mensual real del tramo dado un número de personas — solo el
// tramo 36+ tiene componente variable (+$1 USD por persona sobre 35).
export function precioTramoEquipo(tramoId, numPersonas){
  const t = TRAMOS_EQUIPO.find(x=>x.id===tramoId);
  if(!t) return 0;
  if(t.id==='eq-36+') return t.precioBase + Math.max(0, numPersonas-35)*1;
  return t.precioBase;
}

// ── GATING POR EQUIPO (nuevo, v53/v57) ──────────────────────────────────
// Forma de dato esperada para `cuentaEquipo` (hoy en memoria/local state,
// ver App.jsx — persistencia real en accounts/{accountId}.cuentaEquipo
// queda pendiente de diseño de facturación, fuera de este alcance):
//   { activa: boolean, tramoId: string|null }
//
// Si la cuenta tiene Cuenta Equipo activa, CUALQUIER miembro del equipo
// (incluido el súper admin) opera con Premium completo, sin importar cuál
// sea su planId personal. Si no está activa, se usa el plan individual
// normal (comportamiento histórico, sin cambios).
// @deprecated (v90) — dependía del useState de prueba `cuentaEquipo` que
// ya no existe en App.jsx. Nada la usa hoy; queda solo por si algún otro
// archivo la referenciaba desde fuera de esta sesión. Usar
// planEfectivoDesdeOrgs() para todo lo nuevo.
export function planEfectivo(planId, cuentaEquipo){
  if(cuentaEquipo?.activa) return PLANES_SETSYNC.premium;
  return getPlan(planId);
}

// ── v90: versión real, respaldada por Firestore (orgs/orgMiembros, ver
// firestore.js) — reemplaza el `cuentaEquipo` de prueba de arriba, que
// era puro useState local sin persistencia. Recibe la lista de orgs a
// los que el usuario pertenece como miembro activo (puede ser más de
// uno — multi-equipo, decisión v90) y basta con que UNO esté vigente
// ('activa' o 'gracia') para que el plan efectivo sea Premium completo.
export function planEfectivoDesdeOrgs(planId, orgsDelUsuario=[]){
  const hayOrgVigente = orgsDelUsuario.some(o=>o && (o.estado==='activa'||o.estado==='gracia'));
  if(hayOrgVigente) return PLANES_SETSYNC.premium;
  return getPlan(planId);
}

// ── Gating combinado: una feature solo está activa si el MODO la ofrece
// Y el PLAN (efectivo) del usuario la incluye. Ninguno de los dos solo
// alcanza. Ej: Cancionero Universal necesita modo==='iglesia' (ver modo.js)
// Y PLAN pro/premium — un usuario Lite de Iglesia no la ve.
export function featureDisponible(featureId, modoFeatures, plan){
  const porModo = !!modoFeatures[featureId];
  const porPlan = !!plan[featureId];
  return porModo && porPlan;
}

// ── Texto de upsell cuando una feature está bloqueada por plan ─────────
export function mensajeUpgrade(featureId, lang='es'){
  const nombres={
    cancioneroUniversal:{es:'el Cancionero Universal', en:'the Universal Songbook'},
    premiereExclusivas: {es:'Premiere',                en:'Premiere'},
    vistaEscenario:     {es:'Vista Escenario',          en:'Stage View'},
  };
  const n=nombres[featureId]?.[lang]||featureId;
  return lang==='en'
    ? `${n} is available on Pro and Premium plans. Upgrade to unlock it.`
    : `${n} está disponible en los planes Pro y Premium. Mejora tu plan para desbloquearlo.`;
}
