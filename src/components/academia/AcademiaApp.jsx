// AcademiaApp: shell principal del modo Academia (navegación, grupos, SongView)
// Mismo patrón que BandaApp.jsx — el alumno NO tiene una app separada, usa el
// mismo SongView con permisos reducidos según el nivel configurado en su grupo.
import { useState } from 'react';
import { SONG_CONTENT_BANDA } from '../../data/songs-banda';
import { Toast } from '../common';
import { SongView } from '../SongView';
import { AcademiaFechas } from './AcademiaFechas';
import { AcademiaRepertorio } from './AcademiaRepertorio';
import { AcademiaBackstage } from './AcademiaBackstage';
import { AcademiaGrupos } from './AcademiaGrupos';
import { t as getT } from '../../i18n';

// ── Permisos por defecto de un nivel nuevo ───────────────────────────────
// Todo arranca en false excepto lo mínimo (ver letra/partitura, que nunca es
// opcional). El profesor activa el resto desde AcademiaGrupos.
export const PERMISOS_DEFAULT={
  verAcordes:false,
  estructuraVisible:false,
  estructuraEditable:false,
  modoNashville:false,
  modoPractica:false,
  anotacionesPropias:false,
  autoScroll:false,
};

export function AcademiaApp({onBack,userRole='superadmin',themeStyle={},lang='es'}){
  const tx=getT(lang);
  const [view,setView]=useState('backstage');
  const [toast,setToast]=useState(null);
  const [songViewIdx,setSongViewIdx]=useState(null);
  const [songViewPermisos,setSongViewPermisos]=useState(null); // null = profesor, ve todo
  const isProfesor=userRole==='profesor'||userRole==='superadmin';

  const showToast=(msg)=>{setToast(typeof msg==='string'?{text:msg}:msg);setTimeout(()=>setToast(null),2500);};

  // ── Estado global ─────────────────────────────────────────────────────────
  const [alumnos,setAlumnos]=useState([
    {id:1,nombre:'Martina Soto',  email:'martina@example.com',estado:'activo'},
    {id:2,nombre:'Joaquín Pérez', email:'joaquin@example.com', estado:'activo'},
    {id:3,nombre:'Valeria Muñoz', email:'valeria@example.com', estado:'invitado'},
  ]);

  const [grupos,setGrupos]=useState([
    {id:'g1',nombre:'Guitarra Niños Sábado',alumnos:[1,2],
      niveles:[
        {id:'n1',nombre:'Básico',permisos:{...PERMISOS_DEFAULT}},
        {id:'n2',nombre:'Intermedio',permisos:{...PERMISOS_DEFAULT,verAcordes:true,estructuraVisible:true,modoPractica:true,autoScroll:true}},
        {id:'n3',nombre:'Avanzado',permisos:{verAcordes:true,estructuraVisible:true,estructuraEditable:true,modoNashville:true,modoPractica:true,anotacionesPropias:true,autoScroll:true}},
      ],
      nivelActivo:'n1'},
    {id:'g2',nombre:'Avanzados Jueves',alumnos:[3],
      niveles:[
        {id:'n1',nombre:'Básico',permisos:{...PERMISOS_DEFAULT}},
        {id:'n2',nombre:'Intermedio',permisos:{...PERMISOS_DEFAULT,verAcordes:true,estructuraVisible:true,modoPractica:true,autoScroll:true}},
        {id:'n3',nombre:'Avanzado',permisos:{verAcordes:true,estructuraVisible:true,estructuraEditable:true,modoNashville:true,modoPractica:true,anotacionesPropias:true,autoScroll:true}},
      ],
      nivelActivo:'n3'},
  ]);

  const [clases,setClases]=useState([
    {id:1,nombre:'Clase de Guitarra — Acordes Básicos',fecha:'2026-07-08',lugar:'Sala 2',grupoId:'g1',
      setlist:['NOCHE SIN FIN','MAR ADENTRO'],
      evaluaciones:[],
      notas:'Repasar cambio de acordes Mi-La-Re.'},
    {id:2,nombre:'Repertorio Avanzado',fecha:'2026-07-10',lugar:'Sala 1',grupoId:'g2',
      setlist:['FUEGO CRUZADO','CIUDAD DE VIDRIO','TIERRA ROJA'],
      evaluaciones:[],
      notas:''},
  ]);

  const [repertorio,setRepertorio]=useState([
    {n:'NOCHE SIN FIN',    key:'Am',bpm:74,artista:'Los Viajeros del Viento',tipo:'original'},
    {n:'FUEGO CRUZADO',    key:'Em',bpm:92,artista:'Tormenta Eléctrica',     tipo:'original'},
    {n:'MAR ADENTRO',      key:'D', bpm:68,artista:'Coral y Sal',            tipo:'original'},
    {n:'CIUDAD DE VIDRIO', key:'Dm',bpm:80,artista:'Proyecto Espejo',        tipo:'original'},
    {n:'TIERRA ROJA',      key:'G', bpm:76,artista:'Los Hijos del Norte',    tipo:'original'},
  ]);

  const [colecciones,setColecciones]=useState([
    {id:'col1',nombre:'Para Guitarra',tipo:'instrumento',canciones:['NOCHE SIN FIN','MAR ADENTRO']},
    {id:'col2',nombre:'Repertorio Avanzado',tipo:'album',canciones:['FUEGO CRUZADO','CIUDAD DE VIDRIO','TIERRA ROJA']},
  ]);

  // ── Abrir SongView con permisos del grupo del alumno (o sin permisos = todo
  // visible, cuando lo abre el profesor) ───────────────────────────────────
  const abrirSongViewComoAlumno=(songIdx,grupoId)=>{
    const grupo=grupos.find(g=>g.id===grupoId);
    const nivel=grupo?.niveles.find(n=>n.id===grupo.nivelActivo);
    setSongViewPermisos(nivel?.permisos||null);
    setSongViewIdx(songIdx);
  };
  const abrirSongViewComoProfesor=(songIdx)=>{
    setSongViewPermisos(null);
    setSongViewIdx(songIdx);
  };

  // ── Footer (igual que modo Iglesia/Banda) ────────────────────────────────
  const Footer=()=>(
    <div style={{padding:'32px 24px 20px',borderTop:'1px solid rgba(255,255,255,.04)',display:'flex',flexDirection:'column',alignItems:'center',gap:12,opacity:.35,userSelect:'none'}}>
      <img src="/LOGO BLANCO VERTICAL.png" alt="SetSync" style={{width:56,height:'auto',objectFit:'contain',filter:'grayscale(1)'}}/>
      <div style={{fontSize:9,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,color:'var(--tx3)',textAlign:'center',lineHeight:1.8,letterSpacing:'.5px'}}>
        © {new Date().getFullYear()} SetSync · {tx.allRights}
      </div>
      <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center'}}>
        {[
          {label:tx.privacy, href:'/privacy'},
          {label:tx.terms,   href:'/terms'},
          {label:tx.cookies, href:'/cookies'},
        ].map(({label,href})=>(
          <a key={href} href={href} style={{fontSize:9,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,color:'var(--tx3)',textDecoration:'none',letterSpacing:'.5px'}}>
            {label}
          </a>
        ))}
      </div>
      <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,letterSpacing:'1.5px',textTransform:'uppercase',marginTop:2}}>
        by <span style={{fontWeight:500}}>Agencia Fearless</span>
      </div>
    </div>
  );

  const TABS=[
    {id:'backstage',  label:tx.backstage},
    {id:'fechas',     label:lang==='en'?'Classes':'Clases'},
    {id:'repertorio', label:lang==='en'?'Repertoire':'Repertorio'},
    {id:'grupos',     label:lang==='en'?'Groups':'Grupos'},
  ];

  const NavIcoAcademia=({id,active})=>{
    const s={viewBox:'0 0 24 24',width:20,height:20,fill:'none',
      stroke:active?'var(--ac)':'var(--tx3)',strokeWidth:1.5,
      strokeLinecap:'round',strokeLinejoin:'round'};
    if(id==='backstage') return(<svg {...s}><line x1="5" y1="3" x2="5" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><rect x="3" y="7" width="4" height="3.5" rx="1.5"/><rect x="10" y="13" width="4" height="3.5" rx="1.5"/><rect x="17" y="5" width="4" height="3.5" rx="1.5"/></svg>);
    if(id==='fechas')    return(<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(id==='repertorio')return(<svg {...s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(id==='grupos')    return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    return null;
  };

  return(
    <div style={{...themeStyle,minHeight:'100vh',position:'relative'}}>
      <div style={{
        position:'sticky',top:0,zIndex:40,
        background:'rgba(8,7,14,.92)',
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
          <h1 style={{margin:0,fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',lineHeight:1}}>
            {lang==='en'?'My Academy':'Mi Academia'}
          </h1>
          <span style={{fontSize:9,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",
            textTransform:'uppercase',letterSpacing:'2px'}}>
            {lang==='en'?'Academy Mode':'Modo Academia'}
          </span>
        </div>
      </div>
      <div style={{padding:'10px 8px 90px'}}>
        {view==='backstage'&&(
          <AcademiaBackstage
            alumnos={alumnos} setAlumnos={setAlumnos}
            grupos={grupos} setGrupos={setGrupos}
            clases={clases} setClases={setClases}
            repertorio={repertorio}
            isProfesor={isProfesor} onToast={showToast} lang={lang}
          />
        )}
        {view==='fechas'&&(
          <AcademiaFechas
            clases={clases} setClases={setClases}
            alumnos={alumnos} grupos={grupos} repertorio={repertorio}
            isProfesor={isProfesor} onToast={showToast}
            onOpenSong={(songIdx,grupoId)=>abrirSongViewComoAlumno(songIdx,grupoId)}
            lang={lang}
          />
        )}
        {view==='repertorio'&&(
          <AcademiaRepertorio
            repertorio={repertorio} setRepertorio={setRepertorio}
            colecciones={colecciones} setColecciones={setColecciones}
            isProfesor={isProfesor} onToast={showToast}
            onOpenSong={(songIdx)=>abrirSongViewComoProfesor(songIdx)}
            lang={lang}
          />
        )}
        {view==='grupos'&&(
          <AcademiaGrupos
            grupos={grupos} setGrupos={setGrupos}
            alumnos={alumnos} setAlumnos={setAlumnos}
            isProfesor={isProfesor} onToast={showToast} lang={lang}
          />
        )}
        <Footer/>
      </div>
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(8,7,14,.92)',backdropFilter:'blur(26px)',
        borderTop:'1px solid var(--bd)',zIndex:20,
        padding:'7px 0 11px',display:'flex',
        justifyContent:'space-around',
      }}>
        {TABS.map(t=>(
          <div key={t.id}
            className={`bn${view===t.id?' on':''}`}
            onClick={()=>setView(t.id)}>
            <NavIcoAcademia id={t.id} active={view===t.id}/>
            <span className="bn-lb">{t.label}</span>
          </div>
        ))}
      </nav>
      {songViewIdx!==null&&(
        <div style={{position:'fixed',inset:0,zIndex:100}}>
          <SongView
            songs={repertorio.map(c=>({name:c.n,key:c.key,bpm:c.bpm}))}
            startIdx={songViewIdx}
            onClose={()=>{setSongViewIdx(null);setSongViewPermisos(null);}}
            theme="dark"
            contentDB={SONG_CONTENT_BANDA}
            permisos={songViewPermisos}
            lang={lang}
          />
        </div>
      )}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}
