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
import { t as getT, LANGS } from '../i18n';
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
  const [ensayos,setEnsayos]=useState([]); // sesión local — no persiste a Firestore aún
  const [variacionesDB,setVariacionesDB]=useState(()=>({
    // Demo para probar el flujo de asignación variación→persona en el
    // setlist (pedido de Danny 01-Jul-2026). tipo:'letra' usa contenido
    // propio en contentDB (sembrado más abajo); tipo:'partitura' trae su
    // propio archivo (imagen/PDF) y SongView lo muestra en vez del acorde.
    'YESHUA':[
      {id:'v_demo_bajo',   label:'Bajo',    tipo:'letra'},
      {id:'v_demo_piano',  label:'Piano',   tipo:'letra'},
      {id:'v_demo_trombon',label:'Trombón', tipo:'partitura',
        archivoNombre:'Yeshua - Trombón.svg',
        archivoUrl:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iODAwIiB2aWV3Qm94PSIwIDAgNjAwIDgwMCI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iODAwIiBmaWxsPSIjZmRmYWYzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI1MCIgZm9udC1mYW1pbHk9Ikdlb3JnaWEsc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiMxYTFhMWEiIGZvbnQtd2VpZ2h0PSJib2xkIj5ZRVNIVUE8L3RleHQ+Cjx0ZXh0IHg9IjQwIiB5PSI3MiIgZm9udC1mYW1pbHk9Ikdlb3JnaWEsc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiM1NTUiPlRyb21ib24gZW4gRG8gLSBNYXJjb3MgQnJ1bmV0PC90ZXh0Pgo8ZyBzdHJva2U9IiMyMjIiIHN0cm9rZS13aWR0aD0iMS4yIj4KPGxpbmUgeDE9IjQwIiB5MT0iMTIwIiB4Mj0iNTYwIiB5Mj0iMTIwIi8+CjxsaW5lIHgxPSI0MCIgeTE9IjEzMiIgeDI9IjU2MCIgeTI9IjEzMiIvPgo8bGluZSB4MT0iNDAiIHkxPSIxNDQiIHgyPSI1NjAiIHkyPSIxNDQiLz4KPGxpbmUgeDE9IjQwIiB5MT0iMTU2IiB4Mj0iNTYwIiB5Mj0iMTU2Ii8+CjxsaW5lIHgxPSI0MCIgeTE9IjE2OCIgeDI9IjU2MCIgeTI9IjE2OCIvPgo8L2c+CjxwYXRoIGQ9Ik01MiAxMTIgQzQwIDEyMiA0MCAxNDAgNTUgMTQ4IEM3MCAxNTYgNzIgMTY4IDU4IDE3NiBDNDggMTgyIDQ0IDE3MiA1MCAxNjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzExMSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KPGcgc3Ryb2tlPSIjMjIyIiBzdHJva2Utd2lkdGg9IjEuMiI+CjxsaW5lIHgxPSI0MCIgeTE9IjIyMCIgeDI9IjU2MCIgeTI9IjIyMCIvPgo8bGluZSB4MT0iNDAiIHkxPSIyMzIiIHgyPSI1NjAiIHkyPSIyMzIiLz4KPGxpbmUgeDE9IjQwIiB5MT0iMjQ0IiB4Mj0iNTYwIiB5Mj0iMjQ0Ii8+CjxsaW5lIHgxPSI0MCIgeTE9IjI1NiIgeDI9IjU2MCIgeTI9IjI1NiIvPgo8bGluZSB4MT0iNDAiIHkxPSIyNjgiIHgyPSI1NjAiIHkyPSIyNjgiLz4KPC9nPgo8cGF0aCBkPSJNNTIgMjEyIEM0MCAyMjIgNDAgMjQwIDU1IDI0OCBDNzAgMjU2IDcyIDI2OCA1OCAyNzYgQzQ4IDI4MiA0NCAyNzIgNTAgMjY2IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMTEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CjxnIGZpbGw9IiMxMTEiPgo8Y2lyY2xlIGN4PSIxNDAiIGN5PSIxNDQiIHI9IjYiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxMzIiIHI9IjYiLz48Y2lyY2xlIGN4PSIyNjAiIGN5PSIxNTAiIHI9IjYiLz4KPGNpcmNsZSBjeD0iMzIwIiBjeT0iMTIwIiByPSI2Ii8+PGNpcmNsZSBjeD0iMzgwIiBjeT0iMTU2IiByPSI2Ii8+PGNpcmNsZSBjeD0iNDQwIiBjeT0iMTM4IiByPSI2Ii8+CjxjaXJjbGUgY3g9IjE0MCIgY3k9IjI0NCIgcj0iNiIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIzMiIgcj0iNiIvPjxjaXJjbGUgY3g9IjI2MCIgY3k9IjI1MCIgcj0iNiIvPgo8Y2lyY2xlIGN4PSIzMjAiIGN5PSIyMjAiIHI9IjYiLz48Y2lyY2xlIGN4PSIzODAiIGN5PSIyNTYiIHI9IjYiLz48Y2lyY2xlIGN4PSI0NDAiIGN5PSIyMzgiIHI9IjYiLz4KPC9nPgo8dGV4dCB4PSI0MCIgeT0iNzQwIiBmb250LWZhbWlseT0iR2VvcmdpYSxzZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iIzk5OSI+UGFydGl0dXJhIGRlbW8gZ2VuZXJhZGEgcG9yIFNldFN5bmMgLSByZWVtcGxhemFyIHBvciBlbCBQREYgcmVhbDwvdGV4dD4KPC9zdmc+'},
    ],
  })); // {nombreCancion: [{id,label}]} — versiones/partituras por instrumento
  // ── Carpeta de canción (v36-ampliación) — 100% local por ahora, igual que
  // ensayos/variacionesDB: {nombreCancion: {trackReferencia:{url,nombre,
  // fecha,origen}|null, secuencia:[{id,nombre,url,size}]}}. trackReferencia
  // es UN solo slot reemplazable (Capa 1, definido en v35); secuencia es
  // lista abierta de tracks. Compartido entre Cancionero y SongView para
  // que la carpeta sea la misma se mire desde donde se mire.
  const [archivosDB,setArchivosDB]=useState({});

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
  // ── Fecha abierta en "Mi Setlist" (v39-ampliación) ──────────────────────
  // Antes Mi Setlist recalculaba todo desde activeSunday+SETLISTS, sin
  // importar si la tarjeta tocada era un evento real (Firestore), uno del
  // calendario viejo, o un evento especial — mostraba datos incorrectos al
  // abrir un evento real. abrirFecha() normaliza los 3 orígenes a una
  // misma forma antes de navegar, así Mi Setlist siempre muestra lo real.
  const [fechaAbierta,setFechaAbierta]=useState(null);
  const abrirFecha=(fecha)=>{ setFechaAbierta(fecha); setView('misetlist'); };
  const contentDB = appMode==='banda'?SONG_CONTENT_BANDA:SONG_CONTENT_IGLESIA;

  // Demo: contenido propio para las variaciones de letra "Bajo" y "Piano"
  // de YESHUA (mismo mecanismo de mutación directa que usa handleSaveChords
  // más abajo — contentDB es el objeto estático importado, no state).
  // Clave = displayName que arma abrirSongDesdeRepertorio ("Canción · Label").
  useEffect(()=>{
    if(!contentDB['YESHUA · Bajo']){
      contentDB['YESHUA · Bajo']=`
YESHUA — VERSIÓN BAJO
Marcos Brunet
Notas raíz para línea de bajo

===VERSO 1===
[A]Mi orgullo me sacó del jardín
[B]Su humildad colocó el jardín en mí
[A]Y si vendiera todo lo que tengo
[B]A cambio de su amor, yo fallaría
[A]Porque su amor no se compra Ni se merece
[B]Su amor es un regalo De gracia se recibe
===CORO===
[A]Quiero conocer a Jesús
[B]Quiero conocer a Jesús
[A]Quiero conocer a Jesús
[B]Quiero conocer a Jesús
[A]Y ser hallado en él
[B]Y ser hallado en él
[B]Y ser hallado en él
===PUENTE===
[A]Mi amado es el más bello entre millares
[E]de millares
[A]Tuyo es el reino, Tuyo es el poder
[B]Tuya es la gloria, Por siempre amén.
`;
    }
    if(!contentDB['YESHUA · Piano']){
      contentDB['YESHUA · Piano']=`
YESHUA — VERSIÓN PIANO
Marcos Brunet
Voicings extendidos para teclado

===VERSO 1===
[Amaj7]Mi[Bsus4] orgullo me sacó del jardín
[C#m7]Su h[Bsus4]umildad colocó el jardín en mí
[Amaj7]Y [Bsus4]si vendiera todo lo que tengo
[C#m7]A ca[Bsus4]mbio de su amor, yo fallaría
[Amaj7]Po[Bsus4]rque su amor no se compra Ni se merece
[C#m7]Su a[Bsus4]mor es un regalo De gracia se recibe
===CORO===
[Amaj7]Qu[Bsus4]iero conocer a Jesús
[C#m7]Quie[Bsus4]ro conocer a Jesús
[Amaj7]Qu[Bsus4]iero conocer a Jesús
[C#m7]Quie[Bsus4]ro conocer a Jesús
[Amaj7]Y ser hallado en él
[Bsus4]Y ser hallado en él
[C#m7]Y ser hallado en él
===PUENTE===
[Amaj7]Mi[C#m7] amado es el más bello entre millares
[E9]de[Bsus4] millares
[Amaj7]Tu[Bsus4]yo es el reino, Tuyo es el poder
[C#m7]Tuya[Bsus4] es la gloria, Por siempre amén.
`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const showToast=(msg)=>{setToast(typeof msg==='string'?{text:msg}:msg);setTimeout(()=>setToast(null),2500);};

  // Domingo activo para MiEvento: el primero con setlist cargado, en vez de
  // un número fijo hardcodeado (pendiente anotado en la entrega anterior).
  // proximoDomingo ya no hace falta — activeSunday cumple ese rol como estado real

  // ── Apertura de SongView: cualquier pantalla puede abrirlo pasando el
  // array de canciones de su contexto (repertorio completo o setlist de
  // un evento puntual) — ya no depende de un "activeSunday" fijo global ──
  const abrirSongDesdeRepertorio=(name,variacionId)=>{
    const fuente = appMode==='banda'?repertorio:CANCIONES; // CANCIONES se muta en vivo desde Cancionero.jsx
    if(variacionId && variacionId!=='original'){
      const base=fuente.find(c=>c.n===name);
      if(!base)return;
      const v=(variacionesDB[name]||[]).find(x=>x.id===variacionId);
      const displayName = v ? `${name} · ${v.label}` : name;
      const partitura = v?.tipo==='partitura' ? {url:v.archivoUrl,nombre:v.archivoNombre} : null;
      setSongViewSongs([{name:displayName,key:base.key,bpm:base.bpm,partitura}]);
      setSongView(0);
      return;
    }
    const songs=fuente.map(c=>({name:c.n,key:c.key,bpm:c.bpm}));
    const idx=songs.findIndex(s=>s.name===name);
    if(idx>=0){setSongViewSongs(songs);setSongView(idx);}
  };
  const abrirSongDesdeEvento=(idx,setlist)=>{
    if(!setlist||!setlist.length)return;
    // Los ítems del setlist pueden venir en 3 formatos (compatibilidad):
    // - string (nombre de canción, formato viejo)
    // - objeto ya resuelto con name/key/bpm (formato viejo de variaciones)
    // - {cancion, variacionId, personaId} — formato nuevo con asignación
    //   de variación/partitura por persona (v36-ampliación)
    const songs=setlist.map(item=>{
      if(typeof item==='string')return CANCIONES.find(c=>c.n===item)||{n:item,name:item,key:'',bpm:''};
      if(item&&item.cancion){
        const base=CANCIONES.find(c=>c.n===item.cancion)||{n:item.cancion,key:'',bpm:''};
        // asignaciones: puede haber varias (ej. Piano→Ana y Bajo→Luis en la
        // misma canción) — al abrir genérico no sabemos "cuál es la mía"
        // sin login, así que se abre el Original y se muestran todas las
        // asignaciones como referencia en el header.
        const asignaciones=(item.asignaciones||(item.variacionId?[{variacionId:item.variacionId,personaId:item.personaId}]:[]))
          .map(a=>{
            const v=a.variacionId&&a.variacionId!=='original'?(variacionesDB[item.cancion]||[]).find(x=>x.id===a.variacionId):null;
            const persona=a.personaId?personas.find(p=>p.id===a.personaId):null;
            return (v||persona)?{variacion:v?.label||'Original',persona:persona?.name||null}:null;
          }).filter(Boolean);
        return{
          name: item.cancion,
          key: base.key, bpm: base.bpm,
          asignaciones,
        };
      }
      if(typeof item==='object'&&item)return item; // ya resuelto (compatibilidad hacia atrás)
      return {n:String(item),name:String(item),key:'',bpm:''};
    });
    setSongViewSongs(songs);setSongView(idx);
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

  // ── Pantalla de bienvenida: idioma + modo ─────────────────────────────────
  if(appMode===null){
    const T={
      es:{ choose:'¿Cómo usas SetSync?', sub:'Dos interfaces diseñadas para distintos equipos.', canChange:'Puedes cambiarlo en cualquier momento desde Backstage → Configuración.',
        iglesia:{title:'Iglesia', tag:'ADORACIÓN & WORSHIP',
          lines:['Setlists y letras para el equipo','Gestión de equipos de alabanza','Monitoreo en vivo con tu mesa digital']},
        banda:{title:'Banda', tag:'ESCENARIO & SHOWS',
          lines:['Repertorio, setlists y rider técnico','Fechas, gigs y producción','Monitor personal y secuencias de show']},
      },
      ar:{ choose:'¿Cómo usás SetSync?', sub:'Dos interfaces diseñadas para distintos equipos.', canChange:'Podés cambiarlo desde Backstage en cualquier momento.',
        iglesia:{title:'Iglesia', tag:'ADORACIÓN & WORSHIP',
          lines:['Setlists y letras para el equipo','Gestión de equipos de alabanza','Monitoreo en vivo con tu mesa digital']},
        banda:{title:'Banda', tag:'ESCENARIO & SHOWS',
          lines:['Repertorio, setlists y rider técnico','Fechas, gigs y producción','Monitor personal y secuencias de show']},
      },
      pt:{ choose:'Como você usa o SetSync?', sub:'Duas interfaces para times diferentes.', canChange:'Você pode mudar isso em Backstage → Configurações.',
        iglesia:{title:'Igreja', tag:'ADORAÇÃO & WORSHIP',
          lines:['Setlists e letras para o time','Gestão de equipes de louvor','Monitor ao vivo com sua mesa digital']},
        banda:{title:'Banda', tag:'PALCO & SHOWS',
          lines:['Repertório, setlists e rider técnico','Datas, shows e produção','Monitor pessoal e sequências de show']},
      },
      en:{ choose:'How do you use SetSync?', sub:'Two interfaces designed for different teams.', canChange:'You can change this anytime in Backstage → Settings.',
        iglesia:{title:'Church', tag:'WORSHIP & PRAISE',
          lines:['Setlists and lyrics for your team','Worship team management','Live monitor with your digital console']},
        banda:{title:'Band', tag:'STAGE & SHOWS',
          lines:['Repertoire, setlists and tech rider','Gigs, dates and production','Personal monitor and show sequences']},
      },
    };
    const tl=T[lang]||T.es;
    return(
      <div style={{minHeight:'100vh',background:'#09090b',display:'flex',flexDirection:'column',alignItems:'center',fontFamily:"'Lexend Giga',sans-serif",overflowY:'auto',position:'relative',overflowX:'hidden'}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&display=swap');
          @keyframes textura-drift { 0%{transform:translate(0,0) rotate(0deg) scale(1.15);} 33%{transform:translate(-30px,20px) rotate(1.2deg) scale(1.08);} 66%{transform:translate(20px,-15px) rotate(-.6deg) scale(1.18);} 100%{transform:translate(0,0) rotate(0deg) scale(1.15);} }
          @keyframes textura-drift2 { 0%{transform:translate(0,0) rotate(0deg) scale(1.12);} 40%{transform:translate(25px,-18px) rotate(-1deg) scale(1.06);} 80%{transform:translate(-15px,22px) rotate(.8deg) scale(1.14);} 100%{transform:translate(0,0) rotate(0deg) scale(1.12);} }
          @keyframes textura-fade { 0%,100%{opacity:.06;} 50%{opacity:.18;} }
          @keyframes wheel-glow { 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0);} 50%{box-shadow:0 0 20px 2px rgba(255,255,255,.06);} }
          .wheel-item { transition: all .3s cubic-bezier(.4,0,.2,1); }
          .mode-card { transition: transform .2s, box-shadow .2s, border-color .2s; }
          .mode-card:hover { transform:translateY(-2px); }
        `}</style>

        {/* ── Fondo animado con texturas musicales ── */}
        <div style={{position:'fixed',inset:0,zIndex:0,overflow:'hidden',pointerEvents:'none',background:'#09090b'}}>
          {/* Capa 1: dot grid — cuero de amplificador */}
          <div style={{
            position:'absolute',inset:'-20%',
            backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.22) 1.5px, transparent 1.5px)',
            backgroundSize:'32px 32px',
            animation:'textura-drift 20s ease-in-out infinite',
            opacity:0.13,
          }}/>
          {/* Capa 2: líneas diagonales — rejilla micrófono vintage */}
          <div style={{
            position:'absolute',inset:'-20%',
            backgroundImage:'repeating-linear-gradient(55deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 22px)',
            animation:'textura-drift2 28s ease-in-out infinite',
            opacity:0.5,
          }}/>
          {/* Capa 3: líneas horizontales — platillos/escenario */}
          <div style={{
            position:'absolute',inset:'-20%',
            backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)',
            animation:'textura-drift 35s linear infinite',
            opacity:1,
          }}/>
          {/* Glow central */}
          <div style={{
            position:'absolute',top:'35%',left:'50%',transform:'translate(-50%,-50%)',
            width:'80vw',height:'80vw',maxWidth:700,maxHeight:700,
            background:'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 65%)',
            animation:'textura-fade 10s ease-in-out infinite',
          }}/>
          {/* Viñeta bordes */}
          <div style={{
            position:'absolute',inset:0,
            background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          }}/>
        </div>

        {/* ── Contenido ── */}
        <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:'min(760px,95vw)',padding:'0 clamp(16px,4vw,40px)',display:'flex',flexDirection:'column',alignItems:'center'}}>

          {/* Logo vertical — visible con tagline */}
          <div style={{paddingTop:48,paddingBottom:32,display:'flex',flexDirection:'column',alignItems:'center'}}>
            <img src="/LOGO BLANCO VERTICAL.png" alt="SetSync" style={{
              height:'clamp(160px,28vw,240px)',width:'auto',objectFit:'contain',
              filter:'drop-shadow(0 0 60px rgba(255,255,255,0.18))',
            }}/>
          </div>

          {/* Selector de idioma tipo rueda */}
          <div style={{marginBottom:36,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>

            <div style={{display:'flex',alignItems:'center',gap:4,padding:'4px',borderRadius:50,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',animation:'wheel-glow 4s ease-in-out infinite'}}>
              {LANGS.map((l,i)=>{
                const isActive=lang===l.code;
                return(
                  <button key={l.code} onClick={()=>setLang(l.code)}
                    className="wheel-item"
                    style={{
                      padding:isActive?'8px 16px':'6px 10px',
                      borderRadius:40,border:'none',cursor:'pointer',
                      background:isActive?'rgba(255,255,255,.15)':'transparent',
                      display:'flex',alignItems:'center',gap:isActive?6:0,
                      overflow:'hidden',
                    }}>
                    <span style={{fontSize:isActive?16:14,lineHeight:1,transition:'font-size .25s'}}>{l.flag}</span>
                    {isActive&&<span style={{fontSize:10,fontWeight:700,color:'#f3f1ed',whiteSpace:'nowrap',fontFamily:"'Lexend Giga',sans-serif"}}>{l.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div style={{textAlign:'center',marginBottom:10,padding:'0 8px'}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:22,color:'#f3f1ed',marginBottom:10,lineHeight:1.1}}>
              {tl.choose}
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',lineHeight:1.7,fontWeight:300}}>
              {tl.sub}
            </div>
          </div>

          {/* Tarjetas de modo — Banda izquierda, Iglesia derecha */}
          <div style={{width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:20,marginBottom:16}}>
            {[{id:'banda',data:tl.banda},{id:'iglesia',data:tl.iglesia}].map(item=>(
              <button key={item.id} onClick={()=>setAppMode(item.id)}
                className="mode-card"
                style={{
                  padding:'clamp(20px,3vw,36px) clamp(14px,2.5vw,28px) clamp(16px,2.5vw,28px)',borderRadius:18,
                  border:'1px solid rgba(255,255,255,.1)',
                  background:'rgba(255,255,255,.04)',
                  cursor:'pointer',textAlign:'left',
                  backdropFilter:'blur(20px)',
                }}>
                <div style={{fontSize:'clamp(7px,1.2vw,10px)',fontWeight:900,color:'rgba(255,255,255,.35)',letterSpacing:'2px',marginBottom:10,fontFamily:"'Lexend Giga',sans-serif"}}>
                  {item.data.tag}
                </div>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:'clamp(22px,4vw,32px)',color:'#fff',marginBottom:14,lineHeight:1}}>
                  {item.data.title}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {item.data.lines.map((line,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6}}>
                      <div style={{width:4,height:4,borderRadius:'50%',background:'rgba(255,255,255,.3)',flexShrink:0,marginTop:5}}/>
                      <span style={{fontSize:'clamp(9px,1.3vw,12px)',color:'rgba(255,255,255,.5)',lineHeight:1.6,fontWeight:300,fontFamily:"'Lexend Giga',sans-serif"}}>{line}</span>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:14,fontSize:10,fontWeight:700,color:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',gap:4,fontFamily:"'Lexend Giga',sans-serif"}}>
                  Entrar <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            ))}
          </div>

          {/* Nota: se puede cambiar */}
          <div style={{fontSize:9,color:'rgba(255,255,255,.25)',textAlign:'center',lineHeight:1.7,padding:'0 16px 60px',fontWeight:300}}>
            {tl.canChange}
          </div>
        </div>
      </div>
    );
  }

  // ── Plataforma única — mismo árbol para Iglesia y Banda ───────────────
  return(
    <div data-theme={dataTheme}>
      <div className="bg-fx"/>
      <nav className={`sb${sbCol?' col':''}`}>
        {/* Logo = botón de toggle */}
        <div className="sb-top" onClick={()=>setSbCol(c=>!c)} title={sbCol?'Expandir menú':'Colapsar menú'}>
          <div className="logo-area">
            <img className="logo-horiz" src={theme==='cream'?'/LOGO2 horiz gris.png':'/LOGO2 horiz blanco.png'} alt="SetSync"/>
            <img className="logo-fav"   src="/FAVICON SS.png"        alt="SS"/>
          </div>
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
              equipos={equipos} personas={personas} eventos={eventos} ensayos={ensayos}
              planActivo={planActivo} planId={planId}
              tienePremiere={tienePremiere} tieneMonitoreo={tieneMonitoreo}
              onNavigate={setView}/>
          )}
          {view==='fechas'&&<AdminView mode={appMode} activeSunday={activeSunday} userRole={userRole}
            onLive={()=>{const sl=SETLISTS[activeSunday]||[];if(sl.length>0){setSongViewSongs(sl);setSongView(0);}}}
            onToast={showToast}
            onSelectDay={(day,mes)=>{setActiveSunday(day);if(mes!==undefined)setMesNav(mes);}}
            onOpenFecha={(day,mes)=>{setActiveSunday(day);if(mes!==undefined)setMesNav(mes);setView('misetlist');}}
            onAbrirFecha={abrirFecha}
            mesNav={mesNav} lang={lang}
            eventos={eventos} onOpenSong={abrirSongDesdeEvento} equipos={equipos} personas={personas} ensayos={ensayos}/>}
          {view==='misetlist'&&<MiSetlist
            fecha={fechaAbierta||{origen:'legacy',id:`legacy-${activeSunday}`,nombre:`Dom ${activeSunday}`,fechaStr:null,lugar:'Iglesia Central',hora:'10:00',setlist:SETLISTS[activeSunday]||[]}}
            onOpenSong={i=>abrirSongDesdeEvento(i,(fechaAbierta||{}).setlist||SETLISTS[activeSunday]||[])}
            onLive={()=>{const sl=(fechaAbierta||{}).setlist||SETLISTS[activeSunday]||[];if(sl.length>0)abrirSongDesdeEvento(0,sl);}}
            userRole={userRole} onToast={showToast} lang={lang}
            equipos={equipos} personas={personas} variacionesDB={variacionesDB} ensayos={ensayos}/>}
          {view==='repertorio'&&<Cancionero mode={appMode} onOpenSong={abrirSongDesdeRepertorio} userRole={userRole} lang={lang} onToast={showToast} onSaveChords={handleSaveChords} variacionesDB={variacionesDB} setVariacionesDB={setVariacionesDB} archivosDB={archivosDB} setArchivosDB={setArchivosDB}/>}
          {view==='premiere'&&(tienePremiere?<PremiereView onToast={showToast}/>:<div style={{padding:24,textAlign:'center',color:'var(--tx3)',fontSize:13,fontFamily:"'Lexend Giga',sans-serif"}}>{mensajeUpgrade('premiereExclusivas',lang)}</div>)}
          {view==='monitoreo'&&<Monitoreo lang={lang} onToast={showToast}/>}
          {view==='backstage'&&<BackstageView userRole={userRole} onToast={showToast} mode={appMode}
            onSetTheme={setTheme} onGetTheme={()=>theme} eventos={eventos} setEventos={setEventos} lang={lang} ensayos={ensayos} setEnsayos={setEnsayos}
            equipos={equipos} setEquipos={setEquipos} persistirEquipo={persistirEquipo} persistirEvento={persistirEvento}
            guardarSetlistEnEvento={guardarSetlistEnEvento} onLangChange={setLang}
            online={online} setOnline={setOnline} firebaseListo={firebaseListo}
            planId={planId} setPlanId={setPlanId} planActivo={planActivo}
            tienePremiere={tienePremiere} tieneMonitoreo={tieneMonitoreo}
            variacionesDB={variacionesDB}
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
            sidebarVisible={false} sidebarCollapsed={sbCol} ensayosDisponibles={ensayos}
            archivosDB={archivosDB} setArchivosDB={setArchivosDB} variacionesDB={variacionesDB}/>
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
