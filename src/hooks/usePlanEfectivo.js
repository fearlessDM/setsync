// usePlanEfectivo.js — Fuente única de verdad del plan efectivo (v90).
//
// Antes, App.jsx tenía `cuentaEquipo` como useState local puro — un
// selector de prueba sin persistencia. Este hook lo reemplaza: se
// suscribe en tiempo real a las membresías reales del usuario en
// Firestore (orgMiembros → orgs, ver firebase/firestore.js) y devuelve
// el plan efectivo ya resuelto.
//
// Soporta multi-equipo (decisión v90): un usuario puede pertenecer a
// más de un org a la vez — basta con que UNO esté vigente ('activa' o
// en 'gracia') para que el plan efectivo sea Premium completo, sin
// importar su plan individual (planId).
//
// Si Firebase no está configurado o no hay uid (sesión anónima/local),
// las suscripciones son no-ops seguros (mismo patrón que firestore.js)
// y el resultado cae simplemente al plan individual.
import { useState, useEffect } from 'react';
import { subscribeMisMembresias, subscribeOrg } from '../firebase/firestore';
import { planEfectivoDesdeOrgs, getPlan } from '../data/planes';

export function usePlanEfectivo(uid, planId){
  const [membresias, setMembresias] = useState([]); // orgMiembros donde uid es miembro activo
  const [orgsPorId, setOrgsPorId] = useState({});    // orgId -> doc de orgs (estado, tramoId, etc.)

  useEffect(()=>{
    if(!uid){ setMembresias([]); setOrgsPorId({}); return; }
    return subscribeMisMembresias(uid, setMembresias);
  },[uid]);

  useEffect(()=>{
    const orgIds = [...new Set(membresias.map(m=>m.orgId))];
    // Limpia del estado los orgs que ya no correspondan (ej: la persona
    // fue removida de un equipo mientras tenía la app abierta).
    setOrgsPorId(prev=>{
      const next={};
      orgIds.forEach(id=>{ if(prev[id]!==undefined) next[id]=prev[id]; });
      return next;
    });
    const unsubs = orgIds.map(orgId=>subscribeOrg(orgId, org=>{
      setOrgsPorId(prev=>({...prev, [orgId]: org}));
    }));
    return ()=>unsubs.forEach(u=>u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[JSON.stringify(membresias.map(m=>m.orgId).sort())]);

  const orgsDelUsuario = Object.values(orgsPorId).filter(Boolean);
  const planActivo = planEfectivoDesdeOrgs(planId, orgsDelUsuario);
  const viaEquipo = orgsDelUsuario.some(o=>o.estado==='activa'||o.estado==='gracia');
  // El org "principal" a mostrar en la UI cuando el usuario pertenece a
  // más de uno: prioriza uno donde sea admin, si no el primero vigente.
  const orgPrincipal = orgsDelUsuario.find(o=>o.adminUid===uid) || orgsDelUsuario[0] || null;

  return {
    planActivo: planActivo || getPlan(planId),
    viaEquipo,
    orgsDelUsuario,
    orgPrincipal,
  };
}
