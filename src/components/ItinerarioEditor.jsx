// Editor de itinerario para eventos (usado en BackstageView)
// v40-ampliación: ahora es un componente CONTROLADO (items/onChange) — antes
// tenía su propio useState interno sin props, así que nada de lo que se
// editaba acá se guardaba nunca en el evento. Se perdía al salir de la
// pantalla.
import { useState } from 'react';
import { t as getT } from '../i18n';

// ─── ITINERARIO EDITOR ────────────────────────────────
export const getItinerarioDefault=(lang='es')=>getT(lang).defaultItinerary;
export function ItinerarioEditor({items,onChange,lang='es'}){
  const tx=getT(lang);
  const [edit,setEdit]=useState(false);
  const update=(i,field,val)=>onChange(items.map((it,j)=>j===i?{...it,[field]:val}:it));
  const addItem=()=>onChange([...items,{hora:'',label:''}]);
  const removeItem=i=>onChange(items.filter((_,j)=>j!==i));

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',marginBottom:8}}>
        <button onClick={()=>setEdit(v=>!v)} style={{fontSize:'var(--fs-base)',fontWeight:700,color:edit?'var(--ac)':'var(--tx3)',background:'none',cursor:'pointer',fontFamily:"var(--font-body)"}}>
          {edit?tx.done:tx.edit}
        </button>
      </div>
      {items.map((it,i)=>(
        <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',padding:'5px 0',borderBottom:'1px solid var(--bd)'}}>
          {edit
            ?<textarea value={it.hora} onChange={e=>update(i,'hora',e.target.value)} rows={1}
              style={{fontFamily:"var(--font-body)",fontWeight:700,fontSize:'var(--fs-base)',color:'var(--ac)',background:'rgba(200,169,126,.08)',borderRadius:5,padding:'4px 6px',width:52,outline:'none',resize:'none',lineHeight:1.3}}/>
            :<span style={{fontFamily:"var(--font-body)",fontWeight:700,fontSize:'var(--fs-base)',color:'var(--ac)',minWidth:52,flexShrink:0}}>{it.hora}</span>
          }
          {edit
            ?<textarea value={it.label} onChange={e=>update(i,'label',e.target.value)} rows={1}
              style={{flex:1,fontSize:'var(--fs-base)',color:'var(--tx)',background:'var(--s2)',borderRadius:5,padding:'4px 8px',outline:'none',fontFamily:"var(--font-body)",resize:'vertical',lineHeight:1.4}}/>
            :<span style={{flex:1,fontSize:'var(--fs-base)',color:'var(--tx)'}}>{it.label}</span>
          }
          {edit&&<button onClick={()=>removeItem(i)} style={{background:'none',color:'var(--rd)',cursor:'pointer',fontSize:'var(--fs-emph)',lineHeight:1,flexShrink:0}}>×</button>}
        </div>
      ))}
      {edit&&(
        <button onClick={addItem} style={{marginTop:8,fontSize:'var(--fs-base)',fontWeight:700,color:'var(--ac)',background:'none',cursor:'pointer',fontFamily:"var(--font-body)",display:'flex',alignItems:'center',gap:4}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {tx.addItem}
        </button>
      )}
    </div>
  );
}

