import { t as getT } from '../i18n';
// Cancionero: catálogo de canciones (Iglesia/Banda), partituras MusicXML/PDF,
// importación, edición y vista de equipos.
import { getModoFeatures } from '../data/modo';
import { useState, useEffect, useRef } from 'react';
import { CANCIONES } from '../data/constants';
import { playMusicXML, MusicXMLViewer } from './MusicXMLViewer';
import { CustomSelect } from './common';
import { BLOQUES_CHIPS, getColorBloque, abrevBloque, parseBloques } from './songview/estructura';
import { BloqueFranjas, parseStackedLine } from './songview/EditorAcordes';
import { detectarTonalidad } from '../utils/music';
import { extraerTextoDeArchivo } from '../utils/fileExtract';
import { parseCancionDesdeTexto } from '../utils/importParser';

export function Cancionero({mode,onOpenSong,userRole='superadmin',lang='es',onToast=()=>{},onSaveChords=()=>{},variacionesDB={},setVariacionesDB=()=>{},archivosDB={},setArchivosDB=()=>{},estructurasDB={},setEstructurasDB=()=>{},colecciones=[],setColecciones=()=>{},persistirColeccion=()=>{},contentDB={},importDB={},setImportDB=()=>{},songParaEditar=null,onSongParaEditarConsumido=()=>{}}){
  const tx=getT(lang);
  const feat=getModoFeatures(mode);
  const isAdmin=userRole==='superadmin'||userRole==='leader';
  const [filter,setFilter]=useState('');
  const [bv,setBv]=useState(false); // false=lista, true=BPM
  const [tab,setTab]=useState('mi'); // 'mi' | 'universal'
  const [showCrear,setShowCrear]=useState(false);
  const [nueva,setNueva]=useState({nombre:'',autor:'',key:'G',bpm:'',bloques:[],estructura:[]});
  const keyTocadaManualRef=useRef(false); // true apenas el usuario toca el selector de tonalidad — a partir de ahí, la auto-detección deja de proponer cambios
  const volverASongViewRef=useRef(null); // nombre de la canción si el editor se abrió desde el botón "Editar" de SongView — al volver, reabre esa canción en vez de ir a la lista

  // ── Auto-detección de tonalidad ─────────────────────────────────────────
  // Mientras el usuario no haya tocado el selector "G" a mano, cada vez que
  // cambian los acordes de algún bloque se recalcula la tónica más probable
  // (heurística de teoría musical en utils/music.js, sin IA) y se propone
  // como valor del selector. Apenas el usuario elige una tonalidad distinta
  // a mano, keyTocadaManualRef queda en true y este efecto deja de tocar
  // nueva.key — la sugerencia nunca pisa una elección explícita.
  useEffect(()=>{
    if(keyTocadaManualRef.current)return;
    const todosLosAcordes=[];
    nueva.bloques.forEach(b=>{
      (b.contenido||'').split('\n').forEach(line=>{
        parseStackedLine(line).forEach(c=>{ if(c.chord)todosLosAcordes.push(c.chord); });
      });
    });
    if(todosLosAcordes.length<2)return; // muy pocos acordes todavía, esperar a tener más señal
    const sugerida=detectarTonalidad(todosLosAcordes);
    if(sugerida&&sugerida!==nueva.key){
      setNueva(v=>({...v,key:sugerida}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[nueva.bloques]);
  // Contador simple para ids únicos de bloques dentro de esta sesión de carga
  const bloqueIdRef=useRef(0);
  // Tap tempo — para identificar BPM tocando el ritmo con el dedo/mouse
  // en vez de adivinar el número. tapsRef guarda timestamps (no re-renderea
  // en cada tap); tapCount solo se usa para el feedback visual del punto.
  const tapsRef=useRef([]);
  const [tapCount,setTapCount]=useState(0);
  const handleTap=()=>{
    const now=performance.now();
    const taps=tapsRef.current;
    // Si pasó más de 2s desde el último tap, es un tap nuevo (reinicia)
    if(taps.length&&now-taps[taps.length-1]>2000) taps.length=0;
    taps.push(now);
    if(taps.length>8) taps.shift(); // solo los últimos 8 taps para que el promedio reaccione a cambios de tempo
    setTapCount(taps.length);
    if(taps.length>=2){
      const intervals=[];
      for(let i=1;i<taps.length;i++) intervals.push(taps[i]-taps[i-1]);
      const avgMs=intervals.reduce((a,b)=>a+b,0)/intervals.length;
      const bpm=Math.round(60000/avgMs);
      if(bpm>=40&&bpm<=300) setNueva(v=>({...v,bpm:String(bpm)}));
    }
  };
  const [partituras,setPartituras]=useState([]);
  const [partituraSel,setPartituraSel]=useState(null);
  const [midiPlaying,setMidiPlaying]=useState(false);
  const [crearModo,setCrearModo]=useState(null);
  // ── Import local (rule-based, sin IA) — batch multi-archivo ─────────────
  // archivosImport: [{id, nombreArchivo, status:'procesando'|'ok'|'error',
  // nombre, autor, texto, warnings:[], error, incluir:bool}] — una fila por
  // archivo subido. importResumen se llena solo DESPUÉS de confirmar el
  // batch, para mostrar la pantalla de resumen final.
  const [archivosImport,setArchivosImport]=useState([]);
  const [importProcesando,setImportProcesando]=useState(false);
  const [importResumen,setImportResumen]=useState(null);
  // Cuando se abre el editor manual sobre una canción con
  // importStatus:'sin_revisar' (viene de songParaEditar), acá quedan sus
  // importWarnings para mostrarlas arriba del editor — ver useEffect de
  // precarga más abajo y el punto 3 de la spec de revisión.
  const [avisosImportEdicion,setAvisosImportEdicion]=useState(null);

  // ── Precarga del editor manual cuando se llega desde "Editar" en SongView ──
  // Antes, el botón "Editar" de SongView solo activaba un modo de arrastre
  // interno (drag-to-reposition, poco confiable). Ahora navega hasta acá con
  // el nombre de la canción, y este efecto reconstruye nueva.bloques a partir
  // del texto real guardado en contentDB — usando el mismo parser (parseBloques)
  // que ya usa el resto de la app, así la reconstrucción usa exactamente el
  // mismo criterio de "qué es un bloque" que el guardado y el render.
  useEffect(()=>{
    if(!songParaEditar)return;
    const raw=contentDB[songParaEditar]||'';
    const bloquesParsed=parseBloques(raw);
    const bloquesUI=bloquesParsed.map(b=>{
      const id=++bloqueIdRef.current;
      return{id,label:b.label,color:getColorBloque(b.label),contenido:(b.lines||[]).join('\n').trim()};
    });
    // Primeras 2 líneas no-bloque del raw son nombre/autor por convención de guardar()
    const lineasCabecera=raw.split('\n\n')[0]?.split('\n')||[];
    const nombrePrevio=lineasCabecera[0]||songParaEditar;
    const autorPrevio=lineasCabecera[1]||'';
    // El mapa/estructura en vivo (con repeticiones, ej. INT V2 V3 INST P INT V2)
    // vive aparte en estructurasDB, no en el orden de los bloques de letra —
    // esa es la fuente real que arma el usuario a mano en "Estructura en vivo".
    // Si existe, se usa tal cual (preservando repeticiones); si no, se cae al
    // fallback de un chip por bloque en el orden en que aparece la letra.
    const guiasGuardadas=estructurasDB[songParaEditar]?.guias;
    const estructuraPrevia=(guiasGuardadas&&guiasGuardadas.length>0)
      ?guiasGuardadas.map((g,gi)=>({id:`e${bloqueIdRef.current}_${gi}`,label:g.label,abrev:g.abrev||abrevBloque(g.label),color:g.color||getColorBloque(g.label)}))
      :bloquesUI.map(b=>({id:`e${b.id}`,label:b.label,abrev:abrevBloque(b.label),color:b.color}));
    setNueva({
      nombre:nombrePrevio,autor:autorPrevio,key:'G',bpm:estructurasDB[songParaEditar]?.click?.bpm?String(estructurasDB[songParaEditar].click.bpm):'',
      bloques:bloquesUI,
      estructura:estructuraPrevia,
    });
    // Al editar una canción existente no queremos que la auto-detección le
    // proponga cambiar la tonalidad ya elegida — se trata como "tocada
    // manualmente" desde que se precarga.
    keyTocadaManualRef.current=true;
    volverASongViewRef.current=songParaEditar;
    // Punto 3 de la spec de revisión: si esta canción nació de un import
    // sin revisar, se muestran sus avisos arriba del editor. Chequeo exacto
    // contra 'sin_revisar' (no truthy genérico) — canciones sin entrada en
    // importDB (undefined) o ya 'revisada' no muestran nada.
    setAvisosImportEdicion(importDB[songParaEditar]?.status==='sin_revisar'?(importDB[songParaEditar].warnings||[]):null);
    setShowCrear(true);setCrearModo('manual');
    onSongParaEditarConsumido();
  },[songParaEditar]);
  // colecciones ahora es prop (levantado a App.jsx para poder sincronizar
  // con Firestore, v44-ampliación — antes vivía solo acá, se perdía al
  // recargar y no se compartía entre dispositivos)
  const [showCrearColeccion,setShowCrearColeccion]=useState(false);
  const [nuevaColeccion,setNuevaColeccion]=useState({nombre:'',color:'#c8a97e',canciones:[]});
  const [coleccionSel,setColeccionSel]=useState(null);
  const [songParaVariar,setSongParaVariar]=useState(null); // nombre de canción con selector de versión abierto
  const [nuevaVariacion,setNuevaVariacion]=useState(null); // {tipo:'letra'|'partitura', label, contenido, archivo}

  // Abre una canción: SIEMPRE muestra el selector de la carpeta primero
  // (letra/acordes original + variaciones/partituras si existen) — nunca
  // salta directo a la letra. Pedido de Danny 01-Jul-2026: una canción es
  // una carpeta, así que siempre se elige qué abrir dentro de ella.
  const abrirCancion=(name)=>{ setSongParaVariar(name); };
  // Abre el formulario de nueva variación (reemplaza el prompt() de antes —
  // ahora soporta 2 tipos: letra/acordes propios, o partitura-archivo)
  const abrirNuevaVariacion=(name)=>{
    setNuevaVariacion({cancion:name,tipo:'letra',label:'',contenido:'',archivo:null});
  };
  const guardarNuevaVariacion=()=>{
    const nv=nuevaVariacion;
    if(!nv||!nv.label?.trim())return;
    const id=`v${Date.now()}`;
    const label=nv.label.trim();
    if(nv.tipo==='partitura'){
      if(!nv.archivo){onToast({text:tx.selectAFile,sub:tx.selectAFileSub});return;}
      const url=URL.createObjectURL(nv.archivo);
      setVariacionesDB(prev=>({...prev,[nv.cancion]:[...(prev[nv.cancion]||[]),
        {id,label,tipo:'partitura',archivoUrl:url,archivoNombre:nv.archivo.name}]}));
    }else{
      setVariacionesDB(prev=>({...prev,[nv.cancion]:[...(prev[nv.cancion]||[]),{id,label,tipo:'letra'}]}));
      // Contenido propio de esta variación — mismo mecanismo que "guardar acordes"
      onSaveChords(`${nv.cancion} · ${label}`, nv.contenido||'');
    }
    onToast({text:tx.variationAdded,sub:label});
    setNuevaVariacion(null);
  };

  // Sube un track de secuencia a la carpeta de la canción (lista abierta,
  // a diferencia del track de referencia que es 1 solo slot — v35/v36)
  const agregarSecuencia=(name,file)=>{
    if(!file)return;
    const url=URL.createObjectURL(file);
    const item={id:`sq${Date.now()}`,nombre:file.name.replace(/\.[^.]+$/,''),url,size:(file.size/1024).toFixed(0)+'kb'};
    setArchivosDB(prev=>({...prev,[name]:{...(prev[name]||{trackReferencia:null,secuencia:[]}),
      secuencia:[...((prev[name]||{}).secuencia||[]),item]}}));
    onToast({text:tx.sequenceTrackAdded,sub:file.name});
  };

  const fl=CANCIONES.filter(s=>s.n.toLowerCase().includes(filter.toLowerCase()));
  const fast=fl.filter(s=>s.bpm>=120).sort((a,b)=>b.bpm-a.bpm);
  const mid=fl.filter(s=>s.bpm>=80&&s.bpm<120).sort((a,b)=>b.bpm-a.bpm);
  const slow=fl.filter(s=>s.bpm<80).sort((a,b)=>b.bpm-a.bpm);

  // UNIVERSAL — demo canciones de otros equipos
  const UNIVERSAL=[
    {n:'10,000 RAZONES',bpm:76,key:'G',autor:'Matt Redman',equipo:'Iglesia Gracia, Stgo'},
    {n:'ERES TODOPODEROSO',bpm:84,key:'A',autor:'Marcos Witt',equipo:'Casa de Dios, Viña'},
    {n:'RENUÉVAME',bpm:72,key:'D',autor:'Marcos Witt',equipo:'Iglesia Uno, CL'},
    {n:'DIGNO DE ALABANZA',bpm:90,key:'G',autor:'Luis Enrique Espinoza',equipo:'ICF Santiago'},
    {n:'SUBLIME GRACIA',bpm:68,key:'G',autor:'John Newton',equipo:'Iglesia Vida Nueva'},
    {n:'CUÁN GRANDE ES ÉL',bpm:64,key:'C',autor:'Stuart K. Hine',equipo:'Misión Paz, Valpo'},
    {n:'GLORIOSO',bpm:96,key:'D',autor:'Redimi2',equipo:'Elim Church CL'},
    {n:'SOPLANDO VIDA',bpm:82,key:'E',autor:'Marcos Brunet',equipo:'IPC Concepción'},
  ];

  const Sec=({title,range,type,songs})=>!songs.length?null:(
    <div className={`bpm-sec ${type}`}>
      <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
        <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:500,fontSize:13,color:'var(--tx)'}}>{title}</span>
        <span style={{fontSize:9,color:'var(--tx3)',fontWeight:500,background:'var(--s1)',border:'1px solid var(--bd)',padding:'2px 6px',borderRadius:100}}>{range}</span>
      </div>
      <div className={`bpm-bar ${type}`}/>
      <div className="sg">
        {songs.map(s=><SongCard key={s.n} s={s}/>)}
      </div>
    </div>
  );

  // Chip/tarjeta de canción — componente único reutilizado en las 3 vistas
  // (lista, por BPM, colecciones). Antes estaba triplicado con lógica
  // distinta en cada una (una de ellas ni siquiera tenía el folder-chip).
  // v36-ampliación: folder-chip más grande y centrado, con conteo de
  // archivos de la carpeta (1 = original + variaciones/partituras).
  const SongCard=({s})=>{
    const arch=archivosDB[s.n]||{};
    const totalArchivos=1+(variacionesDB[s.n]||[]).length+(arch.secuencia||[]).length+(arch.trackReferencia?1:0); // 1 = original (letra/acordes)
    const hayExtra=totalArchivos>1;
    // Chequeo exacto contra 'sin_revisar' — undefined (canción manual/de
    // fábrica) o 'revisada' nunca muestran el badge. Punto 2 de la spec.
    const porRevisar=importDB[s.n]?.status==='sin_revisar';
    const conteoAvisos=(importDB[s.n]?.warnings||[]).length;
    return(
      <div className="scard" onClick={()=>abrirCancion(s.n)} style={{cursor:'pointer',position:'relative'}}>
        {porRevisar&&(
          <div title={conteoAvisos>0?`${conteoAvisos} aviso${conteoAvisos===1?'':'s'} del parser para revisar`:'Importada automáticamente, sin revisar todavía'}
            style={{position:'absolute',top:6,left:6,padding:'2px 7px',borderRadius:100,
              background:'rgba(224,160,32,.15)',border:'1px solid rgba(224,160,32,.35)',
              fontSize:8,fontWeight:800,color:'#e0a020',fontFamily:"'Lexend Giga',sans-serif",
              letterSpacing:.3,zIndex:1}}>
            Por revisar{conteoAvisos>0?` (${conteoAvisos})`:''}
          </div>
        )}
        <div className="scard-n" style={{paddingRight:32,paddingTop:porRevisar?14:0}}>{s.n}</div>
        <div className="scard-s">{s.key} · <span style={{color:'var(--tx3)',fontWeight:600}}>{s.bpm} BPM</span></div>
        <button onClick={e=>{e.stopPropagation();setSongParaVariar(s.n);}}
          title="Ver carpeta de esta canción"
          style={{position:'absolute',top:6,right:6,display:'flex',flexDirection:'column',
            alignItems:'center',gap:1,background:'none',border:'none',cursor:'pointer',padding:0}}>
          <div style={{width:24,height:24,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
            background:hayExtra?'rgba(200,169,126,.15)':'var(--s3)'}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke={hayExtra?'var(--ac)':'var(--tx3)'} strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span style={{fontSize:8,fontWeight:700,color:hayExtra?'var(--ac)':'var(--tx3)'}}>{totalArchivos}</span>
        </button>
      </div>
    );
  };

  // MODAL CREAR CANCIÓN
  if(showCrear)return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}}
        onClick={()=>{setShowCrear(false);setCrearModo(null);}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="var(--tx2)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Canciones</span>
      </div>

      {/* Selector de modo si no hay uno elegido */}
      {crearModo===null&&(
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
            fontSize:20,color:'var(--tx)',marginBottom:4}}>
            Subir canción/carpeta
          </div>
          <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:24,lineHeight:1.5}}>
            En Setsync una canción es una carpeta. Dentro podrás agregar variaciones, partituras por instrumento y audios de referencia.
          </div>
          {/* Opción 1: Manual */}
          <div onClick={()=>{setCrearModo('manual');setAvisosImportEdicion(null);}}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'rgba(200,169,126,.1)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="var(--ac)" strokeWidth="1.5">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                fontFamily:"'Lexend Giga',sans-serif",marginBottom:3}}>
                Ingresar letra y acordes
              </div>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4}}>
                Escribe la letra con acordes en formato ChordPro. 
                Soporta transposición automática.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          {/* Opción 2: Import local — .txt/.docx/.pdf, batch, parser por reglas (sin IA) */}
          <div onClick={()=>{setCrearModo('importar');setArchivosImport([]);setImportResumen(null);}}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'rgba(48,192,183,.1)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="var(--gn)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                fontFamily:"'Lexend Giga',sans-serif",marginBottom:3}}>
                Importar archivos
              </div>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4}}>
                Sube varios archivos <strong style={{color:'var(--gn)'}}>.txt, .docx o .pdf</strong> desde tu dispositivo y se convierten automáticamente. Cada canción queda marcada para revisar.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          {/* Opción 3: Drive masivo (enlace de Drive) */}
          <div onClick={()=>setCrearModo('drive')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'var(--s1)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="var(--tx3)" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                fontFamily:"'Lexend Giga',sans-serif",marginBottom:3}}>
                Subir por Drive
              </div>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4}}>
                Conecta una carpeta de Google Drive con archivos .txt o .xml 
                y carga todo el repertorio de una vez.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          {/* Opción 3: Partitura */}
          <div onClick={()=>setCrearModo('partitura')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'rgba(94,206,160,.1)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="var(--gn)" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                fontFamily:"'Lexend Giga',sans-serif",marginBottom:3}}>
                Subir partitura
              </div>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4}}>
                <strong style={{color:'var(--gn)'}}>MusicXML</strong> — transposición + reproducción MIDI.{' '}
                <strong style={{color:'var(--rd)'}}>PDF</strong> — visualización directa.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      )}

      {/* Modo manual — editor por bloques con chips */}
      {crearModo==='manual'&&(()=>{
        const agregarBloque=(label)=>{
          const id=++bloqueIdRef.current;
          const color=getColorBloque(label.toUpperCase());
          const abrev=abrevBloque(label);
          setNueva(v=>({...v,
            bloques:[...v.bloques,{id,label,color,contenido:''}],
            estructura:[...v.estructura,{id:`e${id}`,label,abrev,color}],
          }));
        };
        const eliminarBloque=(id)=>setNueva(v=>({...v,
          bloques:v.bloques.filter(b=>b.id!==id),
          estructura:v.estructura.filter(s=>s.id!==`e${id}`),
        }));
        const moverBloque=(idx,dir)=>setNueva(v=>{
          const arr=[...v.bloques];const to=idx+dir;
          if(to<0||to>=arr.length)return v;
          [arr[idx],arr[to]]=[arr[to],arr[idx]];return{...v,bloques:arr};
        });
        const moverEstructura=(idx,dir)=>setNueva(v=>{
          const arr=[...v.estructura];const to=idx+dir;
          if(to<0||to>=arr.length)return v;
          [arr[idx],arr[to]]=[arr[to],arr[idx]];return{...v,estructura:arr};
        });
        const guardar=()=>{
          const nombre=nueva.nombre.trim().toUpperCase();
          if(!nombre||nueva.bloques.length===0)return;
          const texto=[
            `${nombre}\n${nueva.autor.trim()}\n`,
            ...nueva.bloques.filter(b=>b.contenido.trim())
              .map(b=>`=== ${b.label.toUpperCase()} ===\n${b.contenido.trim()}`)
          ].join('\n\n');
          CANCIONES.push({n:nombre,key:nueva.key,bpm:Number(nueva.bpm)||90,autor:nueva.autor.trim()});
          onSaveChords(nombre,texto);
          // Punto 4 de la spec de revisión: guardar desde el editor ES la
          // confirmación — sin botón separado de "marcar como revisada".
          // Solo toca importDB si la canción ya tenía una entrada
          // 'sin_revisar'; canciones manuales (sin entrada) no se tocan.
          if(importDB[nombre]?.status==='sin_revisar'){
            setImportDB(prev=>({...prev,[nombre]:{...prev[nombre],status:'revisada'}}));
          }
          setAvisosImportEdicion(null);
          if(nueva.estructura.length>0)
            setEstructurasDB(prev=>({...prev,[nombre]:{
              guias:nueva.estructura.map(s=>({label:s.label,abrev:s.abrev||abrevBloque(s.label),color:s.color})),
              click:{bpm:Number(nueva.bpm)||90,compas:'4/4'},
            }}));
          onToast(`✓ ${nueva.nombre.trim()} agregada`);
          setShowCrear(false);setCrearModo(null);
          setNueva({nombre:'',autor:'',key:'G',bpm:'',bloques:[],estructura:[]});
          keyTocadaManualRef.current=false;
          tapsRef.current=[];setTapCount(0);
          if(volverASongViewRef.current){
            const nombrePrevio=volverASongViewRef.current;
            volverASongViewRef.current=null;
            onOpenSong(nombrePrevio);
          }
        };
        const otroLabel=nueva.__otroLabel??false;
        return(
          <div>
            {/* Volver — si se llegó desde el botón "Editar" de SongView, vuelve a esa canción en vez de a la lista */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,cursor:'pointer'}}
              onClick={()=>{
                const nombrePrevio=volverASongViewRef.current;
                setCrearModo(null);
                setAvisosImportEdicion(null);
                if(nombrePrevio){
                  volverASongViewRef.current=null;
                  onOpenSong(nombrePrevio);
                }
              }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              <span style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:'var(--fs-title1)',color:'var(--tx)'}}>
                {volverASongViewRef.current?'Volver a la canción':'Editor de canciones'}
              </span>
            </div>
            {/* Punto 3 de la spec de revisión: si esta canción vino de un import
                sin revisar, sus avisos van arriba del editor, antes que nada más. */}
            {avisosImportEdicion!==null&&(
              <div style={{padding:'12px 14px',borderRadius:12,marginBottom:16,
                background:'rgba(224,160,32,.08)',border:'1px solid rgba(224,160,32,.25)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:avisosImportEdicion.length>0?8:0}}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#e0a020" strokeWidth="2" style={{flexShrink:0}}>
                    <path d="M12 9v4"/><path d="M12 17h.01"/>
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  </svg>
                  <span style={{fontSize:12,fontWeight:800,color:'#e0a020',fontFamily:"'Lexend Giga',sans-serif"}}>
                    Canción importada — por revisar
                  </span>
                </div>
                {avisosImportEdicion.length>0?(
                  <ul style={{margin:0,paddingLeft:18,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.6}}>
                    {avisosImportEdicion.map((w,i)=><li key={i}>{w}</li>)}
                  </ul>
                ):(
                  <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.6}}>
                    El parser no reportó avisos puntuales, pero es por reglas — dale una revisada igual antes de tocarla en vivo.
                  </div>
                )}
                <div style={{fontSize:10,color:'var(--tx3)',marginTop:8,fontFamily:"'Lexend Giga',sans-serif"}}>
                  Al guardar, esta canción queda marcada como revisada.
                </div>
              </div>
            )}
            <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:16,lineHeight:1.6}}>
              En SetSync hacemos que tus letras sean lo más claras posibles y tenemos un formato por secciones. Carga una sección y llénala con letra y posiciona las notas.
            </div>

            {/* Info */}
            <div className="card" style={{padding:14,marginBottom:20}}>
              <input value={nueva.nombre} onChange={e=>setNueva(v=>({...v,nombre:e.target.value}))}
                placeholder="Título canción"
                style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box'}}/>
              <input value={nueva.autor} onChange={e=>setNueva(v=>({...v,autor:e.target.value}))}
                placeholder="Compositor / detalles"
                style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box'}}/>
              <div style={{display:'flex',gap:8}}>
                <CustomSelect value={nueva.key} onChange={v=>{keyTocadaManualRef.current=true;setNueva(vv=>({...vv,key:v}));}}
                  style={{flex:1,fontSize:13}}
                  options={['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k=>({value:k,label:k}))}/>
                <input value={nueva.bpm} onChange={e=>setNueva(v=>({...v,bpm:e.target.value}))}
                  placeholder="BPM" type="number"
                  style={{flex:1,padding:'9px 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx)',fontSize:13}}/>
                <button type="button" onClick={handleTap}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    gap:2,width:56,padding:'6px 4px',borderRadius:8,flexShrink:0,border:'1px solid var(--bd)',
                    background:tapCount>0?'rgba(48,192,183,.12)'  :'var(--s2)',color:tapCount>0?'var(--gn)'  :'var(--tx2)',
                    cursor:'pointer',fontSize:9,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",transition:'background .15s,color .15s'}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:tapCount>0?'var(--gn)'  :'var(--tx3)'}}/>TAP
                </button>
              </div>
            </div>

            {/* Secciones — chips (sin encabezado "Secciones", el subtítulo de arriba ya lo explica) */}
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
              {BLOQUES_CHIPS.map(chip=>(
                <button key={chip.label} onClick={()=>agregarBloque(chip.label)}
                  style={{padding:'6px 14px',borderRadius:100,border:`1.5px solid ${chip.color}`,
                    background:`${chip.color}18`,color:chip.color,
                    fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  + {chip.label}
                </button>
              ))}
              {otroLabel===false?(
                <button onClick={()=>setNueva(p=>({...p,__otroLabel:''}))}
                  style={{padding:'6px 14px',borderRadius:100,border:'1.5px dashed var(--bd)',background:'transparent',
                    color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  + Otro
                </button>
              ):(
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input autoFocus value={otroLabel}
                    onChange={e=>setNueva(p=>({...p,__otroLabel:e.target.value}))}
                    onKeyDown={e=>{
                      if(e.key==='Enter'&&otroLabel.trim()){agregarBloque(otroLabel.trim());setNueva(p=>({...p,__otroLabel:false}));}
                      if(e.key==='Escape')setNueva(p=>({...p,__otroLabel:false}));
                    }}
                    placeholder="Nombre de la sección"
                    style={{padding:'5px 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx)',fontSize:12,width:160}}/>
                  <button onClick={()=>{if(otroLabel.trim())agregarBloque(otroLabel.trim());setNueva(p=>({...p,__otroLabel:false}));}}
                    style={{padding:'5px 10px',borderRadius:8,background:'var(--gn)',color:'#000',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>+</button>
                </div>
              )}
            </div>

            {/* Bloques creados */}
            {nueva.bloques.length===0?(
              <div style={{textAlign:'center',padding:'24px 0',color:'var(--tx2)',fontSize:'var(--fs-subtitle)',
                fontFamily:"'Lexend Giga',sans-serif",border:'1px dashed var(--bd)',borderRadius:12,marginBottom:20}}>
                Toca un chip para empezar
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                {nueva.bloques.map((bloque,bi)=>(
                  <div key={bloque.id} style={{borderRadius:12,overflow:'hidden',border:`1.5px solid ${bloque.color}40`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
                      background:`${bloque.color}20`,borderBottom:`1px solid ${bloque.color}30`}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:bloque.color,flexShrink:0}}/>
                      <span style={{flex:1,fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:700,
                        color:bloque.color,textTransform:'uppercase',letterSpacing:'.5px'}}>{bloque.label}</span>
                      <button onClick={()=>moverBloque(bi,-1)} disabled={bi===0}
                        style={{width:22,height:22,borderRadius:5,border:'none',
                          background:bi===0?'transparent':'var(--s3)',color:bi===0?'var(--bd)':'var(--tx2)',
                          cursor:bi===0?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button onClick={()=>moverBloque(bi,1)} disabled={bi===nueva.bloques.length-1}
                        style={{width:22,height:22,borderRadius:5,border:'none',
                          background:bi===nueva.bloques.length-1?'transparent':'var(--s3)',
                          color:bi===nueva.bloques.length-1?'var(--bd)':'var(--tx2)',
                          cursor:bi===nueva.bloques.length-1?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <button onClick={()=>eliminarBloque(bloque.id)}
                        style={{width:22,height:22,borderRadius:5,border:'none',background:'transparent',
                          color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:2}}>
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                    <BloqueFranjas
                      contenido={bloque.contenido}
                      onChange={(val)=>setNueva(v=>({...v,bloques:v.bloques.map(b=>b.id===bloque.id?{...b,contenido:val}:b)}))}
                      placeholderLetra={`Escribe o pega la letra del ${bloque.label}...`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Estructura de interpretación */}
            {nueva.bloques.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,
                  color:'var(--tx)',marginBottom:4}}>
                  Estructura en vivo
                </div>
                <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:14,lineHeight:1.5}}>
                  El orden real de interpretación. Toca un chip para agregarlo — así
                  se verá en el mapa de SetSync.
                </div>

                {/* Preview del mapa — igual visual que MapaMaestro en SongView */}
                {nueva.estructura.length>0&&(
                  <div style={{
                    display:'flex',alignItems:'stretch',height:32,
                    borderRadius:8,overflow:'hidden',
                    border:'1px solid var(--bd)',marginBottom:12,
                  }}>
                    {nueva.estructura.map((sec,si)=>{
                      const pct=100/nueva.estructura.length;
                      return(
                        <div key={sec.id} style={{
                          flex:`0 0 ${pct}%`,
                          background:`${sec.color}30`,
                          borderRight:si<nueva.estructura.length-1?`1px solid ${sec.color}50`:'none',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontFamily:"'Lexend Giga',sans-serif",fontSize:9,fontWeight:900,
                          color:sec.color,overflow:'hidden',whiteSpace:'nowrap',
                          letterSpacing:'.5px',
                        }}>
                          {sec.abrev||abrevBloque(sec.label)}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Lista de chips de estructura — desplazables y duplicables */}
                {nueva.estructura.length>0&&(
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                    {nueva.estructura.map((sec,si)=>(
                      <div key={sec.id} style={{
                        display:'flex',alignItems:'center',gap:0,
                        borderRadius:100,overflow:'hidden',
                        border:`1.5px solid ${sec.color}`,
                      }}>
                        {/* Chip principal con abreviación */}
                        <div style={{
                          padding:'5px 10px',
                          background:`${sec.color}20`,
                          fontFamily:"'Lexend Giga',sans-serif",
                          fontSize:11,fontWeight:900,color:sec.color,
                          letterSpacing:'.5px',minWidth:28,textAlign:'center',
                        }}>
                          {sec.abrev||abrevBloque(sec.label)}
                        </div>
                        {/* Acciones: mover izq, duplicar, mover der, eliminar */}
                        {si>0&&(
                          <button onClick={()=>moverEstructura(si,-1)}
                            title="Mover izquierda"
                            style={{width:22,height:'100%',border:'none',
                              borderLeft:`1px solid ${sec.color}40`,
                              background:`${sec.color}10`,color:sec.color,
                              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <svg viewBox="0 0 24 24" width="9" height="9" fill="none"
                              stroke="currentColor" strokeWidth="2.5">
                              <polyline points="15 18 9 12 15 6"/>
                            </svg>
                          </button>
                        )}
                        <button onClick={()=>{
                          const id=`e${++bloqueIdRef.current}`;
                          setNueva(v=>{
                            const arr=[...v.estructura];
                            arr.splice(si+1,0,{id,label:sec.label,abrev:sec.abrev,color:sec.color});
                            return{...v,estructura:arr};
                          });
                        }} title="Duplicar"
                          style={{width:22,height:'100%',border:'none',
                            borderLeft:`1px solid ${sec.color}40`,
                            background:`${sec.color}10`,color:sec.color,
                            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <svg viewBox="0 0 24 24" width="9" height="9" fill="none"
                            stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                        {si<nueva.estructura.length-1&&(
                          <button onClick={()=>moverEstructura(si,1)}
                            title="Mover derecha"
                            style={{width:22,height:'100%',border:'none',
                              borderLeft:`1px solid ${sec.color}40`,
                              background:`${sec.color}10`,color:sec.color,
                              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <svg viewBox="0 0 24 24" width="9" height="9" fill="none"
                              stroke="currentColor" strokeWidth="2.5">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </button>
                        )}
                        <button onClick={()=>setNueva(v=>({...v,
                          estructura:v.estructura.filter((_,i)=>i!==si)}))}
                          title="Quitar"
                          style={{width:22,height:'100%',border:'none',
                            borderLeft:`1px solid ${sec.color}40`,
                            background:`${sec.color}10`,color:sec.color,
                            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <svg viewBox="0 0 24 24" width="9" height="9" fill="none"
                            stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chips para agregar a la estructura */}
                <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:8,
                  fontFamily:"'Lexend Giga',sans-serif"}}>
                  Tocar para agregar:
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {nueva.bloques.map(b=>{
                    const abrev=b.abrev||abrevBloque(b.label);
                    return(
                      <button key={b.id}
                        onClick={()=>{
                          const id=`e${++bloqueIdRef.current}`;
                          setNueva(v=>({...v,estructura:[...v.estructura,
                            {id,label:b.label,abrev,color:b.color}]}));
                        }}
                        style={{padding:'5px 12px',borderRadius:100,
                          border:`1.5px solid ${b.color}`,background:`${b.color}18`,
                          color:b.color,fontFamily:"'Lexend Giga',sans-serif",
                          fontSize:11,fontWeight:900,cursor:'pointer',letterSpacing:'.5px'}}>
                        {abrev}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botones finales */}
            <div style={{display:'flex',gap:8}}>
              <button style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid var(--bd)',
                background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:13,fontWeight:700,
                fontFamily:"'Lexend Giga',sans-serif"}}
                onClick={()=>{setCrearModo(null);setNueva({nombre:'',autor:'',key:'G',bpm:'',bloques:[],estructura:[]});keyTocadaManualRef.current=false;tapsRef.current=[];setTapCount(0);setAvisosImportEdicion(null);}}>
                Cancelar
              </button>
              <button className="btn-p"
                disabled={!nueva.nombre.trim()||nueva.bloques.length===0}
                onClick={guardar}
                style={{flex:2,padding:'11px',borderRadius:10,fontSize:13,fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Guardar canción
              </button>
            </div>
          </div>
        );
      })()}

      {/* Modo partitura */}
      {crearModo==='partitura'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,
            cursor:'pointer'}} onClick={()=>setCrearModo(null)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
            fontSize:20,color:'var(--tx)',marginBottom:6}}>
            Subir partitura
          </div>
          <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:20,lineHeight:1.6}}>
            Selecciona el formato según lo que necesites hacer con la partitura.
          </div>
          {/* Explicación formatos */}
          {[
            {fmt:'MusicXML',ext:'.xml .mxl .musicxml',color:'var(--gn)',
             desc:'Partitura digital editable. Permite transposición automática, reproducción MIDI y visualización de notas. Exporta desde MuseScore, Sibelius o Finale.'},
            {fmt:'PDF',ext:'.pdf',color:'var(--rd)',
             desc:'Partitura escaneada o exportada. Solo visualización directa, sin edición ni transposición. Útil para partituras antiguas o de editores externos.'},
          ].map(f=>(
            <div key={f.fmt} style={{padding:'14px',borderRadius:12,
              border:`1px solid ${f.color}22`,background:`${f.color}08`,
              marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:800,color:f.color,
                  fontFamily:"'Lexend Giga',sans-serif"}}>{f.fmt}</span>
                <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:700,
                  background:'var(--s2)',padding:'2px 6px',borderRadius:6}}>{f.ext}</span>
              </div>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
          <label style={{display:'flex',flexDirection:'column',alignItems:'center',
            justifyContent:'center',gap:10,padding:'24px',borderRadius:14,
            border:'2px dashed rgba(200,169,126,.3)',background:'rgba(200,169,126,.04)',
            cursor:'pointer',marginTop:8}}>
            <input type="file" accept=".xml,.mxl,.musicxml,.pdf"
              style={{display:'none'}}
              onChange={e=>{
                const file=e.target.files[0];
                if(!file)return;
                const tipo=file.name.endsWith('.pdf')?'pdf':'musicxml';
                const url=URL.createObjectURL(file);
                setPartituras(prev=>[...prev,{
                  id:Date.now(),
                  nombre:file.name.replace(/\.[^.]+$/,''),
                  tipo,url,size:(file.size/1024).toFixed(0)+'kb'
                }]);
                setShowCrear(false);setCrearModo(null);
                setTab('partituras');
              }}/>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
              stroke="rgba(200,169,126,.5)" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style={{fontSize:13,fontWeight:700,color:'var(--ac)',
              fontFamily:"'Lexend Giga',sans-serif"}}>
              Tocar para seleccionar archivo
            </div>
            <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)'}}>
              MusicXML o PDF
            </div>
          </label>
        </div>
      )}

      {/* Modo drive masivo */}
      {crearModo==='drive'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,
            cursor:'pointer'}} onClick={()=>setCrearModo(null)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
            fontSize:20,color:'var(--tx)',marginBottom:6}}>
            Subir por Drive
          </div>
          <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:20,lineHeight:1.6}}>
            Conecta una carpeta de Google Drive que contenga tus canciones y carga todo el repertorio de una vez.
          </div>
          <div style={{padding:'16px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--tx)',
              fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>Formatos soportados</div>
            {[
              {ext:'.txt',desc:'Canciones en formato ChordPro (una por archivo)'},
              {ext:'.xml / .mxl',desc:'Partituras MusicXML'},
              {ext:'.pdf',desc:'Partituras PDF'},
            ].map(f=>(
              <div key={f.ext} style={{display:'flex',gap:8,marginBottom:6}}>
                <code style={{fontSize:11,fontWeight:700,color:'var(--ac)',
                  background:'var(--s2)',padding:'2px 6px',borderRadius:4,flexShrink:0}}>
                  {f.ext}
                </code>
                <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)'}}>{f.desc}</span>
              </div>
            ))}
          </div>
          <button
            onClick={()=>{setShowCrear(false);setCrearModo(null);}}
            style={{width:'100%',padding:'12px',borderRadius:12,border:'none',
              background:'rgba(200,169,126,.12)',color:'var(--ac)',
              fontSize:13,fontWeight:700,cursor:'pointer',
              fontFamily:"'Lexend Giga',sans-serif",display:'flex',
              alignItems:'center',justifyContent:'center',gap:8}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Conectar carpeta de Drive
          </button>
          <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',textAlign:'center',
            marginTop:8,fontFamily:"'Lexend Giga',sans-serif"}}>
            Disponible en la próxima actualización
          </div>
        </div>
      )}

      {/* Modo 'importar' — batch local .txt/.docx/.pdf, parser por reglas (sin IA) */}
      {crearModo==='importar'&&(()=>{
        // Nombre único contra CANCIONES (existentes) y contra el resto del
        // batch que se está por confirmar — evita pisar una canción real
        // por una coincidencia de nombre (ej. dos archivos "Coro.txt" en
        // carpetas distintas del usuario).
        const nombreUnico=(base,yaUsados)=>{
          let candidato=base.trim().toUpperCase()||'SIN TÍTULO';
          let i=2;
          const existe=n=>CANCIONES.some(c=>c.n===n)||yaUsados.has(n);
          while(existe(candidato)) candidato=`${base.trim().toUpperCase()} (${i++})`;
          return candidato;
        };

        const procesarArchivos=async(fileList)=>{
          const files=Array.from(fileList);
          if(files.length===0)return;
          setImportProcesando(true);
          setImportResumen(null);
          const filas=files.map((f,i)=>({id:`imp${Date.now()}_${i}`,archivo:f,nombreArchivo:f.name,status:'procesando'}));
          setArchivosImport(filas);
          // Secuencial (no Promise.all) — pdfjs con varios PDF grandes en
          // paralelo puede saturar memoria en dispositivos modestos; esto
          // es import ocasional, no un flujo de uso constante, prioriza
          // confiabilidad sobre velocidad.
          for(const fila of filas){
            try{
              const {text,warnings:warningsExtraccion}=await extraerTextoDeArchivo(fila.archivo);
              const {nombre,autor,texto,warnings:warningsParseo}=parseCancionDesdeTexto(text,fila.nombreArchivo.replace(/\.[a-z0-9]+$/i,''));
              const warnings=[...warningsExtraccion,...warningsParseo];
              if(!texto||!texto.split('\n\n').slice(1).join('').trim()){
                setArchivosImport(prev=>prev.map(x=>x.id===fila.id?{...x,status:'error',error:'No se detectó contenido de canción en el archivo.'}:x));
                continue;
              }
              setArchivosImport(prev=>prev.map(x=>x.id===fila.id?{...x,status:'ok',nombre,autor,texto,warnings,incluir:true}:x));
            }catch(err){
              setArchivosImport(prev=>prev.map(x=>x.id===fila.id?{...x,status:'error',error:err.message||'Error al procesar el archivo.'}:x));
            }
          }
          setImportProcesando(false);
        };

        const confirmarImport=()=>{
          const yaUsados=new Set();
          const incluidas=archivosImport.filter(f=>f.status==='ok'&&f.incluir!==false);
          let conAvisos=0;
          incluidas.forEach(f=>{
            const nombreFinal=nombreUnico(f.nombre,yaUsados);
            yaUsados.add(nombreFinal);
            // Reemplaza la cabecera del texto (nombre/autor) por el nombre
            // final ya des-colisionado, por si nombreUnico le agregó "(2)".
            const textoFinal=[`${nombreFinal}\n${f.autor||''}\n`,...f.texto.split('\n\n').slice(1)].join('\n\n');
            const bloquesParsed=parseBloques(textoFinal);
            const guias=bloquesParsed.map(b=>({label:b.label,abrev:abrevBloque(b.label),color:getColorBloque(b.label)}));
            const bpmDetectado=90;
            CANCIONES.push({n:nombreFinal,key:'G',bpm:bpmDetectado,autor:f.autor||''});
            onSaveChords(nombreFinal,textoFinal);
            if(guias.length>0)setEstructurasDB(prev=>({...prev,[nombreFinal]:{guias,click:{bpm:bpmDetectado,compas:'4/4'}}}));
            // TODA canción importada nace 'sin_revisar', sin excepción —
            // incluso si el parser no reportó ningún warning (punto 1/5 de
            // la spec de revisión).
            setImportDB(prev=>({...prev,[nombreFinal]:{status:'sin_revisar',warnings:f.warnings||[]}}));
            if((f.warnings||[]).length>0)conAvisos++;
          });
          setImportResumen({total:incluidas.length,conAvisos});
          setArchivosImport([]);
          onToast(`✓ ${incluidas.length} canción${incluidas.length===1?'':'es'} importada${incluidas.length===1?'':'s'}`);
        };

        if(importResumen)return(
          <div>
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{width:56,height:56,borderRadius:16,margin:'0 auto 16px',
                background:'rgba(48,192,183,.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--gn)" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
                fontSize:18,color:'var(--tx)',marginBottom:8}}>
                {importResumen.total} canción{importResumen.total===1?'':'es'} importada{importResumen.total===1?'':'s'}
              </div>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.6,maxWidth:280,margin:'0 auto 20px'}}>
                Todas quedaron marcadas <strong style={{color:'var(--rd)'}}>Por revisar</strong> en tu repertorio
                {importResumen.conAvisos>0?<> — {importResumen.conAvisos} con avisos puntuales del parser para chequear.</>:<>, aunque el parser no reportó avisos.</>}
                {' '}El import es por reglas, no por IA: siempre vale la pena abrir cada una una vez antes de tocarla en vivo.
              </div>
              <button onClick={()=>{setShowCrear(false);setCrearModo(null);setImportResumen(null);}}
                className="btn-p" style={{padding:'10px 24px',borderRadius:10,fontSize:13,fontWeight:700,
                fontFamily:"'Lexend Giga',sans-serif"}}>
                Ir al repertorio
              </button>
            </div>
          </div>
        );

        return(
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,cursor:'pointer'}}
              onClick={()=>{setCrearModo(null);setArchivosImport([]);}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif"}}>Subir canción</span>
            </div>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
              fontSize:20,color:'var(--tx)',marginBottom:6}}>
              Importar archivos
            </div>
            <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:18,lineHeight:1.6}}>
              El parser convierte automáticamente cada archivo, pero es por reglas — no por IA. Todas las canciones quedan marcadas <strong style={{color:'var(--rd)'}}>Por revisar</strong> hasta que las abras y guardes una vez.
            </div>

            {archivosImport.length===0&&(
              <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,
                padding:'32px 16px',borderRadius:14,border:'1.5px dashed var(--bd2)',
                background:'var(--s1)',cursor:'pointer',textAlign:'center'}}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--gn)" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div style={{fontSize:13,fontWeight:800,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>
                  Elegir archivos
                </div>
                <div style={{fontSize:11,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
                  .txt · .docx · .pdf — puedes elegir varios a la vez
                </div>
                <input type="file" multiple accept=".txt,.docx,.pdf" style={{display:'none'}}
                  onChange={e=>{procesarArchivos(e.target.files);e.target.value='';}}/>
              </label>
            )}

            {archivosImport.length>0&&(
              <div>
                {archivosImport.map(f=>(
                  <div key={f.id} style={{padding:'12px 14px',borderRadius:12,border:'1px solid var(--bd)',
                    background:'var(--s1)',marginBottom:8,opacity:f.status==='ok'&&f.incluir===false?.5:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      {f.status==='procesando'&&(
                        <div style={{width:16,height:16,borderRadius:'50%',border:'2px solid var(--bd2)',
                          borderTopColor:'var(--gn)',flexShrink:0,animation:'spin .8s linear infinite'}}/>
                      )}
                      {f.status==='error'&&(
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--rd)" strokeWidth="2" style={{flexShrink:0}}>
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      )}
                      {f.status==='ok'&&(
                        <input type="checkbox" checked={f.incluir!==false} onChange={()=>setArchivosImport(prev=>prev.map(x=>x.id===f.id?{...x,incluir:!x.incluir}:x))}
                          style={{width:16,height:16,flexShrink:0,accentColor:'var(--gn)',cursor:'pointer'}}/>
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        {f.status==='ok'?(
                          <input value={f.nombre} onChange={e=>setArchivosImport(prev=>prev.map(x=>x.id===f.id?{...x,nombre:e.target.value}:x))}
                            style={{width:'100%',background:'none',border:'none',outline:'none',
                              fontSize:13,fontWeight:800,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",padding:0}}/>
                        ):(
                          <div style={{fontSize:12,fontWeight:700,color:f.status==='error'?'var(--rd)':'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif"}}>
                            {f.nombreArchivo}
                          </div>
                        )}
                        <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginTop:2}}>
                          {f.status==='procesando'&&'Procesando…'}
                          {f.status==='error'&&f.error}
                          {f.status==='ok'&&(f.warnings.length>0
                            ?<span style={{color:'#e0a020'}}>⚠ Por revisar ({f.warnings.length})</span>
                            :'Sin avisos del parser')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!importProcesando&&(
                  <button onClick={confirmarImport}
                    disabled={archivosImport.filter(f=>f.status==='ok'&&f.incluir!==false).length===0}
                    className="btn-p" style={{width:'100%',padding:'12px',borderRadius:12,fontSize:13,
                      fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",marginTop:6,
                      opacity:archivosImport.filter(f=>f.status==='ok'&&f.incluir!==false).length===0?.4:1}}>
                    Importar {archivosImport.filter(f=>f.status==='ok'&&f.incluir!==false).length} canción{archivosImport.filter(f=>f.status==='ok'&&f.incluir!==false).length===1?'':'es'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );


  return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div className="ph" style={{marginBottom:16,alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:'var(--fs-title1)',color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>Canciones</div>
          <div style={{fontSize:12,color:'var(--tx2)',fontWeight:200,fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.6,maxWidth:420}}>
            Las canciones son carpetas, no archivos.<br/>
            Letras y acordes, partituras por instrumento, secuencias y audios de referencia — todo vive junto, dentro de la canción.
          </div>
        </div>
        <button onClick={()=>{setShowCrear(true);setCrearModo(null);}}
          style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',
            borderRadius:100,border:'1px solid var(--bd2)',
            background:'var(--s3)',color:'var(--tx)',
            fontWeight:700,fontSize:11,cursor:'pointer',
            fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Subir canción/carpeta
        </button>
      </div>
      <div style={{display:'flex',gap:5,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        
        {/* ── Chips de tab con colores ── */}
        {[
          {id:'mi',    label:tx.tabAll, color:'#c8a97e', bg:'rgba(200,169,126,.12)',
           icon:<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>},
          {id:'universal', label:tx.tabUniversal, color:'var(--gn)', bg:'rgba(48,192,183,.12)', show:feat.cancioneroUniversal,
           icon:<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>},
          {id:'partituras',label:tx.tabSheetMusic, color:'#a78bfa', bg:'rgba(167,139,250,.12)',
           icon:<svg viewBox="0 0 50 60" width="10" height="11" fill="currentColor"><path d="M25 4c2.5 0 5 1.5 6.5 3.5C33 9.5 33 12 32 14c-1 2-3 3-5 3.5v28c2.5 1 4 3 4 5.5 0 3.3-2.7 6-6 6s-6-2.7-6-6c0-2.5 1.5-4.5 4-5.5V17.5c-2-.5-4-1.5-5-3.5-1-2-1-4.5.5-6.5C20 5.5 22.5 4 25 4z"/></svg>},
          {id:'colecciones',label:tx.tabCollections, color:'#e07820', bg:'rgba(224,120,32,.12)',
           icon:<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h6l2 2h8v12H4z"/></svg>},
        ].filter(t=>t.show!==false).map(t=>(
          <button key={t.id}
            onClick={()=>{if(t.id==='drive'){setShowCrear(true);setCrearModo('drive');}else setTab(t.id);}}
            style={{
              padding:'5px 12px',borderRadius:100,
              border:`1px solid ${tab===t.id?t.color+'60':'var(--bd)'}`,
              background:tab===t.id?t.bg:'transparent',
              color:tab===t.id?t.color:'var(--tx3)',
              fontWeight:700,fontSize:10,cursor:'pointer',
              fontFamily:"'Lexend Giga',sans-serif",
              display:'flex',alignItems:'center',gap:5,flexShrink:0,
              transition:'all .15s',
            }}>
            <span style={{color:'inherit',display:'flex'}}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div style={{flex:1}}/>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input className="inp" placeholder="Buscar canción..." style={{flex:1}} value={filter} onChange={e=>setFilter(e.target.value)}/>
        <button onClick={()=>setBv(v=>!v)} style={{flexShrink:0,padding:'0 13px',borderRadius:9,border:'1px solid var(--bd)',background:bv?'rgba(200,169,126,.08)':'var(--s1)',color:bv?'var(--ac)':'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",height:42,display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          {bv?tx.byList:tx.byBpm}
        </button>
      </div>


      {tab==='mi'&&(
        CANCIONES.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:'var(--tx3)'}}>
            <div style={{fontSize:32,marginBottom:10,opacity:.5}}>♪</div>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:'var(--tx2)',marginBottom:6}}>
              Tu cancionero está vacío
            </div>
            <div style={{fontSize:11,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,lineHeight:1.6,maxWidth:280,margin:'0 auto 16px'}}>
              Agregá tu primera canción — a mano, desde una partitura PDF/MusicXML, o desde Google Drive.
            </div>
            <button onClick={()=>setShowCrear(true)} className="btn-p" style={{padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
              + Subir canción/carpeta
            </button>
          </div>
        ):bv&&!filter?(<><Sec title="Rápidas" range="120+ BPM" type="fast" songs={fast}/><Sec title="Medias" range="80–119 BPM" type="mid" songs={mid}/><Sec title="Lentas" range="–80 BPM" type="slow" songs={slow}/></>)
        :(<div className="sg">{fl.sort((a,b)=>b.bpm-a.bpm).map(s=><SongCard key={s.n} s={s}/>)}</div>)
      )}

      {tab==='universal'&&(
        <div>
          <div style={{padding:'10px 12px',borderRadius:12,background:'rgba(94,206,160,.06)',border:'1px solid rgba(94,206,160,.2)',marginBottom:14}}>
            <div style={{fontSize:11,color:'var(--gn)',fontWeight:700,marginBottom:2}}>Cancionero Universal</div>
            <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.6}}>Canciones compartidas por iglesias de la comunidad Setlist. Solo disponible en Modo Iglesia.</div>
          </div>
          <div className="sg">
            {UNIVERSAL.filter(s=>s.n.toLowerCase().includes(filter.toLowerCase())).map(s=>(
              <div key={s.n} className="scard" onClick={()=>onOpenSong&&onOpenSong(s.n)} style={{cursor:'pointer'}}>
                <div className="scard-n">{s.n}</div>
                <div className="scard-s">{s.key} · {s.bpm} BPM</div>
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:4,fontStyle:'italic'}}>{s.equipo}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='colecciones'&&(
        <div>
          {coleccionSel===null?(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
                  Agrupa tus canciones por álbum, temporada o cualquier criterio.
                </div>
                <button onClick={()=>setShowCrearColeccion(true)}
                  style={{padding:'7px 14px',borderRadius:9,border:'none',background:'#e07820',
                    color:'#000',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",
                    display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Crear colección
                </button>
              </div>

              {colecciones.length===0?(
                <div style={{textAlign:'center',padding:'50px 20px',color:'var(--tx3)'}}>
                  <div style={{fontSize:28,marginBottom:10,opacity:.5}}>🗂️</div>
                  <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:'var(--tx2)',marginBottom:6}}>
                    Sin colecciones aún
                  </div>
                  <div style={{fontSize:11,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,lineHeight:1.6,maxWidth:260,margin:'0 auto'}}>
                    Ej: "Álbum 2026", "Navidad", "Solo guitarra" — cualquier etiqueta que te ayude a ordenarte.
                  </div>
                </div>
              ):(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                  {colecciones.map((c,i)=>(
                    <div key={i} onClick={()=>setColeccionSel(i)}
                      style={{padding:14,borderRadius:14,cursor:'pointer',
                        background:`${c.color}12`,border:`1px solid ${c.color}35`,
                        display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{width:32,height:32,borderRadius:9,background:`${c.color}22`,
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={c.color} strokeWidth="2">
                          <path d="M4 4h6l2 2h8v12H4z"/>
                        </svg>
                      </div>
                      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:700,color:'var(--tx)'}}>
                        {c.nombre}
                      </div>
                      <div style={{fontSize:10,color:c.color,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
                        {c.canciones.length} canción{c.canciones.length!==1?'es':''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ):(
            <div>
              <button onClick={()=>setColeccionSel(null)}
                style={{background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',
                  fontSize:11,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",marginBottom:14,
                  display:'flex',alignItems:'center',gap:5}}>
                ← Colecciones
              </button>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:20,fontWeight:400,
                color:colecciones[coleccionSel].color,marginBottom:14}}>
                {colecciones[coleccionSel].nombre}
              </div>
              {colecciones[coleccionSel].canciones.length===0?(
                <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif"}}>
                  Esta colección está vacía.
                </div>
              ):(
                <div className="sg">
                  {colecciones[coleccionSel].canciones.map(n=>{
                    const s=CANCIONES.find(x=>x.n===n);
                    if(!s) return null;
                    return <SongCard key={n} s={s}/>;
                  })}
                </div>
              )}
            </div>
          )}

          {showCrearColeccion&&(
            <div style={{position:'fixed',inset:0,background:'var(--ov-modal)',zIndex:200,
              display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
              onClick={()=>setShowCrearColeccion(false)}>
              <div onClick={e=>e.stopPropagation()}
                style={{background:'var(--bg)',borderRadius:16,padding:20,maxWidth:360,width:'100%',
                  border:'1px solid var(--bd)',maxHeight:'80vh',overflowY:'auto'}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,
                  fontWeight:400,color:'var(--tx)',marginBottom:14}}>Nueva colección</div>
                <input className="inp" placeholder="Nombre de la colección..."
                  value={nuevaColeccion.nombre}
                  onChange={e=>setNuevaColeccion(v=>({...v,nombre:e.target.value}))}
                  style={{marginBottom:10}}/>
                <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                  letterSpacing:'1.5px',marginBottom:6}}>Color</div>
                <div style={{display:'flex',gap:6,marginBottom:14}}>
                  {['#c8a97e','#30C0B7','#e07820','#a78bfa','#FD8083','#5ecea0'].map(col=>(
                    <button key={col} onClick={()=>setNuevaColeccion(v=>({...v,color:col}))}
                      style={{width:26,height:26,borderRadius:'50%',border:nuevaColeccion.color===col?'2px solid #fff':'2px solid transparent',
                        background:col,cursor:'pointer'}}/>
                  ))}
                </div>
                <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                  letterSpacing:'1.5px',marginBottom:6}}>Canciones ({nuevaColeccion.canciones.length})</div>
                <div style={{maxHeight:180,overflowY:'auto',marginBottom:14,display:'flex',flexDirection:'column',gap:4}}>
                  {CANCIONES.map(s=>{
                    const sel=nuevaColeccion.canciones.includes(s.n);
                    return(
                      <div key={s.n} onClick={()=>setNuevaColeccion(v=>({...v,
                          canciones:sel?v.canciones.filter(x=>x!==s.n):[...v.canciones,s.n]}))}
                        style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:8,
                          cursor:'pointer',background:sel?'rgba(224,120,32,.1)':'transparent'}}>
                        <div style={{width:14,height:14,borderRadius:4,flexShrink:0,
                          border:`1px solid ${sel?'#e07820':'var(--bd)'}`,background:sel?'#e07820':'transparent'}}/>
                        <span style={{fontSize:11,color:'var(--tx)',fontWeight:600}}>{s.n}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setShowCrearColeccion(false)}
                    style={{flex:1,padding:'10px',borderRadius:9,border:'1px solid var(--bd)',
                      background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:12,
                      fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>Cancelar</button>
                  <button disabled={!nuevaColeccion.nombre.trim()}
                    onClick={()=>{
                      const nueva={id:Date.now(),...nuevaColeccion};
                      setColecciones(v=>[...v,nueva]);
                      persistirColeccion(nueva);
                      onToast&&onToast({text:tx.collectionCreated,sub:nuevaColeccion.nombre});
                      setNuevaColeccion({nombre:'',color:'#c8a97e',canciones:[]});
                      setShowCrearColeccion(false);
                    }}
                    style={{flex:2,padding:'10px',borderRadius:9,border:'none',
                      background:nuevaColeccion.nombre.trim()?'#e07820':'var(--s3)',
                      color:nuevaColeccion.nombre.trim()?'#000':'var(--tx3)',
                      cursor:nuevaColeccion.nombre.trim()?'pointer':'not-allowed',fontSize:12,
                      fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>Crear colección</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {tab==='partituras'&&(
        <div>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:14}}>Partituras disponibles</div>
          {/* Demo partituras */}
          {[
            {title:'YESHUA',autor:'Maverick City Music',tipo:'PDF',paginas:4,tonalidad:'D',desc:'Partitura completa para piano, guitarra, bajo y batería. Incluye lead sheet.'},
            {title:'GLORIA EN GLORIA',autor:'Bethel Music',tipo:'MusicXML',paginas:6,tonalidad:'D',desc:'Partitura interactiva con transposición automática. Compatible con MuseScore.'},
            {title:'LA BONDAD DE DIOS',autor:'Bethel Music',tipo:'PDF',paginas:3,tonalidad:'C',desc:'Lead sheet con cifrado y letra. Versión para todos los instrumentos.'},
          ].map((p,i)=>(
            <div key={i} style={{display:'flex',gap:12,padding:'14px',borderRadius:12,background:'var(--s1)',border:'1px solid var(--bd)',marginBottom:8,cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(167,139,250,.4)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--bd)'}>
              {/* Icono clave de sol */}
              <div style={{width:44,height:44,borderRadius:10,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg viewBox="0 0 50 60" width="20" height="24" fill="rgba(167,139,250,0.9)">
                  <path d="M25 4c2.5 0 5 1.5 6.5 3.5C33 9.5 33 12 32 14c-1 2-3 3-5 3.5v28c2.5 1 4 3 4 5.5 0 3.3-2.7 6-6 6s-6-2.7-6-6c0-2.5 1.5-4.5 4-5.5V17.5c-2-.5-4-1.5-5-3.5-1-2-1-4.5.5-6.5C20 5.5 22.5 4 25 4z"/>
                </svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,fontSize:13,color:'var(--tx)'}}>{p.title}</span>
                  <span style={{fontSize:8,fontWeight:900,padding:'2px 7px',borderRadius:100,
                    background:p.tipo==='MusicXML'?'rgba(48,192,183,.12)':'rgba(167,139,250,.12)',
                    color:p.tipo==='MusicXML'?'var(--gn)':'#a78bfa',
                    border:`1px solid ${p.tipo==='MusicXML'?'rgba(48,192,183,.3)':'rgba(167,139,250,.3)'}`,
                    fontFamily:"'Lexend Giga',sans-serif"}}>{p.tipo}</span>
                </div>
                <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:4,fontFamily:"'Lexend Giga',sans-serif"}}>{p.autor} · {p.tonalidad} · {p.paginas} págs.</div>
                <div style={{fontSize:10,color:'var(--tx2)',lineHeight:1.5,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>{p.desc}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',justifyContent:'center',gap:6,flexShrink:0}}>
                <button style={{padding:'5px 10px',borderRadius:8,border:'1px solid rgba(167,139,250,.3)',background:'rgba(167,139,250,.1)',color:'#a78bfa',fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                  Ver
                </button>
                <button style={{padding:'5px 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx3)',fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                  ↓ PDF
                </button>
              </div>
            </div>
          ))}
          {/* Upload zone */}
          {isAdmin&&(
            <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,border:'1px dashed rgba(167,139,250,.3)',background:'rgba(167,139,250,.05)',cursor:'pointer',marginTop:8}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(167,139,250,.6)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(167,139,250,.3)'}>
              <input type="file" accept=".pdf,.xml,.mxl,.musicxml" style={{display:'none'}}/>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#a78bfa" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#a78bfa'}}>Subir partitura</div>
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:1}}>PDF · MusicXML · .mxl</div>
              </div>
            </label>
          )}
        </div>
      )}

      {songParaVariar&&(
        <div style={{position:'fixed',inset:0,background:'var(--ov-modal)',zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={()=>setSongParaVariar(null)}>
          <div style={{width:'100%',maxWidth:360,padding:18,borderRadius:16,
              background:'var(--bg)',border:'1px solid var(--bd)',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,color:'var(--tx)',fontWeight:400}}>{songParaVariar}</div>
              <button onClick={()=>setSongParaVariar(null)} style={{background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
            </div>
            <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,marginBottom:14}}>
              Elige qué versión abrir — cada una puede tener su propia letra, acordes o notas.
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
              <button onClick={()=>{onOpenSong&&onOpenSong(songParaVariar,'original');setSongParaVariar(null);}}
                style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:10,
                  border:'1px solid var(--bd)',background:'var(--s1)',cursor:'pointer',textAlign:'left'}}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <span style={{fontSize:12,fontWeight:700,color:'var(--tx)',flex:1,fontFamily:"'Lexend Giga',sans-serif"}}>Original</span>
              </button>
              {(variacionesDB[songParaVariar]||[]).map(v=>(
                <button key={v.id} onClick={()=>{onOpenSong&&onOpenSong(songParaVariar,v.id);setSongParaVariar(null);}}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:10,
                    border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.06)',cursor:'pointer',textAlign:'left'}}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--ac)" strokeWidth="2">
                    {v.tipo==='partitura'
                      ?<path d="M9 18V5l12-2v13"/>
                      :<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>}
                  </svg>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--ac)',flex:1,fontFamily:"'Lexend Giga',sans-serif"}}>{v.label}</span>
                  {v.tipo==='partitura'&&<span style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",textTransform:'uppercase'}}>Partitura</span>}
                </button>
              ))}
            </div>
            {isAdmin&&(nuevaVariacion?.cancion===songParaVariar?(
              <div style={{padding:12,borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:14}}>
                <div style={{display:'flex',gap:6,marginBottom:10}}>
                  <button onClick={()=>setNuevaVariacion(v=>({...v,tipo:'letra'}))}
                    style={{flex:1,padding:'7px 0',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,
                      fontFamily:"'Lexend Giga',sans-serif",background:nuevaVariacion.tipo==='letra'?'rgba(200,169,126,.18)':'var(--s1)',
                      color:nuevaVariacion.tipo==='letra'?'var(--ac)':'var(--tx3)'}}>Letra/acordes</button>
                  <button onClick={()=>setNuevaVariacion(v=>({...v,tipo:'partitura'}))}
                    style={{flex:1,padding:'7px 0',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,
                      fontFamily:"'Lexend Giga',sans-serif",background:nuevaVariacion.tipo==='partitura'?'rgba(200,169,126,.18)':'var(--s1)',
                      color:nuevaVariacion.tipo==='partitura'?'var(--ac)':'var(--tx3)'}}>Partitura (archivo)</button>
                </div>
                <input className="inp" placeholder="Nombre (ej: Piano, Trombón, Voz guía)" value={nuevaVariacion.label}
                  onChange={e=>setNuevaVariacion(v=>({...v,label:e.target.value}))} style={{marginBottom:8}}/>
                {nuevaVariacion.tipo==='letra'?(
                  <textarea className="inp" placeholder="Letra y acordes de esta variación (formato [Acorde]letra)..."
                    value={nuevaVariacion.contenido} onChange={e=>setNuevaVariacion(v=>({...v,contenido:e.target.value}))}
                    style={{minHeight:100,resize:'vertical',lineHeight:1.6,fontSize:11,marginBottom:8}}/>
                ):(
                  <label style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,
                    border:'1px dashed var(--div)',background:'var(--s1)',cursor:'pointer',marginBottom:8}}>
                    <input type="file" accept="image/*,.pdf" style={{display:'none'}}
                      onChange={e=>setNuevaVariacion(v=>({...v,archivo:e.target.files[0]||null}))}/>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{fontSize:11,color:'var(--tx2)'}}>{nuevaVariacion.archivo?nuevaVariacion.archivo.name:'Elegir imagen o PDF'}</span>
                  </label>
                )}
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setNuevaVariacion(null)}
                    style={{flex:1,padding:'8px 0',borderRadius:8,border:'1px solid var(--bd)',background:'transparent',
                      color:'var(--tx3)',cursor:'pointer',fontSize:10,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>Cancelar</button>
                  <button onClick={guardarNuevaVariacion}
                    style={{flex:2,padding:'8px 0',borderRadius:8,border:'none',background:'var(--ac)',
                      color:'#000',cursor:'pointer',fontSize:10,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif"}}>Guardar variación</button>
                </div>
              </div>
            ):(
              <button onClick={()=>abrirNuevaVariacion(songParaVariar)}
                style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px dashed var(--div)',
                  background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif"}}>
                + Agregar variación (partitura o notas por instrumento)
              </button>
            ))}

            {/* ── Secuencia — lista abierta de tracks (v36-ampliación) ── */}
            <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--bd)'}}>
              <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>
                Secuencia · {(archivosDB[songParaVariar]?.secuencia||[]).length}
              </div>
              {(archivosDB[songParaVariar]?.secuencia||[]).map(sq=>(
                <div key={sq.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                  borderRadius:8,background:'var(--s1)',marginBottom:5}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  <span style={{fontSize:11,color:'var(--tx2)',flex:1,fontFamily:"'Lexend Giga',sans-serif",overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{sq.nombre}</span>
                  <span style={{fontSize:9,color:'var(--tx3)'}}>{sq.size}</span>
                </div>
              ))}
              {isAdmin&&(
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  padding:'9px 12px',borderRadius:10,border:'1px dashed var(--div)',
                  background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif"}}>
                  <input type="file" accept="audio/*" style={{display:'none'}}
                    onChange={e=>{agregarSecuencia(songParaVariar,e.target.files[0]);e.target.value='';}}/>
                  + Agregar track de secuencia
                </label>
              )}
            </div>

            {/* ── Track de referencia — 1 slot, se maneja desde SongView ── */}
            <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--bd)'}}>
              <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>
                Track de referencia
              </div>
              {archivosDB[songParaVariar]?.trackReferencia?(
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:'rgba(48,192,183,.08)'}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  <span style={{fontSize:11,color:'var(--gn)',flex:1,fontFamily:"'Lexend Giga',sans-serif",overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{archivosDB[songParaVariar].trackReferencia.nombre}</span>
                </div>
              ):(
                <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",fontStyle:'italic'}}>
                  Sin track — se sube o graba desde la pestaña Referencia dentro de la canción.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
