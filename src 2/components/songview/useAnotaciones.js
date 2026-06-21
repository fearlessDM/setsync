import { useRef, useEffect } from 'react';

// ── useAnotaciones ───────────────────────────────────────────────────────
// Encapsula el canvas de dibujo libre (lápiz/borrador) que se superpone
// sobre la letra en SongView. Trazos viven en memoria (ref), no persisten
// entre canciones ni recargas — comportamiento idéntico al original.
// Extraído de SongView.jsx sin cambios de comportamiento (Tanda 1 — refactor).
//
// Parámetros:
//  - wrapRef: ref del contenedor de scroll (compartido con auto-scroll,
//    se usa aquí solo para medir tamaño del canvas vía ResizeObserver)
//  - tool, color, sz: herramienta activa (vienen del estado de AnnoBar)
//  - showAnnoBar: si la barra de anotación está abierta (controla si se dibuja)
//  - idx: índice de canción activa, para re-disparar el resize al cambiar
export function useAnotaciones({wrapRef,tool,color,sz,showAnnoBar,idx}){
  const cvRef=useRef(null);
  const strokes=useRef([]);
  const drawing=useRef(false);
  const cur=useRef(null);
  // Guarda el dpr usado al dimensionar el canvas, para que getP() pueda
  // convertir coordenadas de pantalla a las unidades reales del contexto
  // ya escalado (ver explicación completa más abajo).
  const dprRef=useRef(1);

  const redraw=()=>{
    const cv=cvRef.current;if(!cv)return;
    const ctx=cv.getContext('2d');
    // clearRect debe cubrir el canvas completo en sus unidades REALES
    // (post-scale), no las dimensiones CSS — por eso se divide por dpr.
    const dpr=dprRef.current;
    ctx.clearRect(0,0,cv.width/dpr,cv.height/dpr);
    strokes.current.forEach(s=>{
      if(s.pts.length<2)return;
      ctx.beginPath();applyS(s);
      ctx.moveTo(s.pts[0].x,s.pts[0].y);
      s.pts.forEach(p=>ctx.lineTo(p.x,p.y));
      ctx.stroke();
    });
    ctx.globalCompositeOperation='source-over';
  };

  // ── BUG CORREGIDO (reportado por Danny): al dibujar en tablet, la raya
  // aparecía con un offset grande respecto a donde tocaba el dedo/lápiz, y
  // se sentía "con zoom" o más grande de lo esperado. Causa real: el canvas
  // se dimensionaba (cv.width/cv.height) directamente en píxeles CSS
  // lógicos (clientWidth/clientHeight), ignorando devicePixelRatio. En
  // tablets de alta densidad (dpr 2 o más, la mayoría hoy), esto desalinea
  // el sistema de coordenadas interno del canvas respecto a los píxeles
  // físicos reales de la pantalla — el mismo tipo de bug ya resuelto en
  // Waveform.jsx (Tanda 3) para el dibujo de la forma de onda de audio.
  // Solución: dimensionar el canvas en píxeles físicos reales
  // (clientWidth*dpr), escalar el contexto con ctx.scale(dpr,dpr) una sola
  // vez al redimensionar, y dejar que el resto del código (getP, dibujo de
  // trazos) siga trabajando en unidades CSS normales — el scale del
  // contexto se encarga de la conversión real a píxeles físicos de forma
  // transparente, sin tocar ninguna otra parte de la lógica de dibujo.
  useEffect(()=>{
    const cv=cvRef.current,w=wrapRef.current;
    if(!cv||!w)return;
    const resize=()=>{
      const dpr=window.devicePixelRatio||1;
      dprRef.current=dpr;
      cv.width=w.clientWidth*dpr;
      cv.height=w.clientHeight*dpr;
      const ctx=cv.getContext('2d');
      ctx.setTransform(1,0,0,1,0,0); // resetea cualquier scale previo antes de aplicar el nuevo
      ctx.scale(dpr,dpr);
      redraw();
    };
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(w);
    return()=>ro.disconnect();
  },[idx]);

  const getP=e=>{
    const r=cvRef.current.getBoundingClientRect();
    const s=e.touches?e.touches[0]:e;
    // Coordenadas en unidades CSS (no físicas) — correctas porque el
    // contexto ya está escalado con ctx.scale(dpr,dpr) en resize(), así que
    // dibujar en estas unidades produce la posición física correcta sin
    // necesidad de multiplicar por dpr aquí también (evita escalar dos
    // veces, que sería el error opuesto al bug original).
    return{x:s.clientX-r.left,y:s.clientY-r.top};
  };

  const applyS=s=>{
    const ctx=cvRef.current.getContext('2d');
    const t=s?.type||tool,c2=s?.color||color,sz2=s?.sz||sz;
    if(t==='erase'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=sz2*4;}
    else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=c2;ctx.lineWidth=sz2;}
    ctx.lineCap='round';ctx.lineJoin='round';
  };

  const startD=e=>{
    if(tool==='text'||!showAnnoBar)return;
    drawing.current=true;
    const p=getP(e);
    cur.current={type:tool,color,sz,pts:[p]};
    const ctx=cvRef.current.getContext('2d');
    ctx.beginPath();ctx.moveTo(p.x,p.y);applyS();
  };

  const moveD=e=>{
    if(!drawing.current||!cur.current)return;
    const p=getP(e);
    cur.current.pts.push(p);
    const ctx=cvRef.current.getContext('2d');
    ctx.lineTo(p.x,p.y);ctx.stroke();
  };

  const endD=()=>{
    if(!drawing.current)return;
    drawing.current=false;
    if(cur.current?.pts.length>1)strokes.current.push(cur.current);
    cur.current=null;
    const ctx=cvRef.current.getContext('2d');
    ctx.globalCompositeOperation='source-over';
  };

  const undo=()=>{strokes.current.pop();redraw();};
  const clear=()=>{
    strokes.current=[];
    const cv=cvRef.current;
    const ctx=cv?.getContext('2d');
    // Mismo criterio que redraw(): el clearRect debe cubrir el área en
    // unidades reales del contexto ya escalado, no las dimensiones físicas
    // crudas del canvas — si no, "Limpiar" solo borraría una fracción del
    // área visible en pantallas con devicePixelRatio>1.
    if(ctx&&cv)ctx.clearRect(0,0,cv.width/dprRef.current,cv.height/dprRef.current);
  };

  return{cvRef,startD,moveD,endD,undo,clear};
}
