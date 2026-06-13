// App: componente raíz. Maneja selección de modo (Iglesia/Banda), navegación,
// temas visuales y orquesta las vistas principales del modo Iglesia.
import { useState, useCallback } from 'react';
import { MODES, SETLISTS, EVENTOS_ESPECIALES } from '../data/constants';
import { SONG_CONTENT_IGLESIA } from '../data/songs-iglesia';
import '../styles/theme.css';
import { Toast } from './common';
import { SongView } from './SongView';
import { Rehearsal } from './Rehearsal';
import { AdminView, MiSetlist, PremiereView } from './AdminView';
import { Cancionero } from './Cancionero';
import { EquiposView } from './EquiposView';
import { BackstageView } from './BackstageView';
import { BandaApp } from './banda/BandaApp';

export default function App(){
  const [appMode,setAppMode]=useState(null); // null | 'iglesia' | 'banda' | 'academia'
  const [onboarded,setOnboarded]=useState(false);
  const [lang,setLang]=useState('es');
  const [mode,setMode]=useState('worship');
  const [view,setView]=useState('admin');
  const [sbCol,setSbCol]=useState(false);
  const [songView,setSongView]=useState(null);
  const [rehearsal,setRehearsal]=useState(false);
  const [toast,setToast]=useState(null);
  const [theme,setTheme]=useState('dark');
  const [eventos,setEventos]=useState([]);
  const [userRole]=useState('superadmin');
  const isAdmin=userRole==='superadmin';
  const isPastor=userRole==='pastor'||isAdmin;
  const [pastorData,setPastorData]=useState({});
  const handleSaveChords=(name,content)=>{
    SONG_CONTENT_IGLESIA[name]=content;
    showToast('✓ Acordes guardados');
  };
  const [activeSunday,setActiveSunday]=useState(7);
  const [mesNav,setMesNav]=useState(new Date().getMonth());

  // Temas aplicados via CSS variables inline — funciona en sandbox/artifact
  const THEMES={
    // ── OSCURO — fondo casi negro, dorado cálido, alto contraste ──
    dark:{
      bg:'#07070f',s1:'rgba(255,255,255,.06)',s2:'rgba(255,255,255,.03)',s3:'rgba(255,255,255,.1)',
      bd:'rgba(255,255,255,.1)',bd2:'rgba(255,255,255,.2)',
      ac:'#c8a97e',tx:'#ede9ff',tx2:'#9e9ab6',tx3:'#5a566e',
      gn:'#5ecea0',rd:'#ff5252',
    },
    // ── GRIS — carbón oscuro con naranja quemado ──
    gray:{
      bg:'#22232a',s1:'rgba(255,255,255,.08)',s2:'rgba(255,255,255,.04)',s3:'rgba(255,255,255,.13)',
      bd:'rgba(255,255,255,.13)',bd2:'rgba(255,255,255,.24)',
      ac:'#e07820',tx:'#f2ede6',tx2:'#b0a898',tx3:'#6a6258',
      gn:'#5ecea0',rd:'#ff5252',
    },
    // ── CLARO — blanco hueso con contraste fuerte. Texto casi negro ──
    cream:{
      bg:'#EDE8DC',
      s1:'rgba(0,0,0,.07)',s2:'rgba(0,0,0,.04)',s3:'rgba(0,0,0,.12)',
      bd:'rgba(0,0,0,.18)',bd2:'rgba(0,0,0,.32)',
      ac:'#D4500A',   // naranja fuerte — botones, highlights, mes activo
      tx:'#1a1208',   // casi negro
      tx2:'#3a2010',  // marrón oscuro
      tx3:'#7a5a3a',  // marrón medio
      gn:'#0d7a35',rd:'#c44010',
    },
    // ── BUBBLEGUM POP — fondo oscuro teal profundo, rosa neón + cyan ──
    bubblegum:{
      bg:'#0d1f1f',s1:'rgba(255,105,180,.1)',s2:'rgba(255,105,180,.05)',s3:'rgba(255,105,180,.17)',
      bd:'rgba(255,105,180,.25)',bd2:'rgba(255,105,180,.45)',
      ac:'#FF69B4',tx:'#f0faff',tx2:'#a0d8d8',tx3:'#069494',
      gn:'#00F0FF',rd:'#ff4488',
    },
    // ── VERDE OLIVA · MOCHA · NARANJA FUERTE — oscuro terroso con punch ──
    oliva:{
      bg:'#111a0a',s1:'rgba(232,103,10,.12)',s2:'rgba(232,103,10,.06)',s3:'rgba(232,103,10,.2)',
      bd:'rgba(143,186,48,.2)',bd2:'rgba(143,186,48,.38)',
      ac:'#E8670A',tx:'#f5f0d8',tx2:'#c8b878',tx3:'#6a8a3a',
      gn:'#8fba30',rd:'#e03020',
    },
  };
  const t=THEMES[theme]||THEMES.dark;
  const themeStyle={
    '--bg':t.bg,'--s1':t.s1,'--s2':t.s2,'--s3':t.s3,
    '--bd':t.bd,'--bd2':t.bd2,'--ac':t.ac,'--tx':t.tx,'--tx2':t.tx2,'--tx3':t.tx3,
    '--gn':t.gn,'--rd':t.rd,
    background:t.bg,color:t.tx,minHeight:'100vh',
  };

  const showToast=useCallback(msg=>{setToast(msg);setTimeout(()=>setToast(null),3200);},[]);

  const handleFinish=(l,m)=>{
    setLang(l);setMode(m);
    
    setOnboarded(true);
  };

  const modeData=MODES[mode]||MODES.worship;
  const activeSl=SETLISTS[activeSunday]||[];

  // Onboarding antiguo desactivado — reemplazado por ModeSelector

  const MESES=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const mesActual=new Date().getMonth();

  const BNS=[
    {id:'admin',label:'Resumen'},
    {id:'misetlist',label:'Próx Fecha'},
    {id:'cancionero',label:'Cancionero'},
    {id:'equipos',label:'Equipos'},
    {id:'backstage',label:'Backstage'},
  ];
  const NavIco=({id,active})=>{
    const s={viewBox:"0 0 24 24",width:20,height:20,fill:"none",stroke:active?"var(--ac)":"var(--tx3)",strokeWidth:1.5,strokeLinecap:"round",strokeLinejoin:"round"};
    if(id==='admin')return(<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(id==='misetlist')return(<svg {...s}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>);
    if(id==='cancionero')return(<svg {...s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(id==='equipos')return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(id==='equipos')return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(id==='equipos')return(<svg viewBox='0 0 24 24' width={20} height={20} fill='none' stroke={active?'var(--ac)':'var(--tx3)'} strokeWidth={1.5}><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/></svg>);
    if(id==='equipos')return(<svg {...s}><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/></svg>);
    if(id==='backstage')return(<svg {...s}><line x1="5" y1="3" x2="5" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><rect x="3" y="7" width="4" height="3.5" rx="1.5"/><rect x="10" y="13" width="4" height="3.5" rx="1.5"/><rect x="17" y="5" width="4" height="3.5" rx="1.5"/></svg>);
    return null;
  };

  // ── Pantalla de bienvenida: idioma + modo (una sola vez, sin vuelta atrás) ──
  if(appMode===null){
    const T={
      es:{
        welcome:'Bienvenido a',
        choose:'Elige tu modo de uso',
        forever:'Esta elección define el modo permanente de tu cuenta. No se puede cambiar entre modos una vez elegido.',
        lang:'Idioma / Language',
        iglesia:{title:'Iglesia',sub:'Cultos · Setlists · Equipos de alabanza · Rol de Pastor'},
        banda:{title:'Banda',sub:'Gigs · Repertorio · Equipo técnico · Rider'},
        academia:{title:'Academia',sub:'Clases · Partituras · Alumnos · Evaluaciones'},
        soon:'Próximamente',
        enter:'Entrar',
      },
      en:{
        welcome:'Welcome to',
        choose:'Choose your mode',
        forever:'This permanently defines your account mode. You cannot switch between modes once chosen.',
        lang:'Language / Idioma',
        iglesia:{title:'Church',sub:'Services · Setlists · Worship Teams · Pastor role'},
        banda:{title:'Band',sub:'Gigs · Repertoire · Technical crew · Rider'},
        academia:{title:'Academy',sub:'Classes · Sheet music · Students · Assessments'},
        soon:'Coming soon',
        enter:'Enter',
      },
    };
    const t=T[lang]||T.es;

    return(
      <div style={{
        minHeight:'100vh',background:'#07070f',
        display:'flex',flexDirection:'column',
        fontFamily:"'Lato',sans-serif",
        overflowY:'auto',
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&family=Lato:wght@400;700;900&display=swap');`}</style>
        <div style={{padding:'48px 24px 24px',textAlign:'center'}}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#c8a97e" strokeWidth="1.5" style={{marginBottom:10}}>
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",
            fontSize:26,color:'#ede9ff',letterSpacing:'2px'}}>
            SETSYNC
          </div>
        </div>
        <div style={{padding:'0 24px 24px',textAlign:'center'}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,.3)',fontWeight:700,
            textTransform:'uppercase',letterSpacing:'2px',marginBottom:8}}>
            {t.lang}
          </div>
          <div style={{display:'inline-flex',gap:0,borderRadius:20,
            border:'1px solid rgba(255,255,255,.1)',overflow:'hidden'}}>
            {['es','en'].map(l=>(
              <button key={l} onClick={()=>setLang(l)}
                style={{padding:'6px 18px',border:'none',cursor:'pointer',
                  background:lang===l?'rgba(200,169,126,.2)':'transparent',
                  color:lang===l?'#c8a97e':'rgba(255,255,255,.3)',
                  fontSize:12,fontWeight:700,fontFamily:"'Lato',sans-serif",
                  textTransform:'uppercase',letterSpacing:'1px',
                  transition:'all .2s'}}>
                {l==='es'?'Español':'English'}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:'0 24px 8px',textAlign:'center'}}>
          <div style={{fontSize:17,fontWeight:900,color:'#ede9ff',marginBottom:6}}>
            {t.choose}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.35)',lineHeight:1.5,
            maxWidth:320,margin:'0 auto',fontWeight:400}}>
            {t.forever}
          </div>
        </div>
        <div style={{padding:'16px 20px 48px'}}>
          {[
            {id:'iglesia', data:t.iglesia, icon:'church'},
            {id:'banda',   data:t.banda,   icon:'music'},
            {id:'academia',data:t.academia,icon:'school', disabled:true},
          ].map(item=>(
            <button key={item.id}
              onClick={()=>!item.disabled&&(setAppMode(item.id),setOnboarded(true))}
              style={{
                width:'100%',padding:'18px 20px',marginBottom:10,
                borderRadius:16,display:'flex',alignItems:'center',gap:16,
                border:`1px solid ${item.disabled?'rgba(255,255,255,.05)':'rgba(200,169,126,.2)'}`,
                background:item.disabled?'rgba(255,255,255,.01)':'rgba(200,169,126,.04)',
                cursor:item.disabled?'not-allowed':'pointer',
                opacity:item.disabled?.35:1,
                textAlign:'left',transition:'all .2s',
              }}>
              <div style={{
                width:44,height:44,borderRadius:12,flexShrink:0,
                background:item.disabled?'rgba(255,255,255,.03)':'rgba(200,169,126,.08)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                {item.icon==='church'&&(
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                    stroke={item.disabled?'rgba(255,255,255,.2)':'#c8a97e'} strokeWidth="1.5">
                    <path d="M18 22H6a2 2 0 0 1-2-2V7l4-4h8l4 4v13a2 2 0 0 1-2 2z"/>
                    <line x1="12" y1="2" x2="12" y2="7"/>
                    <line x1="9" y1="11" x2="15" y2="11"/>
                  </svg>
                )}
                {item.icon==='music'&&(
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                    stroke={item.disabled?'rgba(255,255,255,.2)':'#c8a97e'} strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                )}
                {item.icon==='school'&&(
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                    stroke="rgba(255,255,255,.2)" strokeWidth="1.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontSize:16,fontWeight:900,
                    color:item.disabled?'rgba(255,255,255,.2)':'#ede9ff'}}>
                    {item.data.title}
                  </span>
                  {item.disabled&&(
                    <span style={{fontSize:9,fontWeight:700,
                      color:'rgba(255,255,255,.2)',letterSpacing:'1px',
                      textTransform:'uppercase'}}>
                      {t.soon}
                    </span>
                  )}
                </div>
                <div style={{fontSize:11,color:item.disabled?'rgba(255,255,255,.12)':'rgba(255,255,255,.4)',
                  lineHeight:1.4,fontWeight:400}}>
                  {item.data.sub}
                </div>
              </div>
              {!item.disabled&&(
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                  stroke="rgba(200,169,126,.4)" strokeWidth="2" style={{flexShrink:0}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

    // ── Modo Banda — completamente separado ────────────────────────────────────
  if(appMode==='banda'){
    return(
      <div style={{minHeight:'100vh',background:'#07070f',color:'#ede9ff',fontFamily:"'Lato',sans-serif"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&family=Lato:wght@400;700;900&display=swap');`}</style>
        <BandaApp onBack={()=>setAppMode(null)} userRole={userRole} themeStyle={themeStyle}/>
      </div>
    );
  }

  return(
    <div style={themeStyle}>
      <div className="bg-fx"/>
      <nav className={`sb${sbCol?' col':''}`}>
        <div className="sb-top">
          <div className="logo-mk"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
          <div className="logo-txt"><h1>Setlist</h1><span>{modeData.tagline}</span></div>
          <div className="sb-r">
            <button className="sb-btn" onClick={()=>setSbCol(c=>!c)}>
              {sbCol?<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>:<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            </button>
          </div>
        </div>
        <div className="sb-foot">
          <div className="u-chip">
            <div className="u-av">DM</div>
            <div className="u-inf">
              <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>Danny</div>
              <div style={{fontSize:9,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700}}>Super Admin</div>
            </div>
          </div>
        </div>
      </nav>

      <main className={`main${sbCol?' col':''}`}>
        <div style={{display:'flex',overflowX:'hidden',gap:0,padding:'0',scrollbarWidth:'none',background:'rgba(8,7,14,.28)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',boxShadow:'inset 0 -1px 0 rgba(255,255,255,.06)',isolation:'isolate',position:'sticky',top:0,zIndex:40}}>
          {MESES.map((m,i)=>(
            <div key={m} onClick={()=>{setMesNav(i);setView('admin');}} style={{flex:1,padding:'5px 2px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,margin:'3px 1px',borderRadius:5,border:'1px solid transparent',background:mesNav===i?'rgba(200,169,126,.12)':i===mesActual?'rgba(200,169,126,.07)':'transparent',transition:'all .15s',minWidth:0}}>
              <span style={{fontSize:8,fontWeight:mesNav===i?700:i===mesActual?600:400,color:mesNav===i?'var(--ac)':i===mesActual?'rgba(200,169,126,.65)':'var(--tx3)',textTransform:'uppercase',letterSpacing:'.3px'}}>{m}</span>
              {(()=>{
                const evCount=(i===new Date().getMonth()?Object.values(SETLISTS).filter(v=>v!==null).length:0)+EVENTOS_ESPECIALES.filter(e=>e.mes===i+1).length;
                if(i===mesActual)return(<span style={{fontSize:12,fontWeight:700,color:mesNav===i?'var(--ac)':'rgba(200,169,126,.5)',lineHeight:1.1}}>{new Date().getDate()}</span>);
                return evCount>0?(<span style={{fontSize:8,fontWeight:700,color:mesNav===i?'var(--ac)':'rgba(255,255,255,.22)',lineHeight:1}}>{evCount}</span>):null;
              })()}
            </div>
          ))}
        </div>
        <div className="pw">
          {view==='admin'&&<AdminView mode={mode} activeSunday={activeSunday} userRole={userRole} onRehearsal={()=>setRehearsal(true)} onToast={showToast} onSelectDay={day=>{setActiveSunday(day);setView('misetlist');}} mesNav={mesNav}/>}
          {view==='cancionero'&&<Cancionero mode={mode} onOpenSong={(name)=>{const sl=activeSl;const idx=sl.findIndex(s=>s.name===name);if(idx>=0)setSongView(idx);}} />}
          {view==='equipos'&&<EquiposView onToast={showToast} onGestionar={()=>{setView('backstage');}}/>}
          {view==='premiere'&&<PremiereView onToast={showToast}/>}
          {view==='equipos'&&<EquiposView onToast={showToast} onGestionar={()=>setView('backstage')}/>}
          {view==='backstage'&&<BackstageView userRole={userRole} onToast={showToast} pastorData={pastorData} setPastorData={setPastorData} eventos={eventos} setEventos={setEventos} pastorData={pastorData} setPastorData={setPastorData} eventos={eventos} setEventos={setEventos} mode={mode} onSetTheme={setTheme} onGetTheme={()=>theme}/>}
          {view==='misetlist'&&<MiSetlist activeSunday={activeSunday} onOpenSong={i=>setSongView(i)} onLive={()=>setRehearsal(true)} userRole={userRole} onToast={showToast}/>}
        </div>
      </main>

      <nav className="bot">
        {BNS.map(n=>(
          <div key={n.id} className={`bn${view===n.id?' on':''}`} onClick={()=>setView(n.id)}>
            <NavIco id={n.id} active={view===n.id}/><span className="bn-lb">{n.label}</span>
          </div>
        ))}
      </nav>

      {songView!==null&&activeSl.length>0&&(
        <SongView songs={activeSl} startIdx={songView} onClose={()=>setSongView(null)} theme={theme} isAdmin={isAdmin} onSaveChords={(name,content)=>handleSaveChords(name,content)}/>
      )}
      {rehearsal&&activeSl.length>0&&(
        <Rehearsal songs={activeSl} onClose={()=>setRehearsal(false)} onToast={showToast}/>
      )}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}
