// App: componente raíz único de la plataforma. UNA sola app, UN solo
// settings — Iglesia/Banda ya NO son shells separados (BandaApp.jsx fue
// retirado). El modo elegido en el onboarding controla vocabulario y
// features vía data/modo.js, y el mismo árbol de componentes (Backstage,
// Fechas, Repertorio, Equipos) sirve a ambos modos.
import { useState, useCallback, useEffect, useRef, Component } from 'react';
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
import { Multitracks } from './Multitracks';
import { Monitoreo } from './Monitoreo';
import { t as getT, LANGS } from '../i18n';
import { getModoTexto, getModoFeatures, getTiposEventoDisponibles } from '../data/modo';
import { getPlan, featureDisponible, mensajeUpgrade } from '../data/planes';
import { migrarSetlistsIglesia, migrarPersonasIglesia, migrarEquiposIglesia } from '../data/eventos-schema';
import { firebaseListo } from '../firebase/config';
import { onAuthChange, cerrarSesion } from '../firebase/auth';
import { Login } from './Login';
import { usePlanEfectivo } from '../hooks/usePlanEfectivo';
import { getAccountId, subscribeEventos, subscribePersonas, subscribeEquipos, guardarEvento, guardarPersona, guardarEquipo, crearInvitacion, subscribeEnsayos, guardarEnsayo, subscribeColecciones, guardarColeccion, subscribeVariacionesDB, guardarVariacionesDB, subscribeArchivosDB, guardarArchivosDB, subscribeEstructurasDB, guardarEstructurasDB, subscribeContentDB, guardarContentDB, subscribeImportDB, guardarImportDB, vincularMembresiasPendientes, getAccountIdOverride, limpiarAccountIdOverride } from '../firebase/firestore';

// ── ErrorBoundary ──────────────────────────────────────────────────────
// Red de seguridad: si algo dentro de SongView (o cualquier hijo envuelto)
// tira un error de render no anticipado, React por defecto desmonta TODO
// el árbol y deja la pantalla en negro/blanco sin ningún mensaje — exactamente
// el bug reportado varias veces ("se va a negro"). Con esto, cualquier error
// futuro no detectado en revisión de código queda contenido: se muestra un
// aviso recuperable con botón para volver, en vez de tumbar la app entera.
class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(){ return { hasError: true }; }
  componentDidCatch(error, info){
    console.error('SetSync — error capturado por ErrorBoundary:', error, info);
  }
  render(){
    if(this.state.hasError){
      return (
        <div style={{position:'fixed',inset:0,background:'var(--bg)',color:'var(--tx)',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          gap:16,padding:24,zIndex:500,textAlign:'center'}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',textTransform:'uppercase'}}>
            Algo no cargó bien
          </div>
          <div style={{fontSize:'var(--fs-base)',color:'var(--tx2)',maxWidth:340}}>
            Hubo un problema mostrando esta canción. Volvé atrás e intentá de nuevo — si sigue pasando, avisa qué canción y desde dónde la abriste.
          </div>
          <button onClick={()=>{this.setState({hasError:false});this.props.onReset&&this.props.onReset();}}
            style={{padding:'10px 20px',borderRadius:100,background:'var(--gn)',color:'var(--btn-c)',
              fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)"}}>
            Volver
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  {id:'banda-4',tipo:'sesion',fecha:'2026-07-20',lugar:'Estudio Manicomio',ciudad:'Santiago',nombre:'Grabación EP',
    setlist:[{name:'CIUDAD DE VIDRIO',key:'Dm',bpm:80},{name:'MAR ADENTRO',key:'D',bpm:68}],
    equiposConvocados:['sonido','produccion'],
    ensayosPrevios:[],
    notas:'Sesión de grabación para el EP — pistas de base. Llevar instrumentos afinados a 440Hz.',notifs:['Estudio confirmado','Ingeniero de grabación asignado']},
];
const SEED_BANDA_PERSONAS=[
  {id:'b1',nombre:'Carlos',rol:'baterista',email:null,equipoId:null},
  {id:'b2',nombre:'Valentina',rol:'guitarrista_e',email:null,equipoId:null},
  {id:'b3',nombre:'Diego',rol:'bajista',email:null,equipoId:null},
  {id:'b4',nombre:'Sofía',rol:'corista1',email:null,equipoId:null},
  {id:'b5',nombre:'Matías',rol:'corista2',email:null,equipoId:null},
  {id:'b6',nombre:'Pedro',rol:'sonido',email:null,equipoId:null},
];
// Repertorio de Banda — antes vacío ("lienzo en blanco"), pero eso dejaba
// huérfanas las canciones que ya aparecían en los setlists de los eventos
// demo de arriba (NOCHE SIN FIN, FUEGO CRUZADO, etc. no existían en ningún
// cancionero). Se pobló con esas mismas 5 canciones originales de la banda
// ficticia, mismo shape que CANCIONES ({n,key,bpm,artista}).
const SEED_BANDA_REPERTORIO=[
  {n:'NOCHE SIN FIN',   key:'Am', bpm:74, artista:'Composición propia'},
  {n:'FUEGO CRUZADO',   key:'Em', bpm:92, artista:'Composición propia'},
  {n:'TIERRA ROJA',     key:'G',  bpm:76, artista:'Composición propia'},
  {n:'MAR ADENTRO',     key:'D',  bpm:68, artista:'Composición propia'},
  {n:'CIUDAD DE VIDRIO',key:'Dm', bpm:80, artista:'Composición propia'},
];
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
  // backstageKey — cambia cada vez que se toca el botón "Backstage" del nav,
  // incluso si ya estabas ahí adentro de una subpágina. BackstageView escucha
  // este valor y se resetea a su home (bsView=null) cuando cambia.
  const [backstageKey,setBackstageKey]=useState(0);
  const goToView=id=>{setView(id);if(id==='backstage')setBackstageKey(k=>k+1);};
  const [sbCol,setSbCol]=useState(false);
  const [toast,setToast]=useState(null);
  const [theme,setTheme]=useState('grafite');
  const [userRole]=useState('superadmin');
  const isAdmin=userRole==='superadmin';
  const [planId,setPlanId]=useState('lite'); // 'lite' | 'pro' | 'premium' — selector temporal de prueba
  // hasta que exista cobro real de Cuenta Unitaria. El plan personal es
  // SIEMPRE del usuario individual — PERO si pertenece a una Cuenta
  // Equipo vigente, ese plan personal queda sobrescrito por Premium
  // completo (ver usePlanEfectivo más abajo, necesita currentUser listo).
  const [online,setOnline]=useState(true); // toggle online/offline — no cierra la app, solo pausa el sync
  // ── Auth real (v42) — reemplaza el accountId fantasma por dispositivo.
  // currentUser: undefined="todavía no sabemos" (esperando a Firebase),
  // null="no hay sesión" (mostrar Login), objeto="hay sesión real".
  // Si Firebase no está configurado, currentUser queda null pero el gate
  // de Login más abajo se salta (mismo comportamiento 100% local de
  // siempre) — accountId cae al viejo generador local como fallback.
  const [currentUser,setCurrentUser]=useState(undefined);
  useEffect(()=>{
    const unsub = onAuthChange(setCurrentUser);
    return unsub;
  },[]);
  // El override (alguien que se unió por código a una cuenta compartida,
  // ver Login.jsx) gana sobre el propio uid — si no hay override, mismo
  // comportamiento de siempre.
  const accountId = getAccountIdOverride() || currentUser?.uid || getAccountId();
  // ── Cuenta Equipo (v90) — usePlanEfectivo() es la fuente única de
  // verdad: se suscribe a las membresías reales del uid en Firestore
  // (orgMiembros→orgs) y devuelve Premium si hay ≥1 equipo vigente
  // (activa o en gracia). Reemplaza el useState de prueba que había acá
  // antes. Soporta multi-equipo — ver hooks/usePlanEfectivo.js.
  const {planActivo, viaEquipo, orgsDelUsuario, orgPrincipal} = usePlanEfectivo(currentUser?.uid, planId);
  useEffect(()=>{
    // Resuelve membresías que un admin agregó por email ANTES de que
    // esta persona tuviera cuenta — se vincula solo, una vez por sesión,
    // apenas el login se confirma.
    if(currentUser?.uid && currentUser?.email) vincularMembresiasPendientes(currentUser.uid, currentUser.email);
  },[currentUser?.uid, currentUser?.email]);
  const tieneUniversal=featureDisponible('cancioneroUniversal',feat,planActivo);
  const tienePremiere=featureDisponible('premiereExclusivas',feat,planActivo);
  const tieneClick=featureDisponible('click',feat,planActivo);
  const tieneMultitracks=featureDisponible('multitracks',feat,planActivo);
  const tieneMonitoreo=featureDisponible('monitoreo',feat,planActivo);
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
  // estructurasDB: por canción (base name) — el ORDEN DE INTERPRETACIÓN en
  // vivo (Intro→Verso1→Coro→Verso1→...), independiente del texto de la
  // letra. Ver Cancionero.jsx (se configura al cargar la canción) y
  // SongView.jsx (MapaMaestro la lee en vez de datos de ejemplo).
  const [estructurasDB,setEstructurasDB]=useState({});

  // ── Sync con Firestore (CAPA 1 — sesión compartida). Si Firebase no
  // está configurado (firebaseListo=false) o el usuario está offline,
  // esto no hace nada — la app sigue 100% local, igual que siempre.
  // Primera conexión: si Firestore está vacío pero ya hay datos locales
  // (semilla de Iglesia/Banda), se sube esa semilla en vez de borrarla. ──
  const seedHechoRef = useRef(false);
  useEffect(()=>{
    // currentUser===undefined significa "Firebase Auth todavía no confirmó
    // la sesión" (ver declaración arriba). Sin esta espera, accountId cae
    // al ID de localStorage durante ese instante inicial, que nunca
    // coincide con request.auth.uid en las reglas de seguridad — resultado:
    // "FirebaseError: Missing or insufficient permissions" en cada
    // suscripción, apenas carga la página logueado (bug real encontrado
    // reproduciendo la consola del navegador en producción).
    if(!firebaseListo || appMode===null || !online || currentUser===undefined) return;
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
    const unsubEn = subscribeEnsayos(accountId, data=>{
      if(data.length===0 && ensayos.length>0){
        ensayos.forEach(en=>guardarEnsayo(accountId, en));
      } else if(data.length>0){
        setEnsayos(data);
      }
    });
    const unsubCo = subscribeColecciones(accountId, data=>{
      if(data.length===0 && colecciones.length>0){
        colecciones.forEach(co=>guardarColeccion(accountId, co));
      } else if(data.length>0){
        setColecciones(data);
      }
    });
    return ()=>{ unsubEv(); unsubPe(); unsubEq(); unsubEn(); unsubCo(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, online, currentUser]);

  const persistirPersona = (persona) => { if(firebaseListo && online) guardarPersona(accountId, persona); };
  const persistirEvento = (evento) => { if(firebaseListo && online) guardarEvento(accountId, evento); };
  const persistirEquipo = (equipo) => { if(firebaseListo && online) guardarEquipo(accountId, equipo); };
  const persistirEnsayo = (ensayo) => { if(firebaseListo && online) guardarEnsayo(accountId, ensayo); };
  const persistirColeccion = (coleccion) => { if(firebaseListo && online) guardarColeccion(accountId, coleccion); };

  // ── variacionesDB / archivosDB (v44-ampliación) — a diferencia de arriba,
  // estos son mapas que se editan desde muchos lugares distintos (Cancionero,
  // SongView), no un único "crear X" — así que en vez de perseguir cada
  // punto de mutación, se sincroniza el mapa completo cada vez que cambia.
  // Los "skip" refs evitan el eco: cuando el cambio viene DE Firestore, no
  // hay que volver a subirlo de inmediato.
  // contentDB: letra/acordes por canción. Antes era una const derivada
  // directo de SONG_CONTENT_BANDA/SONG_CONTENT_IGLESIA (objeto estático
  // mutado in-place por handleSaveChords) — nunca llegaba a Firestore, así
  // que cualquier canción cargada por un usuario real se perdía al recargar.
  // Ahora es estado real, sembrado una vez con el contenido de fábrica
  // correspondiente al modo, y sincronizado con Firestore con el mismo
  // patrón que estructurasDB/archivosDB/variacionesDB.
  // DECLARADO ACÁ (antes del bloque de useEffects de sync) y no más abajo:
  // el useEffect de suscripción a Firestore lee contentDB en su callback,
  // y aunque ese callback corre después del render, la declaración debe
  // preceder textualmente su uso — si no, "Cannot access before
  // initialization" (temporal dead zone) revienta el mount completo y deja
  // pantalla en blanco/negra sin ningún error visible en la UI (bug real
  // encontrado y corregido en esta sesión, reproducido ejecutando el
  // bundle de producción real fuera del navegador).
  const [contentDB,setContentDB]=useState(()=>({...(appMode==='banda'?SONG_CONTENT_BANDA:SONG_CONTENT_IGLESIA)}));
  // importDB: por canción (base name) — {status:'sin_revisar'|'revisada',
  // warnings:[string]}. Nace vacío (canciones de fábrica/manuales no tienen
  // entrada = sin badge). Solo lo puebla el import rule-based (Cancionero.jsx,
  // modo 'importar') y solo lo muta guardar() al confirmar una edición.
  const [importDB,setImportDB]=useState({});

  const skipVarSaveRef = useRef(false);
  const skipArchSaveRef = useRef(false);
  const skipEstrSaveRef = useRef(false);
  const skipContentSaveRef = useRef(false);
  const skipImportSaveRef = useRef(false);
  useEffect(()=>{
    // Misma espera que el efecto de eventos/personas/equipos más arriba:
    // sin currentUser confirmado, accountId puede no coincidir todavía
    // con request.auth.uid y las 4 suscripciones fallan con
    // "Missing or insufficient permissions".
    if(!firebaseListo || appMode===null || !online || currentUser===undefined) return;
    const unsubVar = subscribeVariacionesDB(accountId, data=>{
      if(data===null){
        guardarVariacionesDB(accountId, variacionesDB);
      } else {
        skipVarSaveRef.current = true;
        setVariacionesDB(data);
      }
    });
    const unsubArch = subscribeArchivosDB(accountId, data=>{
      if(data===null){
        guardarArchivosDB(accountId, archivosDB);
      } else {
        skipArchSaveRef.current = true;
        setArchivosDB(data);
      }
    });
    const unsubEstr = subscribeEstructurasDB(accountId, data=>{
      if(data===null){
        guardarEstructurasDB(accountId, estructurasDB);
      } else {
        skipEstrSaveRef.current = true;
        setEstructurasDB(data);
      }
    });
    const unsubContent = subscribeContentDB(accountId, data=>{
      if(data===null){
        // Primera vez que esta cuenta se conecta: siembra Firestore con el
        // contentDB local actual (fábrica + lo que ya se haya cargado antes
        // de tener conexión), igual que el resto de las colecciones.
        guardarContentDB(accountId, contentDB);
      } else {
        skipContentSaveRef.current = true;
        setContentDB(data);
      }
    });
    const unsubImport = subscribeImportDB(accountId, data=>{
      if(data===null){
        guardarImportDB(accountId, importDB);
      } else {
        skipImportSaveRef.current = true;
        setImportDB(data);
      }
    });
    return ()=>{ unsubVar(); unsubArch(); unsubEstr(); unsubContent(); unsubImport(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, online, currentUser]);
  // Los 4 efectos de guardado automático que siguen comparten el mismo bug
  // de raíz que ya encontramos y corregimos en los efectos de SUSCRIPCIÓN
  // más arriba: sin esperar a que currentUser esté confirmado, accountId
  // puede caer al ID de respaldo de localStorage en el instante inicial,
  // que nunca coincide con request.auth.uid en las reglas de seguridad —
  // el guardado falla en silencio (promesa rechazada sin manejar) y el
  // dato nunca llega a Firestore, aunque en pantalla parezca "guardado".
  // Este es el bug real detrás de "los multitracks no persisten al
  // recargar" — guardarArchivosDB se llamaba, pero con un accountId que
  // las reglas rechazaban.
  useEffect(()=>{
    if(!firebaseListo || !online || currentUser===undefined) return;
    if(skipVarSaveRef.current){ skipVarSaveRef.current=false; return; }
    guardarVariacionesDB(accountId, variacionesDB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[variacionesDB, currentUser]);
  useEffect(()=>{
    if(!firebaseListo || !online || currentUser===undefined) return;
    if(skipArchSaveRef.current){ skipArchSaveRef.current=false; return; }
    guardarArchivosDB(accountId, archivosDB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[archivosDB, currentUser]);
  useEffect(()=>{
    if(!firebaseListo || !online || currentUser===undefined) return;
    if(skipEstrSaveRef.current){ skipEstrSaveRef.current=false; return; }
    guardarEstructurasDB(accountId, estructurasDB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[estructurasDB, currentUser]);
  useEffect(()=>{
    if(!firebaseListo || !online || currentUser===undefined) return;
    if(skipContentSaveRef.current){ skipContentSaveRef.current=false; return; }
    guardarContentDB(accountId, contentDB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[contentDB, currentUser]);
  useEffect(()=>{
    if(!firebaseListo || !online || currentUser===undefined) return;
    if(skipImportSaveRef.current){ skipImportSaveRef.current=false; return; }
    guardarImportDB(accountId, importDB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[importDB, currentUser]);

  const [songViewSongs,setSongViewSongs]=useState(null);
  const [songView,setSongView]=useState(null);
  const [songParaEditar,setSongParaEditar]=useState(null); // nombre de canción a precargar en Cancionero al volver desde "Editar" en SongView
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

  // Demo: contenido propio para las variaciones de letra "Bajo" y "Piano"
  // de YESHUA. Antes mutaba contentDB directo (objeto estático); ahora
  // contentDB es estado real sincronizado con Firestore, así que se siembra
  // con setContentDB — funcional, para no pisar lo que ya haya llegado de
  // Firestore en el mismo instante en que corre este efecto.
  // Clave = displayName que arma abrirSongDesdeRepertorio ("Canción · Label").
  useEffect(()=>{
    setContentDB(prev=>{
      const next={...prev};
      if(!next['YESHUA · Bajo']){
        next['YESHUA · Bajo']=`
YESHUA — VERSIÓN BAJO
Marcos Brunet
Notas raíz para línea de bajo

===VERSO 1===
{A:0}Mi orgullo me sacó del jardín
{B:0}Su humildad colocó el jardín en mí
{A:0}Y si vendiera todo lo que tengo
{B:0}A cambio de su amor, yo fallaría
{A:0}Porque su amor no se compra Ni se merece
{B:0}Su amor es un regalo De gracia se recibe
===CORO===
{A:0}Quiero conocer a Jesús
{B:0}Quiero conocer a Jesús
{A:0}Quiero conocer a Jesús
{B:0}Quiero conocer a Jesús
{A:0}Y ser hallado en él
{B:0}Y ser hallado en él
{B:0}Y ser hallado en él
===PUENTE===
{A:0}Mi amado es el más bello entre millares
{E:2}de millares
{A:0}Tuyo es el reino, Tuyo es el poder
{B:0}Tuya es la gloria, Por siempre amén.
`;
      }
      if(!next['YESHUA · Piano']){
        next['YESHUA · Piano']=`
YESHUA — VERSIÓN PIANO
Marcos Brunet
Voicings extendidos para teclado

===VERSO 1===
{Amaj7:0}{Bsus4:2}
Mi orgullo me sacó del jardín
{C#m7:0}{Bsus4:5}
Su humildad colocó el jardín en mí
{Amaj7:0}{Bsus4:2}
Y si vendiera todo lo que tengo
{C#m7:0}{Bsus4:5}
A cambio de su amor, yo fallaría
{Amaj7:0}{Bsus4:2}
Porque su amor no se compra Ni se merece
{C#m7:0}{Bsus4:5}
Su amor es un regalo De gracia se recibe
===CORO===
{Amaj7:0}{Bsus4:2}
Quiero conocer a Jesús
{C#m7:0}{Bsus4:4}
Quiero conocer a Jesús
{Amaj7:0}{Bsus4:2}
Quiero conocer a Jesús
{C#m7:0}{Bsus4:4}
Quiero conocer a Jesús
{Amaj7:0}
Y ser hallado en él
{Bsus4:0}
Y ser hallado en él
{C#m7:0}
Y ser hallado en él
===PUENTE===
{Amaj7:0}{C#m7:2}
Mi amado es el más bello entre millares
{E9:0}{Bsus4:2}
de millares
{Amaj7:0}{Bsus4:2}
Tuyo es el reino, Tuyo es el poder
{C#m7:0}{Bsus4:4}
Tuya es la gloria, Por siempre amén.
`;
      }
      return next;
    });
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
      setSongViewSongs([{...base,name:displayName,key:base.key,bpm:base.bpm,partitura}]);
      setSongView(0);
      return;
    }
    const songs=fuente.map(c=>({...c,name:c.n,key:c.key,bpm:c.bpm}));
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
          ...base,
          name: item.cancion,
          key: base.key, bpm: base.bpm,
          asignaciones,
        };
      }
      if(typeof item==='object'&&item){
        // Compatibilidad hacia atrás — pero antes esto devolvía el objeto
        // tal cual, y los setlists de SETLISTS (formato viejo, solo
        // {name,key,bpm}) nunca traían artista/autor. Se enriquece contra
        // CANCIONES si existe una coincidencia, sin pisar key/bpm propios
        // del item (pueden venir ajustados para ese evento puntual).
        const base=CANCIONES.find(c=>c.n===item.name);
        return base?{...base,...item}:item;
      }
      return {n:String(item),name:String(item),key:'',bpm:''};
    });
    setSongViewSongs(songs);setSongView(idx);
  };
  const handleSaveChords=(name,content)=>{setContentDB(prev=>({...prev,[name]:content}));showToast('✓ Acordes guardados');};

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

  // Temas: grafite es el default desde :root en theme.css
  // brasa/midnight/blue-lava usan [data-theme] selector en theme.css
  const dataTheme = theme==='grafite' ? undefined : theme;

  const Footer=()=>(
    <div style={{padding:'32px 24px 20px',borderTop:'1px solid var(--s1)',display:'flex',flexDirection:'column',alignItems:'center',gap:12,opacity:.35,userSelect:'none'}}>
      <img src={theme==='blue-lava'?'/LOGO oscuroVERTICAL (2).png':'/LOGO BLANCO VERTICAL.png'} alt="SetSync" style={{width:56,height:'auto',objectFit:'contain',filter:'grayscale(1)'}}/>
      <div style={{fontSize:'var(--fs-xs)',fontFamily:"var(--font-body)",fontWeight:300,color:'var(--tx3)',textAlign:'center',lineHeight:1.8,letterSpacing:'.5px'}}>
        © {new Date().getFullYear()} SetSync · {tx.allRights}
      </div>
      <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",fontWeight:300,letterSpacing:'1.5px',textTransform:'uppercase',marginTop:2}}>
        by <span style={{fontWeight:500}}>Agencia Fearless</span>
      </div>
    </div>
  );

  // ── Navegación — misma para ambos modos, etiquetas vía vx ────────────
  const BNS=[
    {id:'inicio',     label:tx.home},
    {id:'fechas',     label:tx.fechas},
    {id:'misetlist',  label:tx.nextDate},
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

  // ── Gate de autenticación (v42) ───────────────────────────────────────
  // Solo aplica si Firebase está configurado — si no, currentUser queda
  // null pero firebaseListo también es false, así que este bloque nunca
  // bloquea el modo 100% local (comportamiento de siempre, sin romper
  // nada para quien todavía no configuró las variables de entorno).
  if(firebaseListo && currentUser===undefined){
    return(
      <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:200,fontSize:'var(--fs-display)',color:'var(--tx3)'}}>Set<span style={{color:'var(--gn)'}}>Sync</span></div>
      </div>
    );
  }
  if(firebaseListo && currentUser===null){
    return <Login lang={lang}/>;
  }

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
      <div style={{minHeight:'100vh',background:'#09090b',display:'flex',flexDirection:'column',alignItems:'center',fontFamily:"var(--font-body)",overflowY:'auto',position:'relative',overflowX:'hidden'}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&display=swap');
          @keyframes textura-drift { 0%{transform:translate(0,0) rotate(0deg) scale(1.15);} 33%{transform:translate(-30px,20px) rotate(1.2deg) scale(1.08);} 66%{transform:translate(20px,-15px) rotate(-.6deg) scale(1.18);} 100%{transform:translate(0,0) rotate(0deg) scale(1.15);} }
          @keyframes textura-drift2 { 0%{transform:translate(0,0) rotate(0deg) scale(1.12);} 40%{transform:translate(25px,-18px) rotate(-1deg) scale(1.06);} 80%{transform:translate(-15px,22px) rotate(.8deg) scale(1.14);} 100%{transform:translate(0,0) rotate(0deg) scale(1.12);} }
          @keyframes textura-fade { 0%,100%{opacity:.06;} 50%{opacity:.18;} }
          @keyframes wheel-glow { 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0);} 50%{box-shadow:0 0 20px 2px var(--s3);} }
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
        <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:'min(760px,95vw)',padding:'0 clamp(8px,2vw,20px)',display:'flex',flexDirection:'column',alignItems:'center'}}>

          {/* Logo vertical — visible con tagline */}
          <div style={{paddingTop:40,paddingBottom:0,display:'flex',flexDirection:'column',alignItems:'center'}}>
            <img src={theme==='blue-lava'?'/LOGO oscuroVERTICAL (2).png':'/LOGO BLANCO VERTICAL.png'} alt="SetSync" style={{
              height:'clamp(220px,39.6vw,330px)',width:'auto',objectFit:'contain',
              filter:theme==='blue-lava'?'drop-shadow(0 0 40px rgba(0,0,0,0.12))':'drop-shadow(0 0 60px rgba(255,255,255,0.18))',
            }}/>
          </div>

          {/* Selector de idioma tipo rueda — marginTop negativo compensa el
              aire transparente que trae el propio PNG del logo debajo del
              tagline (~15% de su alto, medido en el archivo real). Sin
              esto, la separación visual queda mucho más grande de lo que
              indica el CSS, porque parte del "espacio" ya viene dibujado
              (en blanco) dentro de la imagen misma. */}
          <div style={{marginTop:'clamp(-35px,calc(-6.05vw + 15px),-19px)',marginBottom:18,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>

            <div style={{display:'flex',alignItems:'center',gap:4,padding:'4px',borderRadius:50,background:'var(--s1)',animation:'wheel-glow 4s ease-in-out infinite'}}>
              {LANGS.map((l)=>{
                const isActive=lang===l.code;
                return(
                  <button key={l.code} onClick={()=>setLang(l.code)}
                    className="wheel-item"
                    style={{
                      padding:'8px 16px',
                      borderRadius:40,cursor:'pointer',
                      background:isActive?'var(--bd2)':'transparent',
                      transition:'background .25s',
                    }}>
                    <span style={{fontSize:'var(--fs-sm)',fontWeight:isActive?700:400,
                      color:isActive?'#e0a458':'rgba(255,255,255,.55)',whiteSpace:'nowrap',
                      fontFamily:"var(--font-body)",transition:'color .2s'}}>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div style={{textAlign:'center',marginBottom:10,padding:'0 8px'}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:200,fontSize:'calc(var(--fs-display) * 0.95 + 4px)',color:'#ffffff',marginBottom:10,lineHeight:1.1}}>
              {tl.choose}
            </div>
          </div>

          {/* Tarjetas de modo — Banda izquierda, Iglesia derecha */}
          <div style={{width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:20,marginBottom:16}}>
            {[{id:'banda',data:tl.banda},{id:'iglesia',data:tl.iglesia}].map(item=>(
              <button key={item.id} onClick={()=>setAppMode(item.id)}
                className="mode-card"
                style={{
                  padding:'clamp(20px,3vw,36px) clamp(14px,2.5vw,28px) clamp(16px,2.5vw,28px)',borderRadius:18,
                  background:'var(--s1)',
                  cursor:'pointer',textAlign:'left',
                  backdropFilter:'blur(20px)',
                }}>
                <div style={{fontSize:'clamp(7px,1.2vw,10px)',fontWeight:900,color:'var(--ac)',letterSpacing:'2px',marginBottom:10,fontFamily:"var(--font-body)"}}>
                  {item.data.tag}
                </div>
                <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'clamp(22px,4vw,32px)',color:'var(--ac)',marginBottom:14,lineHeight:1}}>
                  {item.data.title}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {item.data.lines.map((line,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6}}>
                      <div style={{width:4,height:4,borderRadius:'50%',background:'var(--ac)',flexShrink:0,marginTop:5}}/>
                      <span style={{fontSize:'clamp(9px,1.3vw,12px)',color:'var(--ac)',opacity:.75,lineHeight:1.6,fontWeight:300,fontFamily:"var(--font-body)"}}>{line}</span>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:14,fontSize:'var(--fs-sm)',fontWeight:700,color:'var(--ac)',display:'flex',alignItems:'center',gap:4,fontFamily:"var(--font-body)"}}>
                  Entrar <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            ))}
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
            <img className="logo-horiz" src={theme==='blue-lava'?'/LOGO horiz  oscuro.png':'/LOGO2 horiz blanco.png'} alt="SetSync"/>
            <img className="logo-fav"   src="/FAVICON SS.png"        alt="SS"/>
          </div>
        </div>
        <div className="sb-nav">
          {BNS.map(n=>(
            <div key={n.id} className={`ni${view===n.id?' on':''}`} onClick={()=>goToView(n.id)}>
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
              <div style={{fontSize:'var(--fs-xs)',color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700,fontFamily:"var(--font-body)",opacity:.7}}>Super Admin</div>
            </div>
          </div>
        </div>
      </nav>

      <main className={`main${sbCol?' col':''}`}>
        <div className="pw">
          {view==='inicio'&&(
            <Inicio mode={appMode} lang={lang} userRole={userRole}
              equipos={equipos} personas={personas} eventos={eventos} ensayos={ensayos}
              planActivo={planActivo} planId={planId} viaEquipo={viaEquipo} orgPrincipal={orgPrincipal}
              tienePremiere={tienePremiere} tieneMonitoreo={tieneMonitoreo} archivosDB={archivosDB}
              onNavigate={setView}/>
          )}
          {view==='fechas'&&<AdminView mode={appMode} activeSunday={activeSunday} userRole={userRole}
            onLive={()=>{const sl=SETLISTS[activeSunday]||[];if(sl.length>0)abrirSongDesdeEvento(0,sl);}}
            onToast={showToast}
            onSelectDay={(day,mes)=>{setActiveSunday(day);if(mes!==undefined)setMesNav(mes);}}
            onOpenFecha={(day,mes)=>{setActiveSunday(day);if(mes!==undefined)setMesNav(mes);setView('misetlist');}}
            onAbrirFecha={abrirFecha}
            mesNav={mesNav} lang={lang}
            eventos={eventos} onOpenSong={abrirSongDesdeEvento} equipos={equipos} personas={personas} ensayos={ensayos}/>}
          {view==='misetlist'&&<MiSetlist
            fecha={fechaAbierta||{origen:'legacy',id:`legacy-${activeSunday}`,nombre:`Domingo ${activeSunday}`,fechaStr:null,lugar:'Iglesia Central',hora:'10:00',setlist:SETLISTS[activeSunday]||[]}}
            onOpenSong={i=>abrirSongDesdeEvento(i,(fechaAbierta||{}).setlist||SETLISTS[activeSunday]||[])}
            onLive={()=>{const sl=(fechaAbierta||{}).setlist||SETLISTS[activeSunday]||[];if(sl.length>0)abrirSongDesdeEvento(0,sl);}}
            userRole={userRole} onToast={showToast} lang={lang}
            equipos={equipos} personas={personas} variacionesDB={variacionesDB} ensayos={ensayos}/>}
          {view==='repertorio'&&<Cancionero mode={appMode} onOpenSong={abrirSongDesdeRepertorio} userRole={userRole} lang={lang} onToast={showToast} onSaveChords={handleSaveChords} variacionesDB={variacionesDB} setVariacionesDB={setVariacionesDB} archivosDB={archivosDB} setArchivosDB={setArchivosDB} estructurasDB={estructurasDB} setEstructurasDB={setEstructurasDB} colecciones={colecciones} setColecciones={setColecciones} persistirColeccion={persistirColeccion} contentDB={contentDB} importDB={importDB} setImportDB={setImportDB} songParaEditar={songParaEditar} onSongParaEditarConsumido={()=>setSongParaEditar(null)}/>}
          {view==='premiere'&&(tienePremiere?<PremiereView onToast={showToast} lang={lang}/>:<div style={{padding:24,textAlign:'center',color:'var(--tx3)',fontSize:'var(--fs-lg)',fontFamily:"var(--font-body)"}}>{mensajeUpgrade('premiereExclusivas',lang)}</div>)}
          {view==='monitoreo'&&<Monitoreo lang={lang} onToast={showToast}/>}
          {view==='backstage'&&<BackstageView userRole={userRole} onToast={showToast} mode={appMode}
            onSetTheme={setTheme} onGetTheme={()=>theme} eventos={eventos} setEventos={setEventos} lang={lang} ensayos={ensayos} setEnsayos={setEnsayos}
            equipos={equipos} setEquipos={setEquipos} persistirEquipo={persistirEquipo} persistirEvento={persistirEvento}
            guardarSetlistEnEvento={guardarSetlistEnEvento} onLangChange={setLang}
            online={online} setOnline={setOnline} firebaseListo={firebaseListo}
            planId={planId} setPlanId={setPlanId} planActivo={planActivo}
            viaEquipo={viaEquipo} orgPrincipal={orgPrincipal} orgsDelUsuario={orgsDelUsuario}
            tienePremiere={tienePremiere} tieneMonitoreo={tieneMonitoreo}
            variacionesDB={variacionesDB}
            currentUser={currentUser} onCerrarSesion={()=>{limpiarAccountIdOverride();cerrarSesion();}}
            persistirEnsayo={persistirEnsayo}
            navResetKey={backstageKey}
            onNavigate={setView}/>}
          <Footer/>
        </div>
      </main>
      <nav className="bot">
        {BNS.map(n=>(
          <div key={n.id} className={`bn${view===n.id?' on':''}`} onClick={()=>goToView(n.id)}>
            <NavIco id={n.id} active={view===n.id}/><span className="bn-lb">{n.label}</span>
          </div>
        ))}
      </nav>

      {songView!==null&&songViewSongs&&songViewSongs.length>0&&(
        <>
          <ErrorBoundary onReset={()=>{setSongView(null);setSongViewSongs(null);}}>
            <SongView songs={songViewSongs} startIdx={songView} onClose={()=>{setSongView(null);setSongViewSongs(null);}}
              theme={theme} isAdmin={isAdmin} onSaveChords={handleSaveChords} contentDB={contentDB} lang={lang}
              sidebarVisible={false} sidebarCollapsed={sbCol} ensayosDisponibles={ensayos}
              archivosDB={archivosDB} setArchivosDB={setArchivosDB} variacionesDB={variacionesDB} estructurasDB={estructurasDB}
              accountId={accountId} authListo={currentUser!==undefined}
              miNombre={currentUser?.displayName||currentUser?.email||'Líder'}
              onEditInCancionero={(nombreCancion)=>{
                setSongView(null);setSongViewSongs(null);
                setSongParaEditar(nombreCancion);
                setView('repertorio');
              }}/>
          </ErrorBoundary>
          {(tieneClick||tieneMultitracks)&&(
            <div style={{position:'fixed',bottom:80,right:16,zIndex:60,width:240,display:'flex',flexDirection:'column',gap:8}}>
              {mostrarMultitracks&&tieneMultitracks&&(
                <Multitracks tracks={[]} lang={lang} onToast={showToast}/>
              )}
              {tieneClick&&<Click songBpm={songViewSongs[songView]?.bpm} lang={lang}/>}
              {tieneMultitracks&&(
                <button onClick={()=>setMostrarMultitracks(v=>!v)}
                  style={{padding:'7px 10px',borderRadius:10,background:'var(--s1)',
                    color:'var(--tx2)',fontSize:'var(--fs-subtitle)',fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)"}}>
                  {mostrarMultitracks?tx.hideTracks:tx.showTracks}
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
