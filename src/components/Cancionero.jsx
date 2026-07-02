import { t as getT } from '../i18n';
// Cancionero: catálogo de canciones (Iglesia/Banda), partituras MusicXML/PDF,
// importación, edición y vista de equipos.
import { getModoFeatures } from '../data/modo';
import { useState, useEffect, useRef } from 'react';
import { CANCIONES } from '../data/constants';
import { playMusicXML, MusicXMLViewer } from './MusicXMLViewer';

export function Cancionero({mode,onOpenSong,userRole='superadmin',lang='es',onToast=()=>{},onSaveChords=()=>{},variacionesDB={},setVariacionesDB=()=>{},archivosDB={},setArchivosDB=()=>{},colecciones=[],setColecciones=()=>{},persistirColeccion=()=>{}}){
  const tx=getT(lang);
  const feat=getModoFeatures(mode);
  const isAdmin=userRole==='superadmin'||userRole==='leader';
  const [filter,setFilter]=useState('');
  const [bv,setBv]=useState(false); // false=lista, true=BPM
  const [tab,setTab]=useState('mi'); // 'mi' | 'universal'
  const [showCrear,setShowCrear]=useState(false);
  const [nueva,setNueva]=useState({nombre:'',autor:'',key:'G',bpm:'',letra:''});
  const [partituras,setPartituras]=useState([]);
  const [partituraSel,setPartituraSel]=useState(null);
  const [midiPlaying,setMidiPlaying]=useState(false);
  const [crearModo,setCrearModo]=useState(null);
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
      if(!nv.archivo){onToast({text:'Selecciona un archivo',sub:'Imagen o PDF de la partitura'});return;}
      const url=URL.createObjectURL(nv.archivo);
      setVariacionesDB(prev=>({...prev,[nv.cancion]:[...(prev[nv.cancion]||[]),
        {id,label,tipo:'partitura',archivoUrl:url,archivoNombre:nv.archivo.name}]}));
    }else{
      setVariacionesDB(prev=>({...prev,[nv.cancion]:[...(prev[nv.cancion]||[]),{id,label,tipo:'letra'}]}));
      // Contenido propio de esta variación — mismo mecanismo que "guardar acordes"
      onSaveChords(`${nv.cancion} · ${label}`, nv.contenido||'');
    }
    onToast({text:'Variación agregada',sub:label});
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
    onToast({text:'Track de secuencia agregado',sub:file.name});
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
    return(
      <div className="scard" onClick={()=>abrirCancion(s.n)} style={{cursor:'pointer',position:'relative'}}>
        <div className="scard-n" style={{paddingRight:32}}>{s.n}</div>
        <div className="scard-s">{s.key} · <span style={{color:'var(--tx3)',fontWeight:600}}>{s.bpm} BPM</span></div>
        <button onClick={e=>{e.stopPropagation();setSongParaVariar(s.n);}}
          title="Ver carpeta de esta canción"
          style={{position:'absolute',top:6,right:6,display:'flex',flexDirection:'column',
            alignItems:'center',gap:1,background:'none',border:'none',cursor:'pointer',padding:0}}>
          <div style={{width:24,height:24,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
            background:hayExtra?'rgba(200,169,126,.15)':'rgba(255,255,255,.06)'}}>
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
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:4}}>
            Subir canción/carpeta
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:24,lineHeight:1.5}}>
            En Setsync una canción es una carpeta. Dentro podrás agregar variaciones, partituras por instrumento y audios de referencia.
          </div>
          {/* Opción 1: Manual */}
          <div onClick={()=>setCrearModo('manual')}
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
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.4}}>
                Escribe la letra con acordes en formato ChordPro. 
                Soporta transposición automática.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          {/* Opción 2: Drive masivo (enlace de Drive) */}
          <div onClick={()=>setCrearModo('drive')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'rgba(255,255,255,.05)',
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
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.4}}>
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
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.4}}>
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

      {/* Modo manual — formulario de letra y acordes */}
      {crearModo==='manual'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,
            cursor:'pointer'}} onClick={()=>setCrearModo(null)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{fontSize:12,color:'var(--tx3)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:16}}>
            Letra y acordes
          </div>
          <div className="card" style={{padding:14,marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              Información
            </div>
            <input value={nueva.nombre} onChange={e=>setNueva(v=>({...v,nombre:e.target.value}))}
              placeholder="Nombre de la canción"
              style={{width:'100%',padding:'9px 12px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box'}}/>
            <input value={nueva.autor} onChange={e=>setNueva(v=>({...v,autor:e.target.value}))}
              placeholder="Autor o compositor"
              style={{width:'100%',padding:'9px 12px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8}}>
              <select value={nueva.key} onChange={e=>setNueva(v=>({...v,key:e.target.value}))}
                style={{flex:1,padding:'9px 12px',borderRadius:8,
                  border:'1px solid var(--bd)',background:'var(--s2)',
                  color:'var(--tx)',fontSize:13}}>
                {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k=>(
                  <option key={k}>{k}</option>
                ))}
              </select>
              <input value={nueva.bpm} onChange={e=>setNueva(v=>({...v,bpm:e.target.value}))}
                placeholder="BPM" type="number"
                style={{flex:1,padding:'9px 12px',borderRadius:8,
                  border:'1px solid var(--bd)',background:'var(--s2)',
                  color:'var(--tx)',fontSize:13}}/>
            </div>
          </div>
          <div className="card" style={{padding:14,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>
              Letra y acordes
            </div>
            <div style={{fontSize:11,color:'var(--tx3)',marginBottom:10,lineHeight:1.5}}>
              Escribí <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>===VERSO===</code> o{' '}
              <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>===CORO===</code> para marcar cada
              sección, y pegá el acorde justo antes de la sílaba donde cambia:{' '}
              <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>[C]Tu fidelidad</code>.
            </div>
            <textarea value={nueva.letra}
              onChange={e=>setNueva(v=>({...v,letra:e.target.value}))}
              rows={10} placeholder={`===VERSO===
[G]Tu fidelidad es [Em]grande
[C]Grande es tu [D]amor

===CORO===
[G]Te alabaré...`}
              style={{width:'100%',padding:'10px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:12,fontFamily:"'Outfit',sans-serif",
                resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{flex:1,padding:'10px',borderRadius:10,
              border:'1px solid var(--bd)',background:'transparent',
              color:'var(--tx3)',cursor:'pointer',fontSize:13,fontWeight:700,
              fontFamily:"'Lexend Giga',sans-serif"}}
              onClick={()=>setCrearModo(null)}>Cancelar</button>
            <button className="btn-p" disabled={!nueva.nombre.trim()}
              onClick={()=>{
                CANCIONES.push({n:nueva.nombre.trim().toUpperCase(),key:nueva.key,bpm:Number(nueva.bpm)||90});
                if(nueva.letra.trim()){
                  const encabezado = `${nueva.nombre.trim().toUpperCase()}\n${nueva.autor.trim()}\n\n`;
                  onSaveChords(nueva.nombre.trim().toUpperCase(), encabezado + nueva.letra);
                }
                onToast(`✓ ${nueva.nombre.trim()} agregada`);
                setShowCrear(false);setCrearModo(null);
                setNueva({nombre:'',autor:'',key:'G',bpm:'',letra:''});
              }}
              style={{flex:2,padding:'10px',borderRadius:10,fontSize:13,fontWeight:700,
                fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',
                justifyContent:'center',gap:6}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Guardar canción
            </button>
          </div>
        </div>
      )}

      {/* Modo partitura */}
      {crearModo==='partitura'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,
            cursor:'pointer'}} onClick={()=>setCrearModo(null)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{fontSize:12,color:'var(--tx3)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:6}}>
            Subir partitura
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:20,lineHeight:1.6}}>
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
                <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,
                  background:'var(--s2)',padding:'2px 6px',borderRadius:6}}>{f.ext}</span>
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.5}}>{f.desc}</div>
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
            <div style={{fontSize:11,color:'var(--tx3)'}}>
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
            <span style={{fontSize:12,color:'var(--tx3)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:6}}>
            Subir por Drive
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:20,lineHeight:1.6}}>
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
                <span style={{fontSize:11,color:'var(--tx3)'}}>{f.desc}</span>
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
          <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',
            marginTop:8,fontFamily:"'Lexend Giga',sans-serif"}}>
            Disponible en la próxima actualización
          </div>
        </div>
      )}
    </div>
  );


  return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div className="ph" style={{marginBottom:16,alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>Canciones</div>
          <div style={{fontSize:12,color:'var(--tx2)',fontWeight:200,fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.6,maxWidth:420}}>
            Las canciones son carpetas, no archivos.<br/>
            Letras y acordes, partituras por instrumento, secuencias y audios de referencia — todo vive junto, dentro de la canción.
          </div>
        </div>
        <button onClick={()=>{setShowCrear(true);setCrearModo(null);}}
          style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',
            borderRadius:100,border:'1px solid rgba(255,255,255,.15)',
            background:'rgba(255,255,255,.06)',color:'var(--tx)',
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
          {id:'mi',    label:'Todas', color:'#c8a97e', bg:'rgba(200,169,126,.12)',
           icon:<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>},
          {id:'universal', label:'Universal', color:'var(--gn)', bg:'rgba(48,192,183,.12)', show:feat.cancioneroUniversal,
           icon:<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>},
          {id:'partituras',label:'Partituras', color:'#a78bfa', bg:'rgba(167,139,250,.12)',
           icon:<svg viewBox="0 0 50 60" width="10" height="11" fill="currentColor"><path d="M25 4c2.5 0 5 1.5 6.5 3.5C33 9.5 33 12 32 14c-1 2-3 3-5 3.5v28c2.5 1 4 3 4 5.5 0 3.3-2.7 6-6 6s-6-2.7-6-6c0-2.5 1.5-4.5 4-5.5V17.5c-2-.5-4-1.5-5-3.5-1-2-1-4.5.5-6.5C20 5.5 22.5 4 25 4z"/></svg>},
          {id:'colecciones',label:'Colecciones', color:'#e07820', bg:'rgba(224,120,32,.12)',
           icon:<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h6l2 2h8v12H4z"/></svg>},
        ].filter(t=>t.show!==false).map(t=>(
          <button key={t.id}
            onClick={()=>{if(t.id==='drive'){setShowCrear(true);setCrearModo('drive');}else setTab(t.id);}}
            style={{
              padding:'5px 12px',borderRadius:100,
              border:`1px solid ${tab===t.id?t.color+'60':'rgba(255,255,255,.1)'}`,
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
          {bv?'Por lista':'Por BPM'}
        </button>
      </div>


      {tab==='mi'&&(
        CANCIONES.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:'var(--tx3)'}}>
            <div style={{fontSize:32,marginBottom:10,opacity:.5}}>♪</div>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:'var(--tx2)',marginBottom:6}}>
              Tu cancionero está vacío
            </div>
            <div style={{fontSize:12,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,lineHeight:1.6,maxWidth:280,margin:'0 auto 16px'}}>
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
            <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.6}}>Canciones compartidas por iglesias de la comunidad Setlist. Solo disponible en Modo Iglesia.</div>
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
                <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
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
                  <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx2)',marginBottom:6}}>
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
                <div style={{fontSize:12,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
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
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:200,
              display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
              onClick={()=>setShowCrearColeccion(false)}>
              <div onClick={e=>e.stopPropagation()}
                style={{background:'var(--bg)',borderRadius:16,padding:20,maxWidth:360,width:'100%',
                  border:'1px solid var(--bd)',maxHeight:'80vh',overflowY:'auto'}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:17,
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
                      onToast&&onToast({text:'Colección creada',sub:nuevaColeccion.nombre});
                      setNuevaColeccion({nombre:'',color:'#c8a97e',canciones:[]});
                      setShowCrearColeccion(false);
                    }}
                    style={{flex:2,padding:'10px',borderRadius:9,border:'none',
                      background:nuevaColeccion.nombre.trim()?'#e07820':'rgba(255,255,255,.08)',
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
                <div style={{fontSize:10,color:'var(--tx3)',marginBottom:4,fontFamily:"'Lexend Giga',sans-serif"}}>{p.autor} · {p.tonalidad} · {p.paginas} págs.</div>
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
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={()=>setSongParaVariar(null)}>
          <div style={{width:'100%',maxWidth:360,padding:18,borderRadius:16,
              background:'var(--bg)',border:'1px solid var(--bd)',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,color:'var(--tx)',fontWeight:400}}>{songParaVariar}</div>
              <button onClick={()=>setSongParaVariar(null)} style={{background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
            </div>
            <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,marginBottom:14}}>
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
              <div style={{padding:12,borderRadius:12,border:'1px solid var(--bd)',background:'rgba(255,255,255,.03)',marginBottom:14}}>
                <div style={{display:'flex',gap:6,marginBottom:10}}>
                  <button onClick={()=>setNuevaVariacion(v=>({...v,tipo:'letra'}))}
                    style={{flex:1,padding:'7px 0',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,
                      fontFamily:"'Lexend Giga',sans-serif",background:nuevaVariacion.tipo==='letra'?'rgba(200,169,126,.18)':'rgba(255,255,255,.05)',
                      color:nuevaVariacion.tipo==='letra'?'var(--ac)':'var(--tx3)'}}>Letra/acordes</button>
                  <button onClick={()=>setNuevaVariacion(v=>({...v,tipo:'partitura'}))}
                    style={{flex:1,padding:'7px 0',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,
                      fontFamily:"'Lexend Giga',sans-serif",background:nuevaVariacion.tipo==='partitura'?'rgba(200,169,126,.18)':'rgba(255,255,255,.05)',
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
                    border:'1px dashed rgba(255,255,255,.2)',background:'rgba(255,255,255,.03)',cursor:'pointer',marginBottom:8}}>
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
                style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px dashed rgba(255,255,255,.2)',
                  background:'rgba(255,255,255,.03)',color:'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,
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
                  borderRadius:8,background:'rgba(255,255,255,.03)',marginBottom:5}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  <span style={{fontSize:11,color:'var(--tx2)',flex:1,fontFamily:"'Lexend Giga',sans-serif",overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{sq.nombre}</span>
                  <span style={{fontSize:9,color:'var(--tx3)'}}>{sq.size}</span>
                </div>
              ))}
              {isAdmin&&(
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  padding:'9px 12px',borderRadius:10,border:'1px dashed rgba(255,255,255,.2)',
                  background:'rgba(255,255,255,.03)',color:'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,
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
                <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontStyle:'italic'}}>
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
