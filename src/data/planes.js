// planes.js — Capa de planes de SetSync (Fase 1 del roadmap).
// Precios y límites oficiales (confirmados, ver historial de Drive v5/v10).
// IMPORTANTE: el plan SIEMPRE es del usuario individual — nunca se hereda
// del líder/equipo/setlist, sin importar el contexto (principio ya
// establecido para SongView, ahora extendido a Monitoreo/Secuencias/
// Vista Escenario completa).

export const PLANES_SETSYNC = {
  lite: {
    id:'lite', label:'Lite', precioMensual:0, precioAnual:0,
    limiteCanciones:10, limiteMiembros:5,
    cancioneroUniversal:false, premiereExclusivas:false,
    vistaEscenario:false, click:false, multitracks:false, monitoreo:false,
    multiBanda:false, marcaBlanca:false,
  },
  pro: {
    id:'pro', label:'Pro', precioMensual:7.90, precioAnual:66.36,
    limiteCanciones:40, limiteMiembros:30,
    cancioneroUniversal:true, premiereExclusivas:true,
    vistaEscenario:true, click:true, multitracks:true, monitoreo:true,
    multiBanda:false, marcaBlanca:false,
  },
  premium: {
    id:'premium', label:'Premium', precioMensual:19.90, precioAnual:167.16,
    limiteCanciones:100, limiteMiembros:Infinity,
    cancioneroUniversal:true, premiereExclusivas:true,
    vistaEscenario:true, click:true, multitracks:true, monitoreo:true,
    multiBanda:true, marcaBlanca:true,
  },
};

export function getPlan(planId){
  return PLANES_SETSYNC[planId] || PLANES_SETSYNC.lite;
}

// ── Gating combinado: una feature solo está activa si el MODO la ofrece
// Y el PLAN del usuario la incluye. Ninguno de los dos solo alcanza. ────
// Ej: Cancionero Universal necesita modo==='iglesia' (ver modo.js)
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
