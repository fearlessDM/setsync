// App: componente raíz único de la plataforma. UNA sola app, UN solo
// settings — Iglesia/Banda ya NO son shells separados (BandaApp.jsx fue
// retirado). El modo elegido en el onboarding controla vocabulario y
// features vía data/modo.js, y el mismo árbol de componentes (Backstage,
// Fechas, Repertorio, Equipos) sirve a ambos modos.
import { useState, useCallback, useEffect, useRef } from 'react';
import { CANCIONES, SETLISTS, EVENTOS_ESPECIALES, EQUIPOS_DATA, COVERS_DEMO } from '../data/constants';
import { SONG_CONTENT_IGLESIA } from '../data/songs-iglesia';
import { SONG_CONTENT_BANDA } from '../data/songs-banda';
import '../styles/theme.css';
import { Toast } from './common';
import { SongView } from './SongView';
import { AdminView, MiSetlist, PremiereView } from './AdminView';
import { Cancionero } from './Cancionero';
import { EquiposView } from './EquiposView';
import { BackstageView } from './BackstageView';
import { Inicio } from './Inicio';
import { Click } from './Click';
import { Pads } from './Pads';
import { Multitracks } from './Multitracks';
import { Monitoreo } from './Monitoreo';
import { t as getT } from '../i18n';
import { getModoTexto, getModoFeatures, getTiposEventoDisponibles } from '../data/modo';
import { getPlan, featureDisponible, mensajeUpgrade } from '../data/planes';
import { migrarSetlistsIglesia, migrarPersonasIglesia, migrarEquiposIglesia } from '../data/eventos-schema';
import { firebaseListo } from '../firebase/config';
import { getAccountId, subscribeEventos, subscribePersonas, subscribeEquipos, guardarEvento, guardarPersona, guardarEquipo, crearInvitacion } from '../firebase/firestore';

// ── Seed de datos Banda (antes vivía dentro de BandaApp.jsx) ─────────────
const SEED_BANDA_EVENTOS=[
  {id:'banda-1',tipo:'gig',fecha:'2026-07-12',lugar:'Teatro Municipal',ciudad:'Santiago',nombre:'Concierto Verano',
    setlist:[{name:'NOCHE SIN FIN',key:'Am',bpm:74},{name:'FUEGO CRUZADO',key:'Em',bpm:92},{name:'TIERRA ROJA',key:'G',bpm:76}],
    equiposConvocados:['sonido','visuales','roadies'],
    ensayosPrevios:[{fecha:'2026-07-05',lugar:'Sala de ensayo',duracion:'3h'}],
    notas:'Llevar backline completo. Soundcheck a las 17:00.',notifs:['Equipo completo convocado','Rider enviado al venue']},
  {id:'banda-2',tipo:'ensayo',fecha:'2026-07-05',lugar:'Sala de ensayo',ciudad:'Santiago',nombre:'Ensayo General',
    setlist:[{name:'NOCHE SIN FIN',key:'Am',bpm:74},{name:'MAR ADENTRO',key:'D',bpm:68},{name:'CIUDAD DE VIDRIO',key:'Dm',bpm:80}],
    equiposConvocados:['sonido'],ensayosPrevios:[],notas:'Ensayo de 3 horas. Llevar todo el material.',notifs:[]},
  {id:'banda-3',tipo:'festival',fecha:'2026-08-02',lugar:'Parque Central',ciudad:'Valparaíso',nombre:'Festival Música Viva',
    setlist:[{name:'FUEGO CRUZADO',key:'Em',bpm:92},{name:'CIUDAD DE VIDRIO',key:'Dm',bpm:80},{name:'MAR ADENTRO',key:'D',bpm:68},{name:'TIERRA ROJA',key:'G',bpm:76},{name:'NOCHE SIN FIN',key:'Am',bpm:74}],
    equiposConvocados:['sonido','visuales','roadies','catering','movilizacion'],
    ensayosPrevios:[{fecha:'2026-07-26',lugar:'Sala de ensayo',duracion:'4h'}],
    notas:'Festival con 3 bandas. Slot de 45 minutos. Compartir backline.',notifs:['Confirmado 35 min de set','Rider aprobado']},
];
const SEED_BANDA_PERSONAS=[
  {id:'b1',nombre:'Carlos',rol:'baterista',email:null,equipoId:null},
  {id:'b2',nombre:'Valentina',rol:'guitarrista_e',email:null,equipoId:null},
  {id:'b3',nombre:'Diego',rol:'bajista',email:null,equipoId:null},
  {id:'b4',nombre:'Sofía',rol:'corista1',email:null,equipoId:null},
  {id:'b5',nombre:'Matías',rol:'corista2',email:null,equipoId:null},
  {id:'b6',nombre:'Pedro',rol:'sonido',email:null,equipoId:null},
];
const SEED_BANDA_REPERTORIO=[]; // sin canciones precargadas — lienzo en blanco para que el usuario lo llene
const ROLES_BANDA=[
  {id:'encargado',label:'Encargado'},{id:'guitarrista_e',label:'Guitarra Eléctrica'},
  {id:'guitarrista_a',label:'Guitarra Acústica'},{id:'bajista',label:'Bajista'},
  {id:'baterista',label:'Batería'},{id:'dj',label:'DJ'},{id:'corista1',label:'Corista 1'},
  {id:'corista2',label:'Corista 2'},{id:'teclado',label:'Tecladista'},
];

export default function App(){
  const [appMode,setAppMode]=useState(null); // null | 'iglesia' | 'banda' — UNA sola decisión, para siempre
  const [lang,setLang]=useState('es');
  const tx=getT(lang);
  const vx=getModoTexto(appMode,lang);
  const feat=getModoFeatures(appMode);
  const [view,setView]=useState('inicio');
  const [sbCol,setSbCol]=useState(false);
  const [toast,setToast]=useState(null);
  const [theme,setTheme]=useState('dark');
  const [userRole]=useState('superadmin');
  const isAdmin=userRole==='superadmin';
  const [planId,setPlanId]=useState('lite'); // 'lite' | 'pro' | 'premium' — selector temporal de prueba,
  // hasta que exista cobro real. El plan es SIEMPRE del usuario individual,
  // nunca se hereda del líder/equipo (mismo principio que ya regía SongView).
  const planActivo=getPlan(planId);
  const tieneUniversal=featureDisponible('cancioneroUniversal',feat,planActivo);
  const tienePremiere=featureDisponible('premiereExclusivas',feat,planActivo);
  const tienePads=featureDisponible('pads',feat,planActivo);
  const tieneClick=featureDisponible('click',feat,planActivo);
  const tieneMultitracks=featureDisponible('multitracks',feat,planActivo);
  const tieneMonitoreo=featureDisponible('monitoreo',feat,planActivo);
  const [online,setOnline]=useState(true); // toggle online/offline — no cierra la app, solo pausa el sync
  const accountId=getAccountId();
  const [mostrarMultitracks,setMostrarMultitracks]=useState(false);

  // ── Estado único, inicializado por modo (lazy init: solo corre la
  // migración del modo elegido, no ambas) ─────────────────────────────
  const [eventos,setEventos]=useState(()=>
    appMode==='banda'?SEED_BANDA_EVENTOS:migrarSetlistsIglesia(SETLISTS,EVENTOS_ESPECIALES)
  );
  const [personas,setPersonas]=useState(()=>
    appMode==='banda'?SEED_BANDA_PERSONAS:migrarPersonasIglesia(EQUIPOS_DATA)
  );
  const [equipos,setEquipos]=useState(()=>
    appMode==='banda'?[]:migrarEquiposIglesia(EQUIPOS_DATA) // Banda arranca sin equipos formales, se crean a mano si hace falta
  );
  const [repertorio,setRepertorio]=useState(()=>appMode==='banda'?SEED_BANDA_REPERTORIO:CANCIONES.map(c=>({...c})));
  const [colecciones,setColecciones]=useState([]);

  // ── Sync con Firestore (CAPA 1 — sesión compartida). Si Firebase no
  // está configurado (firebaseListo=false) o el usuario está offline,
  // esto no hace nada — la app sigue 100% local, igual que siempre.
  // Primera conexión: si Firestore está vacío pero ya hay datos locales
  // (semilla de Iglesia/Banda), se sube esa semilla en vez de borrarla. ──
  const seedHechoRef = useRef(false);
  useEffect(()=>{
    if(!firebaseListo || appMode===null || !online) return;
    seedHechoRef.current = false;
    const unsubEv = subscribeEventos(accountId, data=>{
      if(data.length===0 && !seedHechoRef.current && eventos.length>0){
        eventos.forEach(ev=>guardarEvento(accountId, ev));
      } else {
        setEventos(data);
      }
      seedHechoRef.current = true;
    });
    const unsubPe = subscribePersonas(accountId, data=>{
      if(data.length===0 && personas.length>0){
        personas.forEach(p=>guardarPersona(accountId, p));
      } else if(data.length>0){
        setPersonas(data);
      }
    });
    const unsubEq = subscribeEquipos(accountId, data=>{
      if(data.length===0 && equipos.length>0){
        equipos.forEach(eq=>guardarEquipo(accountId, eq));
      } else if(data.length>0){
        setEquipos(data);
      }
    });
    return ()=>{ unsubEv(); unsubPe(); unsubEq(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, online]);

  const persistirPersona = (persona) => { if(firebaseListo && online) guardarPersona(accountId, persona); };
  const persistirEvento = (evento) => { if(firebaseListo && online) guardarEvento(accountId, evento); };
  const persistirEquipo = (equipo) => { if(firebaseListo && online) guardarEquipo(accountId, equipo); };

  const [songViewSongs,setSongViewSongs]=useState(null);
  const [songView,setSongView]=useState(null);
  const [mesNav,setMesNav]=useState(6); // Julio (mes 6, 0-indexed) donde están los datos demo
  const [activeSunday,setActiveSunday]=useState(()=>Object.keys(SETLISTS).filter(d=>SETLISTS[d]!==null).map(Number).sort((a,b)=>a-b)[0]||Object.keys(SETLISTS).map(Number)[0]||1);
  const contentDB = appMode==='banda'?SONG_CONTENT_BANDA:SONG_CONTENT_IGLESIA;

  const showToast=(msg)=>{setToast(typeof msg==='string'?{text:msg}:msg);setTimeout(()=>setToast(null),2500);};

  // Domingo activo para MiEvento: el primero con setlist cargado, en vez de
  // un número fijo hardcodeado (pendiente anotado en la entrega anterior).
  // proximoDomingo ya no hace falta — activeSunday cumple ese rol como estado real

  // ── Apertura de SongView: cualquier pantalla puede abrirlo pasando el
  // array de canciones de su contexto (repertorio completo o setlist de
  // un evento puntual) — ya no depende de un "activeSunday" fijo global ──
  const abrirSongDesdeRepertorio=(name)=>{
    const fuente = appMode==='banda'?repertorio:CANCIONES; // CANCIONES se muta en vivo desde Cancionero.jsx
    const songs=fuente.map(c=>({name:c.n,key:c.key,bpm:c.bpm}));
    const idx=songs.findIndex(s=>s.name===name);
    if(idx>=0){setSongViewSongs(songs);setSongView(idx);}
  };
  const abrirSongDesdeEvento=(idx,setlist)=>{
    if(setlist&&setlist.length){setSongViewSongs(setlist);setSongView(idx);}
  };
  const handleSaveChords=(name,content)=>{contentDB[name]=content;showToast('✓ Acordes guardados');};

  // ── Guardar setlist en un evento (persiste en Firestore si está disponible) ──
  const guardarSetlistEnEvento=(eventoId, nuevoSetlist)=>{
    setEventos(prev=>prev.map(ev=>{
      if(ev.id!==eventoId) return ev;
      const updated={...ev, setlist:nuevoSetlist};
      persistirEvento(updated);
      return updated;
    }));
    showToast({text:'Setlist guardado',sub:`${nuevoSetlist.length} canciones`});
  };

  // Temas: dark es el default desde :root en theme.css
  // gray y cream usan [data-theme] selector en theme.css
  const dataTheme = theme==='dark' ? undefined : theme;

  const Footer=()=>(
    <div style={{padding:'32px 24px 20px',borderTop:'1px solid rgba(255,255,255,.04)',display:'flex',flexDirection:'column',alignItems:'center',gap:12,opacity:.35,userSelect:'none'}}>
      <img src="/LOGO BLANCO VERTICAL.png" alt="SetSync" style={{width:56,height:'auto',objectFit:'contain',filter:'grayscale(1)'}}/>
      <div style={{fontSize:9,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,color:'var(--tx3)',textAlign:'center',lineHeight:1.8,letterSpacing:'.5px'}}>
        © {new Date().getFullYear()} SetSync · {tx.allRights}
      </div>
      <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,letterSpacing:'1.5px',textTransform:'uppercase',marginTop:2}}>
        by <span style={{fontWeight:500}}>Agencia Fearless</span>
      </div>
    </div>
  );

  // ── Navegación — misma para ambos modos, etiquetas vía vx ────────────
  const BNS=[
    {id:'inicio',     label:lang==='en'?'Home':'Inicio'},
    {id:'fechas',     label:lang==='en'?'Dates':'Fechas'},
    {id:'misetlist',  label:lang==='en'?'Next date':'Próx. Fecha'},
    {id:'repertorio', label:vx.repertorioTab},
    {id:'backstage',  label:'Backstage'},
  ];
  const NavIco=({id,active})=>{
    const s={viewBox:"0 0 24 24",width:20,height:20,fill:"none",stroke:active?"var(--ac)":"var(--tx3)",strokeWidth:1.5,strokeLinecap:"round",strokeLinejoin:"round"};
    if(id==='fechas')return(<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(id==='repertorio')return(<svg {...s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(id==='equipos')return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(id==='premiere')return(<svg {...s}><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>);
    if(id==='inicio')return(<svg {...s}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
    if(id==='misetlist')return(<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><polyline points="9 16 11 18 15 13.5"/></svg>);
    if(id==='monitoreo')return(<svg {...s}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>);
    if(id==='backstage')return(<svg {...s}><line x1="5" y1="3" x2="5" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><rect x="3" y="7" width="4" height="3.5" rx="1.5"/><rect x="10" y="13" width="4" height="3.5" rx="1.5"/><rect x="17" y="5" width="4" height="3.5" rx="1.5"/></svg>);
    return null;
  };

  // ── Pantalla de bienvenida: idioma + modo (una sola vez, sin vuelta atrás) ──
  if(appMode===null){
    const T={
      es:{choose:'Elige tu modo de uso',forever:'Esta elección define el modo permanente de tu cuenta. No se puede cambiar entre modos una vez elegido.',
        iglesia:{title:'Iglesia',sub:'Cultos · Setlists · Equipos de alabanza'},banda:{title:'Banda',sub:'Gigs · Repertorio · Equipo técnico · Rider'}},
      en:{choose:'Choose your mode',forever:'This permanently defines your account mode. You cannot switch between modes once chosen.',
        iglesia:{title:'Church',sub:'Services · Setlists · Worship Teams'},banda:{title:'Band',sub:'Gigs · Repertoire · Technical crew · Rider'}},
    };
    const t=T[lang]||T.es;
    return(
      <div style={{minHeight:'100vh',background:'#13141a',display:'flex',flexDirection:'column',alignItems:'center',fontFamily:"'Lexend Giga',sans-serif",overflowY:'auto'}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&display=swap');`}</style>
        <div style={{paddingTop:64,paddingBottom:32,display:'flex',flexDirection:'column',alignItems:'center'}}>
          <img src="/LOGO BLANCO VERTICAL.png" alt="SetSync" style={{width:160,height:'auto',objectFit:'contain'}}/>
        </div>
        <div style={{marginBottom:32,display:'inline-flex',gap:0,borderRadius:20,border:'1px solid rgba(255,255,255,.08)',overflow:'hidden'}}>
          {['es','en'].map(l=>(
            <button key={l} onClick={()=>setLang(l)}
              style={{padding:'7px 20px',border:'none',cursor:'pointer',background:lang===l?'rgba(255,255,255,.1)':'transparent',
                color:lang===l?'#f3f1ed':'rgba(255,255,255,.3)',fontSize:12,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",
                textTransform:'uppercase',letterSpacing:'1px'}}>
              {l==='es'?'ES':'EN'}
            </button>
          ))}
        </div>
        <div style={{textAlign:'center',marginBottom:20,padding:'0 24px'}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:18,color:'#f3f1ed',marginBottom:6}}>{t.choose}</div>
          <div style={{fontSize:11,color:'#6b6f77',lineHeight:1.6,maxWidth:300,margin:'0 auto'}}>{t.forever}</div>
        </div>
        <div style={{width:'100%',maxWidth:400,padding:'0 20px 60px'}}>
          {[{id:'iglesia',data:t.iglesia},{id:'banda',data:t.banda}].map(item=>(
            <button key={item.id} onClick={()=>setAppMode(item.id)}
              style={{width:'100%',padding:'18px 20px',marginBottom:10,borderRadius:16,display:'flex',alignItems:'center',gap:16,
                border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.03)',cursor:'pointer',textAlign:'left'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:'#ffffff',marginBottom:3}}>{item.data.title}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.4)',lineHeight:1.4,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>{item.data.sub}</div>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" style={{flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Plataforma única — mismo árbol para Iglesia y Banda ───────────────
  return(
    <div data-theme={dataTheme}>
      <div className="bg-fx"/>
      <nav className={`sb${sbCol?' col':''}`}>
        <div className="sb-top">
          {sbCol
            ?<div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <img src="/FAVICON SS.png" alt="SS" style={{width:44,height:44,objectFit:'contain',margin:'0 auto'}}/>
              <button className="sb-btn" onClick={()=>setSbCol(c=>!c)} style={{position:'absolute',right:6,top:10}}>
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>
            :<div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
              <img src="/LOGO horiz blanco.png" alt="SetSync" style={{height:36,objectFit:'contain',flex:1,maxWidth:'calc(100% - 36px)'}}/>
              <button className="sb-btn" onClick={()=>setSbCol(c=>!c)} style={{flexShrink:0,width:26,height:26}}>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          }
        </div>
        <div className="sb-nav">
          {BNS.map(n=>(
            <div key={n.id} className={`ni${view===n.id?' on':''}`} onClick={()=>setView(n.id)}>
              <div className="ni-ic"><NavIco id={n.id} active={view===n.id}/></div>
              <span className="ni-lb">{n.label}</span>
              {view===n.id&&<div className="ni-dot"/>}
            </div>
          ))}
        </div>
        <div className="sb-foot">
          <div className="u-chip">
            <div className="u-av">DM</div>
            <div className="u-inf">
              <div className="u-name">Danny</div>
              <div style={{fontSize:9,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",opacity:.7}}>Super Admin</div>
            </div>
          </div>
        </div>
      </nav>

      <main className={`main${sbCol?' col':''}`}>
        <div className="pw">
          {view==='inicio'&&(
            <Inicio mode={appMode} lang={lang} userRole={userRole}
              equipos={equipos} personas={personas} eventos={eventos}
              planActivo={planActivo} planId={planId}
              tienePremiere={tienePremiere} tieneMonitoreo={tieneMonitoreo}
              onNavigate={setView}/>
          )}
          {view==='fechas'&&<AdminView mode={appMode} activeSunday={activeSunday} userRole={userRole}
            onLive={()=>{const sl=SETLISTS[activeSunday]||[];if(sl.length>0){setSongViewSongs(sl);setSongView(0);}}}
            onToast={showToast} onSelectDay={(day,mes)=>{setActiveSunday(day);if(mes!==undefined)setMesNav(mes);}} mesNav={mesNav} lang={lang}
            eventos={eventos} onOpenSong={abrirSongDesdeEvento} equipos={equipos}/>}
          {view==='misetlist'&&<MiSetlist activeSunday={activeSunday} onOpenSong={i=>{setSongViewSongs(SETLISTS[activeSunday]||[]);setSongView(i);}} onLive={()=>setSongView(0)} userRole={userRole} onToast={showToast} lang={lang} equipos={equipos}/>}
          {view==='repertorio'&&<Cancionero mode={appMode} onOpenSong={abrirSongDesdeRepertorio} userRole={userRole} lang={lang} onToast={showToast} onSaveChords={handleSaveChords}/>}
          {view==='premiere'&&(tienePremiere?<PremiereView onToast={showToast}/>:<div style={{padding:24,textAlign:'center',color:'var(--tx3)',fontSize:13,fontFamily:"'Lexend Giga',sans-serif"}}>{mensajeUpgrade('premiereExclusivas',lang)}</div>)}
          {view==='monitoreo'&&<Monitoreo lang={lang} onToast={showToast}/>}
          {view==='backstage'&&<BackstageView userRole={userRole} onToast={showToast} mode={appMode}
            onSetTheme={setTheme} onGetTheme={()=>theme} eventos={eventos} setEventos={setEventos} lang={lang}
            equipos={equipos} setEquipos={setEquipos} persistirEquipo={persistirEquipo} persistirEvento={persistirEvento}
            guardarSetlistEnEvento={guardarSetlistEnEvento}
            online={online} setOnline={setOnline} firebaseListo={firebaseListo}
            planId={planId} setPlanId={setPlanId} planActivo={planActivo}
            tienePremiere={tienePremiere} tieneMonitoreo={tieneMonitoreo}
            onNavigate={setView}/>}
          <Footer/>
        </div>
      </main>

      <nav className="bot">
        {BNS.map(n=>(
          <div key={n.id} className={`bn${view===n.id?' on':''}`} onClick={()=>setView(n.id)}>
            <NavIco id={n.id} active={view===n.id}/><span className="bn-lb">{n.label}</span>
          </div>
        ))}
      </nav>

      {songView!==null&&songViewSongs&&songViewSongs.length>0&&(
        <>
          <SongView songs={songViewSongs} startIdx={songView} onClose={()=>{setSongView(null);setSongViewSongs(null);}}
            theme={theme} isAdmin={isAdmin} onSaveChords={handleSaveChords} contentDB={contentDB} lang={lang}
            sidebarVisible={false} sidebarCollapsed={sbCol}/>
          {(tienePads||tieneClick||tieneMultitracks)&&(
            <div style={{position:'fixed',bottom:80,right:16,zIndex:60,width:240,display:'flex',flexDirection:'column',gap:8}}>
              {mostrarMultitracks&&tieneMultitracks&&(
                <Multitracks tracks={[]} lang={lang} onToast={showToast}/>
              )}
              {tienePads&&<Pads songKey={songViewSongs[songView]?.key} lang={lang}/>}
              {tieneClick&&<Click songBpm={songViewSongs[songView]?.bpm} lang={lang}/>}
              {tieneMultitracks&&(
                <button onClick={()=>setMostrarMultitracks(v=>!v)}
                  style={{padding:'7px 10px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',
                    color:'var(--tx3)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                  {mostrarMultitracks?(lang==='en'?'Hide tracks':'Ocultar pistas'):(lang==='en'?'Show tracks':'Ver pistas')}
                </button>
              )}
            </div>
          )}
        </>
      )}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}
