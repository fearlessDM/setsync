// BandaBackstage: gestión de equipo, ensayos y backstage del modo Banda
import { useState } from 'react';
import { ALL_ROLES_BANDA, ROLES_MUSICOS, EQUIPOS_TRABAJO } from '../../data/constants';
import { initials } from '../../utils/music';
import { BandaCrearEnsayo } from './BandaCrearEnsayo';
import { ItinerarioEditor } from '../ItinerarioEditor';

export function BandaBackstage({members,setMembers,gigs=[],setGigs,repertorio=[],isEncargado,onToast,getRol,lang='es'}){
  const [bsView,setBsView]=useState(null);
  const [subView,setSubView]=useState(null); // 'agregar' | 'equipo'
  const [nuevoNombre,setNuevoNombre]=useState('');
  const [nuevoRol,setNuevoRol]=useState('guitarrista_e');
  const [equiposPersonalizados,setEquiposPersonalizados]=useState([]);
  const [nuevoEquipoNombre,setNuevoEquipoNombre]=useState('');
  const [nuevoEquipoRoles,setNuevoEquipoRoles]=useState(['']);

  const MENU=[
    {id:'evento',   label:'Crear Evento',        sub:'Gigs, festivales, presentaciones'},
    {id:'ensayo',   label:'Crear Ensayo',         sub:'Fecha, lugar, equipos y setlist'},
    {id:'setlist',  label:'Crear Setlist',        sub:'Armar lista para un gig'},
    {id:'equipo',   label:'Gestión de Equipo',    sub:'Músicos y técnicos'},
    {id:'notif',    label:'Notificaciones',       sub:'Avisar al equipo'},
    {id:'config',   label:'Configuración',        sub:'Ajustes de la banda'},
  ];

  // ── Vistas internas ───────────────────────────────────────────────────────
  if(bsView==='equipo') return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>

      <div className="ph">
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:400,color:'var(--tx)',
            fontFamily:"'Special Gothic Expanded One',sans-serif"}}>Gestión de Equipo</h2>
          <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
            {members.length} integrantes · {equiposPersonalizados.length} equipos
          </div>
        </div>
        {isEncargado&&(
          <div className="ph-btns">
            <button onClick={()=>setSubView('agregar')}
              style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,
                border:'1px solid var(--ac)',background:'rgba(200,169,126,.08)',
                color:'var(--ac)',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              + Persona
            </button>
            <button onClick={()=>setSubView('equipo')}
              style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,
                border:'1px solid var(--bd)',background:'transparent',
                color:'var(--tx3)',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              + Equipo
            </button>
          </div>
        )}
      </div>
      {subView==='agregar'&&isEncargado&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',
          background:'var(--s2)',marginBottom:16}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10}}>
            Nuevo integrante
          </div>
          <input value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}
            placeholder="Nombre"
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,
              marginBottom:8,boxSizing:'border-box'}}/>
          <select value={nuevoRol} onChange={e=>setNuevoRol(e.target.value)}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:8}}>
            <optgroup label="Músicos">
              {ROLES_MUSICOS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </optgroup>
            <optgroup label="Equipos de trabajo">
              {EQUIPOS_TRABAJO.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </optgroup>
            {equiposPersonalizados.map(eq=>(
              <optgroup key={eq.id} label={eq.nombre}>
                {eq.roles.map(r=><option key={r} value={r}>{r}</option>)}
              </optgroup>
            ))}
          </select>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setSubView(null);setNuevoNombre('');}}
              style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid var(--bd)',
                background:'transparent',color:'var(--tx3)',fontSize:13,
                fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              Cancelar
            </button>
            <button onClick={()=>{
              if(!nuevoNombre.trim()){return;}
              setMembers(prev=>[...prev,{id:Date.now(),nombre:nuevoNombre,rol:nuevoRol}]);
              setNuevoNombre('');setSubView(null);
              onToast(`✓ ${nuevoNombre} agregado`);
            }} style={{flex:2,padding:'9px',borderRadius:10,border:'none',
              background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              Agregar
            </button>
          </div>
        </div>
      )}
      {subView==='equipo'&&isEncargado&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',
          background:'var(--s2)',marginBottom:16}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10}}>
            Nuevo equipo
          </div>
          <input value={nuevoEquipoNombre} onChange={e=>setNuevoEquipoNombre(e.target.value)}
            placeholder="Nombre del equipo (ej: Cuerdas, Vientos...)"
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,
              marginBottom:8,boxSizing:'border-box'}}/>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginBottom:6}}>
            Roles dentro del equipo
          </div>
          {nuevoEquipoRoles.map((r,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6}}>
              <input value={r} onChange={e=>setNuevoEquipoRoles(prev=>prev.map((x,j)=>j===i?e.target.value:x))}
                placeholder={`Rol ${i+1}`}
                style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid var(--bd)',
                  background:'var(--s1)',color:'var(--tx)',fontSize:13}}/>
              <button onClick={()=>setNuevoEquipoRoles(prev=>prev.filter((_,j)=>j!==i))}
                style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)'}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
          <button onClick={()=>setNuevoEquipoRoles(prev=>[...prev,''])}
            style={{width:'100%',padding:'7px',borderRadius:8,border:'1px dashed var(--bd)',
              background:'transparent',color:'var(--tx3)',fontSize:12,
              fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",marginBottom:10}}>
            + Agregar rol
          </button>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setSubView(null);setNuevoEquipoNombre('');setNuevoEquipoRoles(['']);}}
              style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid var(--bd)',
                background:'transparent',color:'var(--tx3)',fontSize:13,
                fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              Cancelar
            </button>
            <button onClick={()=>{
              if(!nuevoEquipoNombre.trim()){onToast('Ingresa el nombre del equipo');return;}
              const roles=nuevoEquipoRoles.filter(r=>r.trim());
              setEquiposPersonalizados(prev=>[...prev,{
                id:'eq'+Date.now(),nombre:nuevoEquipoNombre,roles
              }]);
              setNuevoEquipoNombre('');setNuevoEquipoRoles(['']);setSubView(null);
              onToast(`✓ Equipo "${nuevoEquipoNombre}" creado`);
            }} style={{flex:2,padding:'9px',borderRadius:10,border:'none',
              background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              Crear equipo
            </button>
          </div>
        </div>
      )}
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
        letterSpacing:'1.5px',marginBottom:8}}>
        Músicos
      </div>
      {members.filter(m=>ROLES_MUSICOS.find(r=>r.id===m.rol)).map(m=>(
        <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,
          padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:400,color:'var(--tx)',
              fontFamily:"'Lexend Giga',sans-serif"}}>{m.nombre}</div>
            <div style={{fontSize:11,color:'var(--tx2)'}}>{getRol(m.rol).label}</div>
          </div>
          {isEncargado&&(
            <button onClick={()=>{setMembers(prev=>prev.filter(x=>x.id!==m.id));onToast(`${m.nombre} eliminado`);}}
              style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      ))}
      <div style={{height:1,background:'var(--bd)',margin:'16px 0 12px'}}/>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
        letterSpacing:'1.5px',marginBottom:8}}>
        Equipos de trabajo
      </div>
      {members.filter(m=>EQUIPOS_TRABAJO.find(r=>r.id===m.rol)).map(m=>(
        <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,
          padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:400,color:'var(--tx)',
              fontFamily:"'Lexend Giga',sans-serif"}}>{m.nombre}</div>
            <div style={{fontSize:11,color:'var(--tx2)'}}>{getRol(m.rol).label}</div>
          </div>
          {isEncargado&&(
            <button onClick={()=>{setMembers(prev=>prev.filter(x=>x.id!==m.id));onToast(`${m.nombre} eliminado`);}}
              style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      ))}
      {equiposPersonalizados.map(eq=>(
        <div key={eq.id} style={{marginTop:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
              letterSpacing:'1.5px'}}>
              {eq.nombre}
            </div>
            {isEncargado&&(
              <button onClick={()=>setEquiposPersonalizados(prev=>prev.filter(x=>x.id!==eq.id))}
                style={{fontSize:10,color:'var(--tx3)',background:'transparent',
                  border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                Eliminar
              </button>
            )}
          </div>
          {members.filter(m=>eq.roles.includes(m.rol)).map(m=>(
            <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,
              padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
              background:'var(--s1)',marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                  fontFamily:"'Lexend Giga',sans-serif"}}>{m.nombre}</div>
                <div style={{fontSize:11,color:'var(--tx2)'}}>{m.rol}</div>
              </div>
            </div>
          ))}
          {members.filter(m=>eq.roles.includes(m.rol)).length===0&&(
            <div style={{fontSize:12,color:'var(--tx3)',padding:'8px 0',
              fontFamily:"'Lexend Giga',sans-serif"}}>
              Sin integrantes en este equipo
            </div>
          )}
        </div>
      ))}
    </div>
  );

    if(bsView==='notif') return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
        Notificaciones
      </h2>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
        {['Todo el equipo','Músicos','Sonido','Visuales','Roadies'].map(dest=>(
          <button key={dest}
            style={{padding:'5px 10px',borderRadius:20,fontSize:11,fontWeight:700,
              cursor:'pointer',border:'1px solid var(--bd)',
              background:'transparent',color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
            {dest}
          </button>
        ))}
      </div>
      <textarea placeholder="Mensaje para el equipo..."
        rows={4}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
          background:'var(--s1)',color:'var(--tx)',fontSize:13,
          resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8}}/>
      <button onClick={()=>{onToast('✓ Notificación enviada');setBsView(null);}}
        style={{width:'100%',padding:'11px',borderRadius:12,border:'none',
          background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:800,
          cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
        Enviar mensaje
      </button>
    </div>
  );

  // ── Home Backstage ────────────────────────────────────────────────────────
  return(
    <div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
        Backstage
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:20}}>
        {lang==='en'?'Band management panel':'Panel de gestión de la banda'}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {MENU.map(item=>(
          <button key={item.id}
            onClick={()=>['equipo','notif','ensayo'].includes(item.id)?setBsView(item.id):onToast(`${item.label} — próximamente`)}
            style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:14,padding:'20px 16px',cursor:'pointer',textAlign:'left',transition:'all .18s',display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',lineHeight:1.15}}>{item.label}</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:200,fontSize:10,color:'var(--tx3)',lineHeight:1.4}}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
