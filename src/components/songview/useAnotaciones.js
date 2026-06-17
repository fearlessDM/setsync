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

  const redraw=()=>{
    const cv=cvRef.current;if(!cv)return;
    const ctx=cv.getContext('2d');
    ctx.clearRect(0,0,cv.width,cv.height);
    strokes.current.forEach(s=>{
      if(s.pts.length<2)return;
      ctx.beginPath();applyS(s);
      ctx.moveTo(s.pts[0].x,s.pts[0].y);
      s.pts.forEach(p=>ctx.lineTo(p.x,p.y));
      ctx.stroke();
    });
    ctx.globalCompositeOperation='source-over';
  };

  useEffect(()=>{
    const cv=cvRef.current,w=wrapRef.current;
    if(!cv||!w)return;
    const resize=()=>{cv.width=w.clientWidth;cv.height=w.clientHeight;redraw();};
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(w);
    return()=>ro.disconnect();
  },[idx]);

  const getP=e=>{
    const r=cvRef.current.getBoundingClientRect();
    const s=e.touches?e.touches[0]:e;
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
    const ctx=cvRef.current?.getContext('2d');
    ctx?.clearRect(0,0,cvRef.current.width,cvRef.current.height);
  };

  return{cvRef,startD,moveD,endD,undo,clear};
}
