// Cancionero: catálogo de canciones (Iglesia/Banda), partituras MusicXML/PDF,
// importación, edición y vista de equipos.
import { useState, useEffect, useRef } from 'react';
import { CANCIONES } from '../data/constants';
import { playMusicXML, MusicXMLViewer } from './MusicXMLViewer';

export function Cancionero({mode,onOpenSong,userRole='superadmin'}){
  const isAdmin=userRole==='superadmin'||userRole==='leader';
  const [filter,setFilter]=useState('');
  const [bv,setBv]=useState(true);
  const [tab,setTab]=useState('mi'); // 'mi' | 'universal'
  const [showCrear,setShowCrear]=useState(false);
  const [nueva,setNueva]=useState({nombre:'',autor:'',key:'G',bpm:'',letra:''});
  const [partituras,setPartituras]=useState([]);
  const [partituraSel,setPartituraSel]=useState(null);
  const [midiPlaying,setMidiPlaying]=useState(false);
  const [crearModo,setCrearModo]=useState(null);

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
        <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:16,color:'var(--tx)'}}>{title}</span>
        <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,background:'var(--s1)',border:'1px solid var(--bd)',padding:'3px 8px',borderRadius:100}}>{range}</span>
      </div>
      <div className={`bpm-bar ${type}`}/>
      <div className="sg">
        {songs.map(s=>(
          <div key={s.n} className="scard" onClick={()=>onOpenSong&&onOpenSong(s.n)} style={{cursor:'pointer'}}>
            <div className="scard-n">{s.n}</div>
            <div className="scard-s">{s.key} · <span style={{color:'var(--tx3)',fontWeight:600}}>{s.bpm} BPM</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  // MODAL CREAR CANCIÓN
  if(showCrear)return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}}
        onClick={()=>{setShowCrear(false);setCrearModo(null);}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="var(--tx2)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Cancionero</span>
      </div>

      {/* Selector de modo si no hay uno elegido */}
      {crearModo===null&&(
        <div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:4}}>
            Subir nueva canción
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:24,lineHeight:1.5}}>
            Elige cómo quieres agregar la canción a tu cancionero.
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
                fontFamily:"'Lato',sans-serif",marginBottom:3}}>
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
          {/* Opción 2: Partitura */}
          <div onClick={()=>setCrearModo('partitura')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
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
                fontFamily:"'Lato',sans-serif",marginBottom:3}}>
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
          {/* Opción 3: Drive masivo */}
          <div onClick={()=>setCrearModo('drive')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              cursor:'pointer'}}>
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
                fontFamily:"'Lato',sans-serif",marginBottom:3}}>
                Subida masiva desde Drive
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
              fontFamily:"'Lato',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
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
              Usa <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>[C]</code> para líneas de contenido y{' '}
              <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>[L]</code> para metadatos.
              Los acordes entre <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>[A B C#m]</code> se detectan automáticamente.
            </div>
            <textarea value={nueva.letra}
              onChange={e=>setNueva(v=>({...v,letra:e.target.value}))}
              rows={10} placeholder={`[L]VERSO 1:
[C]A         E
[C]Tu fidelidad es grande
[C]D         A
[C]Grande es tu amor

[L]CORO:
[C]Te alabaré...`}
              style={{width:'100%',padding:'10px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:12,fontFamily:"'Source Code Pro',monospace",
                resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{flex:1,padding:'10px',borderRadius:10,
              border:'1px solid var(--bd)',background:'transparent',
              color:'var(--tx3)',cursor:'pointer',fontSize:13,fontWeight:700,
              fontFamily:"'Lato',sans-serif"}}
              onClick={()=>setCrearModo(null)}>Cancelar</button>
            <button className="btn-p" disabled={!nueva.nombre.trim()}
              onClick={()=>{
                setShowCrear(false);setCrearModo(null);
                setNueva({nombre:'',autor:'',key:'G',bpm:'',letra:''});
              }}
              style={{flex:2,padding:'10px',borderRadius:10,fontSize:13,fontWeight:700,
                fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',
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
              fontFamily:"'Lato',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
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
                  fontFamily:"'Lato',sans-serif"}}>{f.fmt}</span>
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
              fontFamily:"'Lato',sans-serif"}}>
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
              fontFamily:"'Lato',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:6}}>
            Subida masiva desde Drive
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:20,lineHeight:1.6}}>
            Conecta una carpeta de Google Drive que contenga tus canciones y carga todo el repertorio de una vez.
          </div>
          <div style={{padding:'16px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--tx)',
              fontFamily:"'Lato',sans-serif",marginBottom:8}}>Formatos soportados</div>
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
              fontFamily:"'Lato',sans-serif",display:'flex',
              alignItems:'center',justifyContent:'center',gap:8}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Conectar carpeta de Drive
          </button>
          <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',
            marginTop:8,fontFamily:"'Lato',sans-serif"}}>
            Disponible en la próxima actualización
          </div>
        </div>
      )}
    </div>
  );


  return(
    <div>
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Canciones</div>
          <div style={{fontSize:12,color:'var(--tx2)'}}>Busca canciones · sube letras con acordes · importa partituras MusicXML o PDF · <span style={{color:'var(--ac)'}}>{CANCIONES.length} canciones</span></div>
        </div>
  
      </div>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        <button onClick={()=>setTab('mi')} style={{padding:'6px 14px',borderRadius:100,border:tab==='mi'?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:tab==='mi'?'rgba(200,169,126,.1)':'transparent',color:tab==='mi'?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>Mi cancionero</button>
        {mode==='worship'&&<button onClick={()=>setTab('universal')} style={{padding:'6px 14px',borderRadius:100,border:tab==='universal'?'1px solid rgba(94,206,160,.4)':'1px solid var(--bd)',background:tab==='universal'?'rgba(94,206,160,.1)':'transparent',color:tab==='universal'?'var(--gn)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Universal
        </button>}
        <button onClick={()=>setTab('partituras')} style={{padding:'6px 14px',borderRadius:100,
          border:tab==='partituras'?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',
          background:tab==='partituras'?'rgba(200,169,126,.1)':'transparent',
          color:tab==='partituras'?'var(--ac)':'var(--tx3)',
          fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif",
          display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>
          </svg>
          Partituras
        </button>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:6,flexShrink:0}}>
          <button onClick={()=>{setShowCrear(true);setCrearModo(null);}}
            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
              borderRadius:100,border:'1px solid rgba(200,169,126,.35)',
              background:'rgba(200,169,126,.09)',color:'var(--ac)',
              fontWeight:700,fontSize:11,cursor:'pointer',
              fontFamily:"'Lato',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Subir canción
          </button>
          <button onClick={()=>{setShowCrear(true);setCrearModo('drive');}}
            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
              borderRadius:100,border:'1px solid rgba(255,255,255,.1)',
              background:'rgba(255,255,255,.04)',color:'var(--tx3)',
              fontWeight:700,fontSize:11,cursor:'pointer',
              fontFamily:"'Lato',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Subida masiva Drive
          </button>
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <input className="inp" placeholder="Buscar canción..." style={{flex:1}} value={filter} onChange={e=>setFilter(e.target.value)}/>
        <button onClick={()=>setBv(v=>!v)} style={{flexShrink:0,padding:'0 13px',borderRadius:9,border:'1px solid var(--bd)',background:bv?'rgba(200,169,126,.08)':'var(--s1)',color:bv?'var(--ac)':'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif",height:42,display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          {bv?'Por BPM':'Por lista'}
        </button>
      </div>

      {tab==='mi'&&(
        bv&&!filter?(<><Sec title="Rápidas" range="120+ BPM" type="fast" songs={fast}/><Sec title="Medias" range="80–119 BPM" type="mid" songs={mid}/><Sec title="Lentas" range="–80 BPM" type="slow" songs={slow}/></>)
        :(<div className="sg">{fl.sort((a,b)=>b.bpm-a.bpm).map(s=><div key={s.n} className="scard" onClick={()=>onOpenSong&&onOpenSong(s.n)} style={{cursor:'pointer'}}><div className="scard-n">{s.n}</div><div className="scard-s">{s.key} · <span style={{color:'var(--tx3)',fontWeight:600}}>{s.bpm} BPM</span></div></div>)}</div>)
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


      {tab==='partituras'&&(
        <div>
          <div style={{fontSize:20,fontWeight:900,color:'var(--tx)',
            fontFamily:"'Lato',sans-serif",marginBottom:4}}>Partituras</div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:20,lineHeight:1.5}}>
            Sube partituras en formato <strong style={{color:'var(--ac)'}}>MusicXML</strong> o <strong style={{color:'var(--ac)'}}>PDF</strong>.
            MusicXML permite transposición automática y reproducción MIDI.
            PDF es para visualización directa.
          </div>

          {/* Zona de subida */}
          {isAdmin&&(
            <label style={{
              display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',gap:10,
              padding:'24px 16px',borderRadius:14,
              border:'2px dashed rgba(200,169,126,.3)',
              background:'rgba(200,169,126,.04)',
              cursor:'pointer',marginBottom:20,
            }}>
              <input type="file" accept=".xml,.mxl,.musicxml,.pdf"
                style={{display:'none'}}
                onChange={e=>{
                  const file=e.target.files[0];
                  if(!file)return;
                  const tipo=file.name.endsWith('.pdf')?'pdf':'musicxml';
                  const url=URL.createObjectURL(file);
                  setPartituras(prev=>[...prev,{
                    id:Date.now(),nombre:file.name.replace(/\.[^.]+$/,''),
                    tipo,url,size:(file.size/1024).toFixed(0)+'kb'
                  }]);
                }}/>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none"
                stroke="rgba(200,169,126,.5)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--ac)'}}>
                  Subir partitura
                </div>
                <div style={{fontSize:11,color:'var(--tx3)',marginTop:4}}>
                  Formatos aceptados:
                </div>
                <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:6,flexWrap:'wrap'}}>
                  {[
                    {ext:'MusicXML',desc:'Transposición + MIDI'},
                    {ext:'PDF',desc:'Visualización directa'},
                  ].map(f=>(
                    <span key={f.ext} style={{fontSize:10,fontWeight:700,
                      padding:'3px 8px',borderRadius:10,
                      background:'rgba(200,169,126,.1)',color:'var(--ac)',
                      border:'1px solid rgba(200,169,126,.2)'}}>
                      {f.ext} <span style={{opacity:.6,fontWeight:400}}>— {f.desc}</span>
                    </span>
                  ))}
                </div>
              </div>
            </label>
          )}

          {/* Lista de partituras */}
          {partituras.length===0?(
            <div style={{textAlign:'center',padding:'30px 0',color:'var(--tx3)',fontSize:13}}>
              {isAdmin?'Aún no hay partituras. Sube una usando el botón de arriba.':'Sin partituras disponibles.'}
            </div>
          ):partituras.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,
              padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
              background:'var(--s1)',marginBottom:8}}>
              {/* Ícono por tipo */}
              <div style={{width:40,height:40,borderRadius:10,flexShrink:0,
                background:p.tipo==='pdf'?'rgba(196,64,16,.1)':'rgba(200,169,126,.1)',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                {p.tipo==='pdf'?(
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                    stroke="var(--rd)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                ):(
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                    stroke="var(--ac)" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                )}
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:'var(--tx)',
                  fontFamily:"'Lato',sans-serif",whiteSpace:'nowrap',
                  overflow:'hidden',textOverflow:'ellipsis'}}>{p.nombre}</div>
                <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>
                  {p.tipo==='pdf'?'PDF':'MusicXML'} · {p.size}
                </div>
              </div>
              {/* Acciones */}
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                {p.tipo==='pdf'?(
                  <a href={p.url} target="_blank" rel="noreferrer"
                    style={{padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,
                      border:'1px solid var(--bd)',background:'transparent',
                      color:'var(--tx2)',cursor:'pointer',textDecoration:'none',
                      fontFamily:"'Lato',sans-serif"}}>
                    Ver PDF
                  </a>
                ):(
                  <button onClick={()=>setPartituraSel(p)}
                    style={{padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,
                      border:'1px solid var(--ac)',background:'rgba(200,169,126,.08)',
                      color:'var(--ac)',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
                    Leer
                  </button>
                )}
                {isAdmin&&(
                  <button onClick={()=>setPartituras(prev=>prev.filter(x=>x.id!==p.id))}
                    style={{padding:'5px 8px',borderRadius:8,fontSize:11,
                      border:'1px solid var(--bd)',background:'transparent',
                      color:'var(--tx3)',cursor:'pointer'}}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                      stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Lector MusicXML con MIDI */}
          {partituraSel&&(
            <div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:100,
              display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
                borderBottom:'1px solid var(--bd)',flexShrink:0}}>
                <button onClick={()=>{setPartituraSel(null);setMidiPlaying(false);}}
                  style={{background:'transparent',border:'none',cursor:'pointer',
                    color:'var(--tx3)',display:'flex',alignItems:'center'}}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:900,color:'var(--tx)',
                    fontFamily:"'Lato',sans-serif"}}>{partituraSel.nombre}</div>
                  <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,
                    textTransform:'uppercase',letterSpacing:'1px'}}>
                    MusicXML · Reproducción MIDI
                  </div>
                </div>
                <button onClick={()=>{
                  if(midiPlaying){
                    setMidiPlaying(false);
                    window.__midiStop&&window.__midiStop();
                  } else {
                    setMidiPlaying(true);
                    playMusicXML(partituraSel.url, ()=>setMidiPlaying(false));
                  }
                }} style={{
                  display:'flex',alignItems:'center',gap:6,
                  padding:'7px 14px',borderRadius:10,border:'none',
                  background:midiPlaying?'rgba(196,64,16,.15)':'rgba(200,169,126,.12)',
                  color:midiPlaying?'var(--rd)':'var(--ac)',
                  fontSize:12,fontWeight:700,cursor:'pointer',
                  fontFamily:"'Lato',sans-serif",
                }}>
                  {midiPlaying?(
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ):(
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                  {midiPlaying?'Detener':'Reproducir MIDI'}
                </button>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'20px',
                display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
                <MusicXMLViewer url={partituraSel.url}/>
              </div>
              <div style={{padding:'12px 16px',borderTop:'1px solid var(--bd)',
                background:'var(--s1)',fontSize:11,color:'var(--tx3)',textAlign:'center',
                lineHeight:1.5}}>
                El sonido MIDI es una aproximación sintética de la partitura.
                No representa el sonido real del instrumento.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
