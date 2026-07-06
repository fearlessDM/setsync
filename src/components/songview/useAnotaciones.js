import { useRef, useEffect, useCallback } from 'react';

// ── useAnotaciones — REESCRITO DESDE CERO ───────────────────────────────
// Canvas de dibujo libre (lápiz/borrador) que se superpone sobre la letra
// en SongView. Trazos viven en memoria como datos vectoriales (no solo
// píxeles), no persisten entre canciones ni recargas.
//
// Por qué se reescribió: la versión anterior media el tamaño del canvas
// usando `wrapRef` (el contenedor de SCROLL de la letra), pero canvas y
// wrapRef son elementos HERMANOS dentro de un mismo contenedor padre. Un
// scroll con overflow puede reservar espacio para su propia scrollbar de
// forma distinta según el dispositivo/navegador — eso desalinea el
// tamaño real del canvas respecto al de wrapRef, produciendo justo el
// síntoma reportado ("como con zoom", "corrida del lugar donde dibujo").
// Fix real: medir el CONTENEDOR PADRE no-scrollable que envuelve a ambos
// (containerRef), la única referencia de tamaño que ambos hermanos
// comparten con garantía matemática.
//
// Segundo cambio: Pointer Events unificados (en vez de handlers
// separados de mouse/touch con preventDefault manual) — un solo camino
// de código para mouse, touch y stylus, con setPointerCapture para
// seguir el trazo aunque el dedo se salga del canvas, y manejo explícito
// de pointercancel (el navegador puede cancelar el gesto por conflicto
// con otro reconocedor de gestos — sin esto, un trazo a medio hacer
// podía quedar en un estado inconsistente).
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
  const dprRef=useRef(1);
  const activePointerId=useRef(null);

  const redraw=useCallback(()=>{
    const cv=cvRef.current;if(!cv)return;
    const ctx=cv.getContext('2d');
    const dpr=dprRef.current;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,cv.width,cv.height);
    ctx.scale(dpr,dpr);
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

  useEffect(()=>{
    const cv=cvRef.current, container=containerRef.current;
    if(!cv||!container)return;
    const resize=()=>{
      const dpr=window.devicePixelRatio||1;
      const w=container.clientWidth, h=container.clientHeight;
      if(w===0||h===0)return;
      dprRef.current=dpr;
      cv.width=Math.round(w*dpr);
      cv.height=Math.round(h*dpr);
      redraw();
    };
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(container);
    return()=>ro.disconnect();
  },[idx,redraw,containerRef]);

  const getP=e=>{
    const r=cvRef.current.getBoundingClientRect();
    return{x:e.clientX-r.left,y:e.clientY-r.top};
  };

  const startD=e=>{
    if(tool==='text'||!showAnnoBar)return;
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
