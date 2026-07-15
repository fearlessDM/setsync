// useModoVivo.js — Motor de "Modo En Vivo" (v90).
//
// El líder inicia una sesión → el equipo (con la app abierta, cualquier
// pantalla) ve un aviso y acepta/rechaza → el líder controla play/pause
// de TODAS las pistas de Secuencia y viaja sincronizado a todos los que
// aceptaron. Vive sobre `accounts/{accountId}/sesion/activa`, el mismo
// doc de "sesión compartida" que ya existía en firestore.js pero nunca
// se había conectado a nada — este hook es lo que lo conecta.
//
// CÓMO SE LOGRA LA SINCRONIZACIÓN (sin backend de tiempo real dedicado):
// el líder no le dice a nadie "arranca AHORA" (eso llegaría en momentos
// distintos a cada dispositivo, según la red). En cambio, publica un
// instante ABSOLUTO futuro cercano (tsInicioAbs, epoch ms — el reloj
// propio de cada celular, que en la práctica ya viene sincronizado por
// red/NTP del sistema operativo). Cada participante programa su propio
// play para ESE mismo instante con setTimeout. La variación de latencia
// de Firestore dejar de importar tanto porque todos apuntan al mismo
// punto en el tiempo, no reaccionan al mensaje en sí. No es
// sample-perfect de estudio, pero alcanza para tocar en vivo con click.
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  subscribeSesionActiva, iniciarModoVivo, finalizarModoVivo, actualizarModoVivo,
  subscribeParticipantesVivo, responderModoVivo, getDeviceId,
} from '../firebase/firestore';

const BUFFER_MS = 1800; // margen entre "el líder aprieta play" y el instante real de arranque

// Función PURA (sin React, sin Firestore) — dado el `transporte` de la
// sesión y el instante actual, decide qué debe hacer ESTE dispositivo.
// Separada así a propósito para poder testearla con valores directos,
// sin necesitar un navegador ni simular Firestore — es la pieza con más
// riesgo de todo el motor (si esto falla, el equipo suena desincronizado).
//   'pausar'         → pausar todo, quedar en posSeg
//   'programar'      → todavía no llega el instante de arranque: esperar
//                       delayMs y then arrancar en posSeg
//   'arrancar_ahora'  → el instante de arranque ya pasó (nos unimos tarde,
//                       o el mensaje llegó atrasado) — arrancar YA, saltando
//                       a la posición que le correspondería en este momento
export function calcularProgramacion(transporte, ahora=Date.now()){
  if(!transporte || !transporte.reproduciendo){
    return {accion:'pausar', posSeg: transporte?.posBaseSeg||0};
  }
  const delayMs = (transporte.tsInicioAbs||0) - ahora;
  if(delayMs > 0){
    return {accion:'programar', delayMs, posSeg: transporte.posBaseSeg||0};
  }
  const posSeg = (transporte.posBaseSeg||0) + Math.max(0, -delayMs/1000);
  return {accion:'arrancar_ahora', posSeg};
}

export function useModoVivo({accountId, esLider, miNombre, eventoId, songIndex, songName}){
  const deviceId = useMemo(()=>getDeviceId(), []);
  const [sesion, setSesion] = useState(null);
  const [participantes, setParticipantes] = useState([]);

  useEffect(()=>{
    if(!accountId) return;
    return subscribeSesionActiva(accountId, setSesion);
  },[accountId]);

  useEffect(()=>{
    if(!accountId) return;
    return subscribeParticipantesVivo(accountId, setParticipantes);
  },[accountId]);

  const sesionLlamando = sesion?.estado==='llamando';
  const sesionActiva = sesion?.estado==='llamando' || sesion?.estado==='activa';
  const miParticipacion = participantes.find(p=>p.id===deviceId);
  // Si soy el líder no necesito "aceptar" mi propia sesión.
  const necesitoResponder = sesionActiva && !esLider && !miParticipacion;
  const yaAcepte = esLider || miParticipacion?.estado==='aceptado';

  const iniciar = ()=>{
    if(!accountId || !esLider) return;
    iniciarModoVivo(accountId, {liderUid:deviceId, liderNombre:miNombre, eventoId, songIndex, songName});
  };
  const finalizar = ()=>{
    if(!accountId || !esLider) return;
    finalizarModoVivo(accountId);
  };
  const aceptar = ()=>{
    if(!accountId) return;
    responderModoVivo(accountId, deviceId, miNombre, 'aceptado');
    if(sesion?.estado==='llamando') actualizarModoVivo(accountId, {estado:'activa'});
  };
  const rechazar = ()=>{
    if(!accountId) return;
    responderModoVivo(accountId, deviceId, miNombre, 'rechazado');
  };

  // Posición esperada AHORA, derivada matemáticamente — no hace falta que
  // el líder mande actualizaciones constantes de posición mientras suena.
  const posicionEsperada = ()=>{
    const t = sesion?.transporte;
    if(!t) return 0;
    if(!t.reproduciendo || !t.tsInicioAbs) return t.posBaseSeg||0;
    return (t.posBaseSeg||0) + Math.max(0, (Date.now()-t.tsInicioAbs)/1000);
  };

  // El líder llama esto al apretar play — publica el instante futuro de
  // arranque. posActualSeg = dónde está el playhead AHORA (para poder
  // pausar/reanudar sin perder el lugar).
  const publicarPlay = (posActualSeg=0)=>{
    if(!accountId || !esLider) return;
    actualizarModoVivo(accountId, {
      transporte:{reproduciendo:true, tsInicioAbs:Date.now()+BUFFER_MS, posBaseSeg:posActualSeg},
    });
  };
  const publicarPause = (posActualSeg=0)=>{
    if(!accountId || !esLider) return;
    actualizarModoVivo(accountId, {
      transporte:{reproduciendo:false, tsInicioAbs:null, posBaseSeg:posActualSeg},
    });
  };
  const publicarCancion = (idx, nombre)=>{
    if(!accountId || !esLider) return;
    actualizarModoVivo(accountId, {songIndex:idx, songName:nombre, timestamp:Date.now()});
  };

  return {
    deviceId, sesion, participantes,
    sesionLlamando, sesionActiva, miParticipacion, necesitoResponder, yaAcepte,
    iniciar, finalizar, aceptar, rechazar,
    posicionEsperada, publicarPlay, publicarPause, publicarCancion,
    BUFFER_MS,
  };
}
