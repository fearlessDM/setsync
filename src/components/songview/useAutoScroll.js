import { useRef, useEffect } from 'react';

// ── useAutoScroll ─────────────────────────────────────────────────────────
// Mueve el scroll de la letra automáticamente. La velocidad la define
// ÚNICAMENTE el fader del usuario (scrollSpeed), en píxeles/segundo —
// el BPM de la canción NO se usa en este cálculo.
//
// Por qué: el BPM es un dato opcional que muchas canciones cargadas por
// usuarios (profesores, líderes de banda, Estudio Personal) probablemente
// no van a tener o no van a conocer con precisión. Construir la velocidad
// de scroll sobre un dato que puede faltar o estar mal cargado produce un
// comportamiento confuso e impredecible ("¿por qué a velocidad 1 esto va
// tan rápido?"). El fader es la única fuente de verdad, simple y predecible
// en toda canción, tenga o no BPM cargado.
//
// Rango del fader: RANGO_SCROLL define min/max en px/seg. Recalibrado a
// pedido de Danny — el tope anterior (60px/s) resultaba demasiado rápido
// para cualquier uso real de lectura de letra; el rango completo debe ir
// de muy lento a lento, no de lento a rápido.
//
// NOTA PARA TANDA 3 (audio de referencia): este hook sigue siendo el punto
// de extensión natural para el futuro "modo práctica" con audio real. La
// idea es que el shell de SongView decida cuál de los dos motores de scroll
// usar (este, por fader, para Modo En Vivo; u otro nuevo basado en marcas
// de audio in/out, para Modo Práctica) de forma mutuamente excluyente —
// nunca ambos activos a la vez, para no arriesgar comportamiento
// impredecible durante una presentación en vivo.
//
// Parámetros:
//  - wrapRef: ref del contenedor de scroll (compartido con useAnotaciones)
//  - autoScroll: boolean, si el auto-scroll está activo
//  - setAutoScroll: para desactivarlo automáticamente al llegar al final
//  - scrollSpeed: velocidad en píxeles/segundo, definida por el fader del usuario
//  - idx: índice de canción activa, para reiniciar el efecto al cambiar
export const RANGO_SCROLL={min:3,max:18,default:6};

export function useAutoScroll({wrapRef,autoScroll,setAutoScroll,scrollSpeed,idx}){
  const scrollRaf=useRef(null);
  const scrollSpeedRef=useRef(RANGO_SCROLL.default);

  useEffect(()=>{scrollSpeedRef.current=scrollSpeed;},[scrollSpeed]);

  useEffect(()=>{
    const w=wrapRef.current;
    if(!w)return;
    if(!autoScroll){if(scrollRaf.current)cancelAnimationFrame(scrollRaf.current);return;}
    let last=null;
    const step=(ts)=>{
      if(last!==null){
        const delta=(ts-last)/1000;
        w.scrollTop+=scrollSpeedRef.current*delta;
        if(w.scrollTop+w.clientHeight>=w.scrollHeight-10){setAutoScroll(false);return;}
      }
      last=ts;scrollRaf.current=requestAnimationFrame(step);
    };
    scrollRaf.current=requestAnimationFrame(step);
    return()=>{if(scrollRaf.current)cancelAnimationFrame(scrollRaf.current);};
  },[autoScroll,idx]);

  // Reinicia el scroll a 0 — usado por el botón toggle al activar/desactivar.
  const resetScroll=()=>{if(wrapRef.current)wrapRef.current.scrollTop=0;};

  return{resetScroll};
}
