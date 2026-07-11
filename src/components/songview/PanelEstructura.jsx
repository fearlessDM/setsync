import { useRef } from 'react';
import { getColorBloque } from './estructura';

// ── Panel MAPA — drag & drop mouse + touch, sin flechas ─────────────────────
// Muestra y permite reordenar el "mapa" de navegación de la canción (panel
// lateral). Esto es independiente del contenido real: reordenar aquí NUNCA
// debe afectar lo que se ve en VistaBloques ni el texto original.
// Extraído de SongView.jsx (Tanda 1 — refactor + fix del bug de reorder).
//
// Props:
//  - seq: array activo del mapa (de getActiveMapaCancion())
//  - isLight: tema claro/oscuro
//  - onReordenar(fromIdx, toIdx), onDuplicar(i), onEliminar(i), onReset()
//  - editable: si es false (Academia, alumno sin permiso de editar estructura),
//    el panel queda de solo lectura — sin drag, sin duplicar/eliminar/reset.
//    Default true para no afectar a Iglesia/Banda, que no pasan este prop.
export function PanelEstructura({seq,isLight=false,onReordenar,onDuplicar,onEliminar,onReset,editable=true}){
  const dragIdx=useRef(null);
  if(!seq||!seq.length)return null;
  const panelBg=isLight?'rgba(240,234,222,.92)':'rgba(6,4,18,.92)';

  // ── Touch drag ───────────────────────────────────────────────────────────
  const onTouchStartItem=(i)=>(e)=>{
    dragIdx.current=i;
    e.currentTarget.style.opacity='0.5';
    e.currentTarget.style.transform='scale(1.05)';
  };
  const onTouchMoveItem=(e)=>{
    e.preventDefault();
    const touch=e.touches[0];
    const el=document.elementFromPoint(touch.clientX,touch.clientY);
    const item=el?.closest('[data-bloque-idx]');
    // Limpiar resaltado anterior
    document.querySelectorAll('[data-bloque-idx]').forEach(n=>{n.style.background='';});
    if(item){
      const targetIdx=parseInt(item.dataset.bloqueIdx);
      if(dragIdx.current!==null&&targetIdx!==dragIdx.current){
        item.style.background='rgba(255,255,255,.1)';
        onReordenar(dragIdx.current,targetIdx);
        dragIdx.current=targetIdx;
      }
    }
  };
  const onTouchEndItem=(e)=>{
    if(e.currentTarget){e.currentTarget.style.opacity='';e.currentTarget.style.transform='';}
    document.querySelectorAll('[data-bloque-idx]').forEach(n=>{n.style.background='';});
    dragIdx.current=null;
  };

  // ── Mouse drag ───────────────────────────────────────────────────────────
  const onMouseDownItem=(i)=>(e)=>{
    e.preventDefault();
    dragIdx.current=i;
    const el=e.currentTarget;
    el.style.opacity='0.5';
    el.style.transform='scale(1.05)';
    el.style.cursor='grabbing';
    const onMove=(ev)=>{
      const target=document.elementFromPoint(ev.clientX,ev.clientY);
      const item=target?.closest('[data-bloque-idx]');
      document.querySelectorAll('[data-bloque-idx]').forEach(n=>{if(n!==el)n.style.background='';});
      if(item){
        const targetIdx=parseInt(item.dataset.bloqueIdx);
        if(dragIdx.current!==null&&targetIdx!==dragIdx.current){
          item.style.background='rgba(255,255,255,.1)';
          onReordenar(dragIdx.current,targetIdx);
          dragIdx.current=targetIdx;
        }
      }
    };
    const onUp=()=>{
      el.style.opacity='';el.style.transform='';el.style.cursor='grab';
      document.querySelectorAll('[data-bloque-idx]').forEach(n=>{n.style.background='';});
      dragIdx.current=null;
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  };

  return(
    <div style={{
      display:'flex',flexDirection:'column',
      borderRadius:14,border:'1px solid var(--bd)',
      background:panelBg,backdropFilter:'blur(40px)',
      overflow:'hidden',width:64,
      maxHeight:'38vh',
    }}>
      <div style={{fontSize:'var(--fs-3xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',textAlign:'center',padding:'5px 4px 4px',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
        MAPA
      </div>
      <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none',padding:'3px',WebkitOverflowScrolling:'touch',touchAction:'pan-y'}}>
        {seq.map((b,i)=>{
          const color=getColorBloque(b.label);
          return(
            <div
              key={b.uid??i}
              data-bloque-idx={i}
              onTouchStart={editable?onTouchStartItem(i):undefined}
              onTouchMove={editable?onTouchMoveItem:undefined}
              onTouchEnd={editable?onTouchEndItem:undefined}
              onMouseDown={editable?onMouseDownItem(i):undefined}
              style={{marginBottom:3,cursor:editable?'grab':'default',userSelect:'none',transition:'transform .15s,opacity .15s'}}
            >
              <div style={{display:'flex',flexDirection:'column',borderRadius:8,border:`1px solid ${color}45`,background:`${color}15`,overflow:'hidden'}}>
                <div style={{fontSize:'var(--fs-2xs)',fontWeight:900,color,textTransform:'uppercase',letterSpacing:'.5px',textAlign:'center',padding:'5px 3px',lineHeight:1.1}}>
                  {b.label.length>6?b.label.slice(0,6)+'…':b.label}
                </div>
                {editable&&(
                  <div style={{display:'flex',justifyContent:'space-around',borderTop:`1px solid ${color}25`,padding:'2px'}}>
                    <button
                      onMouseDown={e=>e.stopPropagation()}
                      onClick={(e)=>{e.stopPropagation();onDuplicar(i);}}
                      style={{flex:1,padding:'3px 0',border:'none',background:'transparent',color,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                      title="Duplicar"
                    >
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button
                      onMouseDown={e=>e.stopPropagation()}
                      onClick={(e)=>{e.stopPropagation();onEliminar(i);}}
                      disabled={seq.length<=1}
                      style={{flex:1,padding:'3px 0',border:'none',background:'transparent',color:seq.length<=1?'var(--tx3)':'var(--rd)',cursor:seq.length<=1?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                      title="Eliminar"
                    >
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {editable&&(
        <button
          onClick={onReset}
          style={{padding:'4px',border:'none',borderTop:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-3xs)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',flexShrink:0}}
        >
          Reset
        </button>
      )}
    </div>
  );
}
