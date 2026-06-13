// Editor de itinerario para eventos (usado en BackstageView)
import { useState } from 'react';


// ─── ITINERARIO EDITOR ────────────────────────────────
export const ITINERARIO_DEFAULT=[
  {hora:'08:30',label:'Llegada y preparación'},
  {hora:'09:00',label:'Prueba de sonido'},
  {hora:'09:30',label:'Ensayo con el equipo'},
  {hora:'10:00',label:'Inicio del servicio'},
  {hora:'10:05',label:'Adoración'},
  {hora:'10:30',label:'Mensaje'},
  {hora:'11:00',label:'Cierre y oración'},
];
export function ItinerarioEditor(){
  const [items,setItems]=useState(ITINERARIO_DEFAULT);
  const [edit,setEdit]=useState(false);
  const update=(i,field,val)=>setItems(prev=>prev.map((it,j)=>j===i?{...it,[field]:val}:it));
  const addItem=()=>setItems(prev=>[...prev,{hora:'',label:''}]);
  const removeItem=i=>setItems(prev=>prev.filter((_,j)=>j!==i));

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontSize:10,fontWeight:700,color:'var(--tx3)'}}>Horarios del evento</span>
        <button onClick={()=>setEdit(v=>!v)} style={{fontSize:11,fontWeight:700,color:edit?'var(--ac)':'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
          {edit?'Listo':'Editar'}
        </button>
      </div>
      {items.map((it,i)=>(
        <div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
          {edit
            ?<input value={it.hora} onChange={e=>update(i,'hora',e.target.value)} style={{fontFamily:"'Source Code Pro',monospace",fontSize:11,color:'var(--ac)',background:'rgba(200,169,126,.08)',border:'1px solid rgba(200,169,126,.2)',borderRadius:5,padding:'2px 6px',width:52,outline:'none'}}/>
            :<span style={{fontFamily:"'Source Code Pro',monospace",fontSize:11,color:'var(--ac)',minWidth:52,flexShrink:0}}>{it.hora}</span>
          }
          {edit
            ?<input value={it.label} onChange={e=>update(i,'label',e.target.value)} style={{flex:1,fontSize:11,color:'var(--tx)',background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:5,padding:'2px 8px',outline:'none',fontFamily:"'Lato',sans-serif"}}/>
            :<span style={{flex:1,fontSize:11,color:'var(--tx)'}}>{it.label}</span>
          }
          {edit&&<button onClick={()=>removeItem(i)} style={{background:'none',border:'none',color:'var(--rd)',cursor:'pointer',fontSize:15,lineHeight:1,flexShrink:0}}>×</button>}
        </div>
      ))}
      {edit&&(
        <button onClick={addItem} style={{marginTop:8,fontSize:11,fontWeight:700,color:'var(--ac)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:4}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Agregar ítem
        </button>
      )}
    </div>
  );
}

