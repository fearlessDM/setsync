import { useRef, useEffect, useCallback } from 'react';

// ── useAnotaciones — SEGUNDA REESCRITURA (sin devicePixelRatio) ─────────
// Canvas de dibujo libre (lápiz/borrador) que se superpone sobre la letra
// en SongView. Trazos viven en memoria como datos vectoriales.
//
// HISTORIAL: la v1 medía mal el contenedor (wrapRef en vez del padre
// real) — arreglado, pero el síntoma ("líneas gigantes y corridas un
// gran espacio") siguió igual. Eso apunta a un problema más profundo que
// solo el contenedor: probablemente el escalado por devicePixelRatio
// (ctx.scale(dpr,dpr)) se estaba aplicando de más en algún punto — un
// factor de escala aplicado dos veces hace que la distancia entre el
// punto donde tocás y donde se dibuja CREZCA con la distancia al origen
// (por eso "un gran espacio", no un offset fijo), y que las líneas se
// vean más gruesas de lo esperado ("gigantes") — encaja exactamente con
// lo reportado.
//
// FIX DEFINITIVO: se elimina el devicePixelRatio del todo. El canvas se
// dimensiona en píxeles CSS puros (canvas.width = ancho en CSS, sin
// multiplicar por dpr) y NUNCA se llama ctx.scale(). Esto vuelve
// imposible que exista un doble-escalado, al costo de que el trazo se
// vea un poco menos nítido en pantallas de alta densidad — un costo
// aceptable frente a una función que no funcionaba en absoluto. Con esto,
// 1 unidad de canvas.width/height = 1 píxel CSS = 1 unidad que devuelve
// getBoundingClientRect — una sola unidad de medida en todo el sistema,
// sin ninguna conversión de por medio.
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

  const redraw=useCallback(()=>{
    const cv=cvRef.current;if(!cv)return;
    const ctx=cv.getContext('2d');
    // Sin ctx.scale nunca — 1 unidad = 1 píxel CSS, siempre.
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

  useEffect(()=>{
    const cv=cvRef.current, container=containerRef.current;
    if(!cv||!container)return;
    const resize=()=>{
      const w=container.clientWidth, h=container.clientHeight;
      if(w===0||h===0)return;
      // canvas.width/height en píxeles CSS puros — SIN multiplicar por
      // devicePixelRatio. El canvas puede verse un poco menos nítido en
      // pantallas retina, pero elimina cualquier posibilidad de
      // doble-escalado, que es lo que rompía el dibujo antes.
      cv.width=w;
      cv.height=h;
      redraw();
    };
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(container);
    return()=>ro.disconnect();
  },[idx,redraw,containerRef]);

  // Coordenadas del puntero relativas al canvas, en píxeles CSS — sin
  // ninguna conversión, porque el canvas trabaja 100% en esas unidades.
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
