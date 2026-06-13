// BandaApp: shell principal del modo Banda (navegación, equipo, SongView)
import { useState } from 'react';
import { ALL_ROLES_BANDA, ROLES_MUSICOS, EQUIPOS_TRABAJO } from '../../data/constants';
import { SONG_CONTENT_BANDA } from '../../data/songs-banda';
import { Toast } from '../common';
import { SongView } from '../SongView';
import { BandaFechas } from './BandaFechas';
import { BandaRepertorio } from './BandaRepertorio';
import { BandaBackstage } from './BandaBackstage';

export function BandaApp({onBack,userRole='superadmin',themeStyle={}}){
  const [view,setView]=useState('equipo');
  const [toast,setToast]=useState(null);
  const [songViewBanda,setSongViewBanda]=useState(null);
  const isEncargado=userRole==='encargado'||userRole==='superadmin';

  const showToast=(msg)=>{setToast(typeof msg==='string'?{text:msg}:msg);setTimeout(()=>setToast(null),2500);};

  const getRol=(rolId)=>ALL_ROLES_BANDA.find(r=>r.id===rolId)||{label:rolId};

  // ── Estado global ─────────────────────────────────────────────────────────
  const [members,setMembers]=useState([
    {id:1,nombre:'Carlos',   rol:'baterista'},
    {id:2,nombre:'Valentina',rol:'guitarrista_e'},
    {id:3,nombre:'Diego',    rol:'bajista'},
    {id:4,nombre:'Sofía',    rol:'corista1'},
    {id:5,nombre:'Matías',   rol:'corista2'},
    {id:6,nombre:'Renata',   rol:'dj'},
    {id:7,nombre:'Pedro',    rol:'sonido'},
    {id:8,nombre:'Ana',      rol:'visuales'},
    {id:9,nombre:'Luis',     rol:'roadies'},
    {id:10,nombre:'Marco',   rol:'roadies'},
  ]);

  const [gigs,setGigs]=useState([
    {id:1,nombre:'Concierto Verano',   fecha:'2026-07-12',lugar:'Teatro Municipal', ciudad:'Santiago',   tipo:'concierto',
     equipos:['sonido','visuales','roadies'],
     setlist:['NOCHE SIN FIN','FUEGO CRUZADO','TIERRA ROJA'],
     ensayos:[{fecha:'2026-07-05',lugar:'Sala de ensayo',duracion:'3h'}],
     notas:'Llevar backline completo. Soundcheck a las 17:00.',
     notifs:['Equipo completo convocado','Rider enviado al venue']},
    {id:2,nombre:'Ensayo General',     fecha:'2026-07-05',lugar:'Sala de ensayo', ciudad:'Santiago',   tipo:'ensayo',
     equipos:['sonido'],
     setlist:['NOCHE SIN FIN','MAR ADENTRO','CIUDAD DE VIDRIO'],
     ensayos:[],
     notas:'Ensayo de 3 horas. Llevar todo el material.',
     notifs:[]},
    {id:3,nombre:'Festival Música Viva',fecha:'2026-08-02',lugar:'Parque Central',ciudad:'Valparaíso',tipo:'festival',
     equipos:['sonido','visuales','roadies','catering','movilizacion'],
     setlist:['FUEGO CRUZADO','CIUDAD DE VIDRIO','MAR ADENTRO','TIERRA ROJA','NOCHE SIN FIN'],
     ensayos:[{fecha:'2026-07-26',lugar:'Sala de ensayo',duracion:'4h'}],
     notas:'Festival con 3 bandas. Slot de 45 minutos. Compartir backline.',
     notifs:['Confirmado 35 min de set','Rider aprobado']},
  ]);

  const [repertorio,setRepertorio]=useState([
    {n:'NOCHE SIN FIN',    key:'Am',bpm:74,artista:'Los Viajeros del Viento',tipo:'original'},
    {n:'FUEGO CRUZADO',    key:'Em',bpm:92,artista:'Tormenta Eléctrica',     tipo:'original'},
    {n:'MAR ADENTRO',      key:'D', bpm:68,artista:'Coral y Sal',            tipo:'original'},
    {n:'CIUDAD DE VIDRIO', key:'Dm',bpm:80,artista:'Proyecto Espejo',        tipo:'original'},
    {n:'TIERRA ROJA',      key:'G', bpm:76,artista:'Los Hijos del Norte',    tipo:'original'},
  ]);

  const TABS=[
    {id:'equipo',     label:'Equipo'},
    {id:'fechas',     label:'Fechas'},
    {id:'repertorio', label:'Repertorio'},
    {id:'backstage',  label:'Backstage'},
  ];

  const NavIcoBanda=({id,active})=>{
    const s={viewBox:'0 0 24 24',width:20,height:20,fill:'none',
      stroke:active?'var(--ac)':'var(--tx3)',strokeWidth:1.5,
      strokeLinecap:'round',strokeLinejoin:'round'};
    if(id==='equipo')    return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(id==='fechas')    return(<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(id==='repertorio')return(<svg {...s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(id==='backstage') return(<svg {...s}><line x1="5" y1="3" x2="5" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><rect x="3" y="7" width="4" height="3.5" rx="1.5"/><rect x="10" y="13" width="4" height="3.5" rx="1.5"/><rect x="17" y="5" width="4" height="3.5" rx="1.5"/></svg>);
    return null;
  };

  return(
    <div style={{...themeStyle,minHeight:'100vh',position:'relative'}}>
      <div style={{
        position:'sticky',top:0,zIndex:40,
        background:'rgba(var(--bg-rgb,5,5,13),.92)',
        backdropFilter:'blur(26px)',
        borderBottom:'1px solid var(--bd)',
        display:'flex',alignItems:'center',gap:10,
        padding:'10px 12px',
      }}>
        <button onClick={onBack} style={{
          background:'transparent',border:'none',cursor:'pointer',
          color:'var(--tx3)',padding:4,display:'flex',alignItems:'center',
          borderRadius:8,
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{flex:1}}>
          <h1 style={{margin:0,fontSize:16,fontWeight:900,
            fontFamily:"'Lato',sans-serif",color:'var(--tx)',lineHeight:1}}>
            Mi Banda
          </h1>
          <span style={{fontSize:9,fontWeight:700,color:'var(--ac)',
            textTransform:'uppercase',letterSpacing:'2px'}}>
            Modo Banda
          </span>
        </div>
      </div>
      {view==='fechas'&&(
        <div style={{
          position:'sticky',top:49,zIndex:39,
          background:'rgba(8,7,14,.9)',backdropFilter:'blur(18px)',
          borderBottom:'1px solid var(--bd)',
          display:'flex',overflowX:'auto',scrollbarWidth:'none',
          padding:'4px 8px',gap:4,
        }}>
          {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].map((m,i)=>{
            const hasGig=gigs.some(g=>new Date(g.fecha).getMonth()===i);
            const isNow=new Date().getMonth()===i;
            return(
              <button key={m} style={{
                flexShrink:0,padding:'4px 8px',borderRadius:6,border:'none',
                background:isNow?'rgba(200,169,126,.15)':'transparent',
                color:hasGig?'var(--ac)':isNow?'var(--tx2)':'var(--tx3)',
                fontSize:9,fontWeight:900,cursor:'pointer',
                letterSpacing:'.8px',fontFamily:"'Lato',sans-serif",
                position:'relative',
              }}>
                {m}
                {hasGig&&<span style={{
                  position:'absolute',bottom:2,left:'50%',
                  transform:'translateX(-50%)',
                  width:3,height:3,borderRadius:'50%',
                  background:'var(--ac)',display:'block',
                }}/>}
              </button>
            );
          })}
        </div>
      )}
      <div style={{padding:'10px 8px 90px'}}>
        {view==='equipo'&&(
          <div>
            <div className="ph" style={{marginBottom:16}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:900,color:'var(--tx)',
                fontFamily:"'Lato',sans-serif"}}>Equipo</h2>
              <span style={{fontSize:11,color:'var(--tx3)'}}>
                {members.filter(m=>ROLES_MUSICOS.find(r=>r.id===m.rol)).length} músicos ·{' '}
                {members.filter(m=>EQUIPOS_TRABAJO.find(r=>r.id===m.rol)).length} técnicos
              </span>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',
              textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
              Músicos
            </div>
            {members.filter(m=>ROLES_MUSICOS.find(r=>r.id===m.rol)).map(m=>(
              <div key={m.id} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'10px 12px',borderRadius:12,
                border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:8,
              }}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>{m.nombre}</div>
                  <div style={{fontSize:11,color:'var(--tx2)',marginTop:1}}>{getRol(m.rol).label}</div>
                </div>
                {m.rol==='encargado'&&(
                  <span style={{fontSize:9,padding:'2px 7px',borderRadius:10,
                    background:'rgba(200,169,126,.12)',color:'var(--ac)',
                    border:'1px solid rgba(200,169,126,.25)',fontWeight:700}}>
                    ENCARGADO
                  </span>
                )}
              </div>
            ))}
            <div style={{height:1,background:'var(--bd)',margin:'18px 0 12px'}}/>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',
              textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
              Equipos de trabajo
            </div>
            {EQUIPOS_TRABAJO.map(eq=>{
              const crew=members.filter(m=>m.rol===eq.id);
              return(
                <div key={eq.id} style={{
                  display:'flex',alignItems:'center',gap:12,
                  padding:'10px 12px',borderRadius:12,
                  border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:8,
                }}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:800,color:'var(--tx)'}}>{eq.label}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
                      {crew.length>0?crew.map(c=>c.nombre).join(', '):'Sin asignar'}
                    </div>
                  </div>
                  <div style={{
                    width:24,height:24,borderRadius:12,
                    background:crew.length>0?'rgba(200,169,126,.1)':'var(--s2)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:12,fontWeight:800,
                    color:crew.length>0?'var(--ac)':'var(--tx3)',
                  }}>{crew.length}</div>
                </div>
              );
            })}
          </div>
        )}
        {view==='fechas'&&(
          <BandaFechas
            gigs={gigs} setGigs={setGigs}
            members={members} repertorio={repertorio}
            isEncargado={isEncargado} onToast={showToast}
          />
        )}
        {view==='repertorio'&&(
          <BandaRepertorio
            repertorio={repertorio} setRepertorio={setRepertorio}
            gigs={gigs} isEncargado={isEncargado} onToast={showToast}
            onOpenSong={(song)=>setSongViewBanda(song)}
          />
        )}
        {view==='backstage'&&(
          <BandaBackstage
            members={members} setMembers={setMembers}
            gigs={gigs} setGigs={setGigs}
            repertorio={repertorio}
            isEncargado={isEncargado} onToast={showToast}
            getRol={getRol}
          />
        )}
      </div>
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(5,5,13,.92)',backdropFilter:'blur(26px)',
        borderTop:'1px solid var(--bd)',zIndex:20,
        padding:'7px 0 11px',display:'flex',
        justifyContent:'space-around',
      }}>
        {TABS.map(t=>(
          <div key={t.id}
            className={`bn${view===t.id?' on':''}`}
            onClick={()=>setView(t.id)}>
            <NavIcoBanda id={t.id} active={view===t.id}/>
            <span className="bn-lb">{t.label}</span>
          </div>
        ))}
      </nav>
      {songViewBanda&&(
        <div style={{position:'fixed',inset:0,zIndex:100}}>
          <SongView
            songs={[{name:songViewBanda.n,key:songViewBanda.key,
              bpm:songViewBanda.bpm,instrument:'GUITARRA',
              content:SONG_CONTENT_BANDA[songViewBanda.n]||null}]}
            startIdx={0}
            onClose={()=>setSongViewBanda(null)}
            theme="dark"
          />
        </div>
      )}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}
