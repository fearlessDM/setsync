// Equipos: vista en grilla de personas agrupadas por equipo (antes:
// EquiposView.jsx, solo Iglesia con EQUIPOS_DATA hardcodeado). Ahora lee
// del array único `personas` y agrupa por equipoId/equipoColor —
// funciona igual para Iglesia (equipos formales: Banda, Sonido,
// Transmisiones) y para Banda (si en el futuro agrupa por sub-equipos).
// Si una persona no tiene equipoId, cae en un grupo "Sin equipo".
import { initials } from '../utils/music';
import { getModoTexto } from '../data/modo';

export function Equipos({personas=[],onToast,onGestionar,mode,lang='es'}){
  const vx=getModoTexto(mode,lang);

  const grupos=[];
  const sinEquipo=[];
  personas.forEach(p=>{
    if(!p.equipoId){sinEquipo.push(p);return;}
    let g=grupos.find(x=>x.id===p.equipoId);
    if(!g){g={id:p.equipoId,name:p.equipoNombre||p.equipoId,color:p.equipoColor||'var(--ac)',miembros:[]};grupos.push(g);}
    g.miembros.push(p);
  });
  if(sinEquipo.length>0)grupos.push({id:'sin-equipo',name:lang==='en'?'No team':'Sin equipo',color:'var(--tx3)',miembros:sinEquipo});

  return(
    <div>
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1,marginBottom:5}}>
            {vx.equipoPersona.plural}
          </div>
          <div style={{fontSize:12,color:'var(--ac)',fontWeight:600}}>
            {lang==='en'?'Tap a team to see members and roles':'Toca un equipo para ver sus integrantes y roles'}
          </div>
        </div>
      </div>
      {grupos.length===0?(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--tx3)',fontSize:13,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
          {lang==='en'?'No people yet':'Sin personas todavía'}
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(295px,1fr))',gap:13}}>
          {grupos.map(eq=>(
            <div key={eq.id} className="eq-card">
              <div style={{padding:'12px 15px',display:'flex',alignItems:'center',gap:9,borderBottom:'1px solid var(--bd)'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:eq.color,boxShadow:`0 0 8px ${eq.color}80`,flexShrink:0}}/>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:900,fontSize:15,color:'var(--tx)',flex:1}}>{eq.name}</span>
                <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,background:'var(--s2)',border:'1px solid var(--bd)',padding:'2px 8px',borderRadius:100}}>
                  {eq.miembros.length} {lang==='en'?'members':'integrantes'}
                </span>
              </div>
              <div style={{padding:'0 15px'}}>
                {eq.miembros.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                    <div style={{width:24,height:24,borderRadius:'50%',background:`linear-gradient(135deg,${eq.color}80,${eq.color})`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,color:'#fff',flexShrink:0}}>
                      {initials(m.nombre)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{m.nombre}</div>
                      {m.email&&<div style={{fontSize:10,color:'var(--tx3)'}}>{m.email}</div>}
                    </div>
                    <span style={{fontSize:10,color:eq.color,fontWeight:700,background:`${eq.color}18`,border:`1px solid ${eq.color}33`,padding:'2px 7px',borderRadius:100}}>
                      {m.rol}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
