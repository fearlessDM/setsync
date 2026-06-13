// EquiposView: vista de equipos del modo Iglesia con sus integrantes y roles
import { EQUIPOS_DATA } from '../data/constants';
import { initials } from '../utils/music';

export function EquiposView({onToast,onGestionar}){
  return(
    <div>
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Equipos</div>
          <div style={{fontSize:12,color:'var(--ac)',fontWeight:600}}>Toca un equipo para ver sus integrantes y roles</div>
        </div>
        
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(295px,1fr))',gap:13}}>
        {EQUIPOS_DATA.map(eq=>(
          <div key={eq.id} className="eq-card">
            <div style={{padding:'12px 15px',display:'flex',alignItems:'center',gap:9,borderBottom:'1px solid var(--bd)'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:eq.color,boxShadow:`0 0 8px ${eq.color}80`,flexShrink:0}}/>
              <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:15,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,background:'var(--s2)',border:'1px solid var(--bd)',padding:'2px 8px',borderRadius:100}}>{eq.miembros.length} integrantes</span>
            </div>
            <div style={{padding:'8px 15px',borderBottom:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:5}}>
              {eq.roles.map(r=><span key={r} style={{fontSize:10,fontWeight:700,color:'var(--tx2)',background:'var(--s1)',border:'1px solid var(--bd)',padding:'3px 9px',borderRadius:100}}>{r}</span>)}
            </div>
            <div style={{padding:'0 15px'}}>
              {eq.miembros.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'80,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{m.name}</div>
                    <div style={{fontSize:10,color:'var(--tx3)'}}>{m.email}</div>
                  </div>
                  <span style={{fontSize:10,color:eq.color,fontWeight:700,background:eq.color+'18',border:`1px solid ${eq.color}33`,padding:'2px 7px',borderRadius:100}}>{m.role}</span>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
