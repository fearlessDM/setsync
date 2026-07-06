import { useRef, useEffect, useCallback, useState } from 'react';

// ⚠️ TEMPORAL: este hook expone `debugInfo` con los números reales de
// tamaño del canvas/contenedor, para mostrarlos en pantalla mientras se
// termina de diagnosticar el bug de dibujo con Danny. Sacar `debugInfo`
// y el bloque que lo actualiza una vez resuelto — no es parte del
// diseño final, es instrumentación de diagnóstico.

// ── useAnotaciones — TERCERA REESCRITURA (autocorrección de tamaño) ─────
// Canvas de dibujo libre (lápiz/borrador) que se superpone sobre la letra
// en SongView. Trazos viven en memoria como datos vectoriales.
//
// HISTORIAL: v1 medía mal el contenedor (wrapRef en vez del padre real)
// — arreglado, síntoma igual. v2 sacó devicePixelRatio del todo — Danny
// confirmó que el síntoma ("líneas gigantes y corridas un gran espacio")
// sigue IGUAL, incluso con mouse en computador (no solo touch). Esto
// descarta cualquier causa relacionada a touch o densidad de píxeles —
// tiene que ser un error de ESCALA puro entre el tamaño con el que se
// dimensiona el canvas (canvas.width/height) y su tamaño visual real.
//
// CAUSA MÁS PROBABLE: el contenedor se mide (container.clientWidth/
// clientHeight) en un momento en que el layout todavía no terminó de
// acomodarse del todo (ej. un hermano de arriba —MapaMaestro— puede
// determinar su altura final después del primer render), dejando al
// canvas con un tamaño interno DISTINTO a su tamaño visual real. Un
// canvas.width que no coincide con su ancho visual hace que el navegador
// estire/comprima el contenido ya dibujado — un error de escala que
// crece con la distancia al origen (exactamente "corrida un gran
// espacio") y que además deforma los trazos ("gigante").
//
// FIX: además de medir en el resize normal (mount + ResizeObserver), se
// verifica en CADA trazo nuevo (startD) que canvas.width/height siga
// coincidiendo con el tamaño real del contenedor en ESE momento — si no
// coincide, se corrige antes de dibujar. Esto autocorrige el desfase
// aunque el ResizeObserver no haya alcanzado a disparar a tiempo.
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
  const [debugInfo,setDebugInfo]=useState(null); // ⚠️ TEMPORAL — ver nota arriba

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

  // Sincroniza canvas.width/height con el tamaño REAL actual del
  // contenedor. Se llama en mount, en cada resize observado, y además
  // se re-verifica al comienzo de cada trazo nuevo (ver startD) como
  // red de seguridad — así nunca puede quedar desincronizado por mucho
  // tiempo, sin importar cuándo terminó de acomodarse el layout.
  const syncSize=useCallback(()=>{
    const cv=cvRef.current, container=containerRef.current;
    if(!cv||!container)return false;
    const w=container.clientWidth, h=container.clientHeight;
    const rect=cv.getBoundingClientRect();
    setDebugInfo(d=>({...d,
      containerW:w,containerH:h,
      canvasW:cv.width,canvasH:cv.height,
      rectW:Math.round(rect.width),rectH:Math.round(rect.height),
    }));
    if(w===0||h===0)return false;
    if(cv.width===w&&cv.height===h)return false; // ya estaba sincronizado
    cv.width=w;
    cv.height=h;
    redraw();
    setDebugInfo(d=>({...d,canvasW:w,canvasH:h,lastResize:new Date().toLocaleTimeString()}));
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

  const getP=e=>{
    const r=cvRef.current.getBoundingClientRect();
    const p={x:e.clientX-r.left,y:e.clientY-r.top};
    setDebugInfo(d=>({...d,lastClientX:Math.round(e.clientX),lastClientY:Math.round(e.clientY),
      rectLeft:Math.round(r.left),rectTop:Math.round(r.top),
      lastPointX:Math.round(p.x),lastPointY:Math.round(p.y)}));
    return p;
  };

  const startD=e=>{
    if(tool==='text'||!showAnnoBar)return;
    syncSize(); // red de seguridad: corrige cualquier desfase justo antes de empezar a dibujar
    const cv=cvRef.current;
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
    try{cvRef.current?.releasePointerCapture(e.pointerId);}catch{}
    redraw();
    setDebugInfo(d=>({...d,strokeCount:strokes.current.length}));
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
    debugInfo, // ⚠️ TEMPORAL — ver nota arriba
  };
}
