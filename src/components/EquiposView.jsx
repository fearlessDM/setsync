import { t as getT } from '../i18n';
// EquiposView: vista de equipos del modo Iglesia con sus integrantes y roles
// equipos ya no se importa directo — llega por props para sincronizar con Firestore.
import { initials } from '../utils/music';
import { getModoTexto } from '../data/modo';

export function EquiposView({onToast,onGestionar,mode,lang='es',equipos=[]}){
  const vx=getModoTexto(mode,lang);
  const tx=getT(lang);
  return(
    <div>
      <div className="ph">
        <div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>{vx.equipoPersona.plural}</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-lg)',color:'var(--ac)',fontWeight:400}}>{tx.tapTeamHint}</div>
        </div>
        
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(295px,1fr))',gap:13}}>
        {equipos.map(eq=>(
          <div key={eq.id} className="eq-card">
            <div style={{padding:'12px 15px',display:'flex',alignItems:'center',gap:9,borderBottom:'1px solid var(--bd)'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:eq.color,boxShadow:`0 0 8px ${eq.color}80`,flexShrink:0}}/>
              <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700,fontFamily:"var(--font-body)",background:'var(--s2)',padding:'2px 8px',borderRadius:100}}>{tx.memberCount((eq.miembros||[]).length)}</span>
            </div>
            <div style={{padding:'8px 15px',borderBottom:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:5}}>
              {(eq.roles||[]).map(r=><span key={r} style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',fontFamily:"var(--font-body)",background:'var(--s1)',padding:'3px 9px',borderRadius:100}}>{r}</span>)}
            </div>
            <div style={{padding:'0 15px'}}>
              {(eq.miembros||[]).map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'80,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'var(--fs-3xs)',fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--tx)',fontFamily:"var(--font-body)"}}>{m.name}</div>
                    <div style={{fontSize:'var(--fs-2xs)',fontWeight:700,color:'var(--tx3)',fontFamily:"var(--font-body)"}}>{m.email}</div>
                  </div>
                  <span style={{fontSize:'var(--fs-2xs)',color:eq.color,fontWeight:700,fontFamily:"var(--font-body)",background:eq.color+'18',padding:'2px 7px',borderRadius:100}}>{m.role}</span>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
