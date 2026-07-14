import { useRef, useEffect, useCallback } from 'react';

// ── useAnotaciones — CUARTA REESCRITURA (rect fijo por trazo) ───────────
// Canvas de dibujo libre (lápiz/borrador) que se superpone sobre la letra
// en SongView. Trazos viven en memoria como datos vectoriales.
//
// HISTORIAL DE DIAGNÓSTICO:
// v1: medía mal el contenedor (wrapRef en vez del padre real) — arreglado,
//     síntoma igual.
// v2: sacó devicePixelRatio del todo — Danny confirmó que fallaba IGUAL
//     con mouse en computador, no solo touch. Eso descartó dpr/touch.
// v3: agregó autocorrección de tamaño en cada trazo — mejoró (el trazo
//     empezó a aparecer chico y en el lugar correcto), pero Danny reportó
//     un síntoma nuevo: además del trazo correcto, aparecía un duplicado
//     grande, sin que él arrastrara tanto el dedo.
// v4 (ESTA VERSIÓN): con el panel de debug se confirmó con números reales
//     que canvas/contenedor/rect coincidían exactamente (394x604 los 3) —
//     descartando cualquier problema de TAMAÑO. El problema real era de
//     POSICIÓN: getP() llamaba a getBoundingClientRect() de nuevo en CADA
//     movimiento del trazo — si la posición en pantalla del canvas se
//     corre aunque sea un poco a mitad de un mismo trazo (por asentamiento
//     de layout, u otra causa), cada punto del trazo queda calculado
//     contra una referencia distinta, y un gesto físico chico se convierte
//     en una línea larga y errática — exactamente lo que describió Danny
//     ("hice una marca chica y esta línea larga apareció sola"). Este es
//     el mismo patrón ya aprendido antes con el fader de Monitoreo/
//     Secuencia (ZONA BLINDADA): el rect se captura UNA VEZ al empezar el
//     gesto, nunca se vuelve a leer durante el mismo gesto.
//
// FIX: rectRef captura getBoundingClientRect() UNA SOLA VEZ en startD, y
// se reutiliza para TODOS los puntos de ESE trazo — nunca se vuelve a
// leer hasta que empiece un trazo nuevo.
//
// VALIDADO v90: test automatizado (jsdom) que simula el layout corriéndose
// a mitad de un trazo confirma que un gesto físico chico sigue produciendo
// un trazo chico (no el salto errático de antes). El panel de debug ⚠️
// TEMPORAL que existía en esta versión para el diagnóstico se sacó — ya
// cumplió su propósito.
//
// Parámetros:
//  - containerRef: ref del contenedor NO-scrollable que envuelve canvas
//    + el área de scroll de la letra (fuente única de verdad de tamaño)
//  - tool, color, sz: herramienta activa (vienen del estado de AnnoBar)
//  - showAnnoBar: si la barra de anotación está abierta (controla si se dibuja)
//  - idx: índice de canción activa, para re-disparar el resize al cambiar
export function useAnotaciones({containerRef,tool,color,sz,showAnnoBar,idx}){
  const cvRef=useRef(null);
  const strokes=useRef([]);       // trazos ya terminados (datos vectoriales)
  const cur=useRef(null);         // trazo en progreso
  const activePointerId=useRef(null);
  const rectRef=useRef(null);     // rect del canvas, capturado UNA VEZ por trazo

  const redraw=useCallback(()=>{
    const cv=cvRef.current;if(!cv)return;
    const ctx=cv.getContext('2d');
    ctx.clearRect(0,0,cv.width,cv.height);
    const paint=s=>{
      if(s.pts.length<2)return;
      ctx.beginPath();
      if(s.type==='erase'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=s.sz*4;}
      else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=s.color;ctx.lineWidth=s.sz;}
      ctx.lineCap='round';ctx.lineJoin='round';
      ctx.moveTo(s.pts[0].x,s.pts[0].y);
      for(let i=1;i<s.pts.length;i++)ctx.lineTo(s.pts[i].x,s.pts[i].y);
      ctx.stroke();
    };
    strokes.current.forEach(paint);
    if(cur.current)paint(cur.current);
    ctx.globalCompositeOperation='source-over';
  },[]);

  const syncSize=useCallback(()=>{
    const cv=cvRef.current, container=containerRef.current;
    if(!cv||!container)return false;
    const w=container.clientWidth, h=container.clientHeight;
    if(w===0||h===0)return false;
    if(cv.width===w&&cv.height===h)return false; // ya estaba sincronizado
    cv.width=w;
    cv.height=h;
    redraw();
    return true;
  },[redraw,containerRef]);

  useEffect(()=>{
    const cv=cvRef.current, container=containerRef.current;
    if(!cv||!container)return;
    syncSize();
    const ro=new ResizeObserver(syncSize);
    ro.observe(container);
    return()=>ro.disconnect();
  },[idx,syncSize,containerRef]);

  // Coordenadas del puntero relativas al canvas — usa SIEMPRE el rect
  // capturado al INICIO del trazo (rectRef), nunca uno recién leído. Así,
  // si la posición del canvas en pantalla se corre a mitad de un trazo
  // por cualquier motivo externo, ese trazo entero queda consistente
  // consigo mismo (todos sus puntos usan la misma referencia), en vez de
  // saltar entre referencias distintas punto a punto.
  const getP=e=>{
    const r=rectRef.current;
    return {x:e.clientX-r.left,y:e.clientY-r.top};
  };

  const startD=e=>{
    if(tool==='text'||!showAnnoBar)return;
    syncSize(); // red de seguridad: corrige cualquier desfase de TAMAÑO antes de dibujar
    const cv=cvRef.current;
    rectRef.current=cv.getBoundingClientRect(); // captura de POSICIÓN única para todo este trazo
    cv.setPointerCapture(e.pointerId);
    activePointerId.current=e.pointerId;
    const p=getP(e);
    cur.current={type:tool,color,sz,pts:[p]};
    redraw();
  };

  const moveD=e=>{
    if(activePointerId.current!==e.pointerId||!cur.current)return;
    cur.current.pts.push(getP(e));
    redraw();
  };

  const endD=e=>{
    if(activePointerId.current===null)return;
    if(cur.current&&cur.current.pts.length>1)strokes.current.push(cur.current);
    cur.current=null;
    activePointerId.current=null;
    rectRef.current=null;
    try{cvRef.current?.releasePointerCapture(e.pointerId);}catch{}
    redraw();
  };

  const undo=()=>{strokes.current.pop();redraw();};
  const clear=()=>{strokes.current=[];cur.current=null;redraw();};

  return{
    cvRef,
    onPointerDown:startD,
    onPointerMove:moveD,
    onPointerUp:endD,
    onPointerCancel:endD,
    undo,clear,
  };
}
