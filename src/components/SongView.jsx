import { t as getT } from '../i18n';
// SongView: visor de canción con transposición, capo, anotaciones,
// vista bloques/lineal, Nashville, panel Estructura con drag touch.
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { tpKey } from '../utils/music';
import { Toast } from './common';
import { renderSongContent, CHORD_RE } from './songview/vistaLineal';
import { useMapaCancion } from './songview/useMapaCancion';
import { useAnotaciones } from './songview/useAnotaciones';
import { useAutoScroll, RANGO_SCROLL } from './songview/useAutoScroll';
import { PanelEstructura } from './songview/PanelEstructura';
import { crearDriver, MARCAS_MESA } from '../mixer/mixerDrivers';


// renderSongContent re-exportado para no romper imports externos existentes
// (Tanda 1 — refactor de carpeta, ahora vive en ./songview/vistaLineal.jsx)
export { renderSongContent };

// Permisos por defecto: acceso total. Así Iglesia/Banda (que nunca pasan este
// prop) no se ven afectados por la Tanda 2 — el comportamiento previo al
// agregar Academia queda exactamente igual.
const PERMISOS_TOTAL={
  verAcordes:true,
  estructuraVisible:true,
  estructuraEditable:true,
  modoNashville:true,
  modoPractica:true,
  anotacionesPropias:true,
  autoScroll:true,
};

const POPUP_SEEN_KEY='ss_bloques_popup_seen';
export function SongView({songs,startIdx,onClose,theme="dark",isAdmin=false,onSaveChords,contentDB={},permisos=null,lang='es',sidebarVisible=false,sidebarCollapsed=false,ensayosDisponibles=[],archivosDB={},setArchivosDB=()=>{},variacionesDB={}}){
  const tx=getT(lang);
  // ── Capa de permisos (Academia) — ÚLTIMA capa, solo oculta/muestra
  // controles. Nunca se entrevera dentro de cada feature: cada feature sigue
  // funcionando igual, esto solo decide si su botón/panel se renderiza.
  // permisos=null (default) o no provisto = acceso total, sin restricciones.
  const perm={...PERMISOS_TOTAL,...(permisos||{})};
  const [idx,setIdx]=useState(startIdx);
  const [tpOff,setTpOff]=useState(0);
  const [tool,setTool]=useState('draw');
  const [color,setColor]=useState('#ff3b30');
  const [sz,setSz]=useState(4);
  const [showChords,setShowChords]=useState(true);
  const [showAnnoBar,setShowAnnoBar]=useState(false);
  const [capo,setCapo]=useState(0);
  const [editMode,setEditMode]=useState(false);
  const [selectedChord,setSelectedChord]=useState(null);
  const [editedSongs,setEditedSongs]=useState({});
  const [showSavePopup,setShowSavePopup]=useState(false);
  const [capoOpen,setCapoOpen]=useState(false);
  const [tonoOpen,setTonoOpen]=useState(false);
  const tonoBtnRef=useRef(null);
  const [tonoPos,setTonoPos]=useState(null);
  const [notacionOpen,setNotacionOpen]=useState(false);
  const [notacionPos,setNotacionPos]=useState(null);
  const notacionBtnRef=useRef(null);
  const NOTACION_LABELS=lang==='en'
    ?{americano:'American',latino:'Latin',grados:'Degrees'}
    :{americano:'Americano',latino:'Latino',grados:'Grados'};
  const [toast,setToast]=useState(null);
  const [showMonitor,setShowMonitor]=useState(false);
  const [monitorBus,setMonitorBus]=useState(1);
  const [bottomTab,setBottomTab]=useState(null); // null | 'monitor' | 'secuencia'

  // ── Estado de conexión de la mesa (v36-ampliación) ─────────────────────
  // Antes era demo fijo (mesaConectada=false hardcodeado). Ahora es una
  // conexión real vía driver — hoy solo Soundcraft funciona en la versión
  // web (protocolo WebSocket, ver mixerDrivers.js para el detalle de por
  // qué las demás marcas quedan pendientes de la app nativa). Las funciones
  // conectarMesa/desconectarMesa viven más abajo, después de declarar
  // FADER_NAMES/faderVols/faderMutes (que usan) — nunca antes, o caen en
  // zona muerta temporal.
  const [mesaMarca,setMesaMarca]=useState('soundcraft');
  const [mesaIP,setMesaIP]=useState('');
  const [mesaEstado,setMesaEstado]=useState('desconectado'); // desconectado|conectando|conectado|error
  const [mesaErrorMsg,setMesaErrorMsg]=useState(null);
  const [showConectarMesa,setShowConectarMesa]=useState(false);
  const mesaDriverRef=useRef(null);
  const mesaSubsRef=useRef([]);
  const mesaConectada = mesaEstado==='conectado';
  const mesaNombre = MARCAS_MESA.find(m=>m.id===mesaMarca)?.nombre || '';
  const [wifiStrength] = useState(3); // 0-4 — decorativo, WebSocket no expone RSSI
  const [monitorLayer,setMonitorLayer]=useState('A');

  // Chip de estado de monitoreo — aparece en sidebar (desktop) o en tab (mobile)
  const MonitorStatusChip=({compact=false})=>{
    const bars=[0,1,2,3];
    return(
      <div style={{
        display:'flex',alignItems:'center',gap:compact?6:8,
        padding:compact?'5px 8px':'8px 10px',
        borderRadius:compact?8:10,
        background:mesaConectada?'rgba(48,192,183,.1)':'var(--s1)',
        border:'1px solid '+(mesaConectada?'rgba(48,192,183,.25)':'var(--s3)'),
      }}>
        {/* Headphones icon */}
        <svg viewBox="0 0 24 24" width={compact?12:14} height={compact?12:14} fill="none"
          stroke={mesaConectada?'var(--gn)':'var(--tx3)'} strokeWidth="2">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
        </svg>
        {!compact&&(
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:9,fontWeight:900,color:mesaConectada?'var(--gn)':'var(--tx3)',
              textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1}}>
              {mesaConectada?'Conectado':'Sin conexión'}
            </div>
            <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginTop:2,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {mesaConectada?mesaNombre:'modo demo'}
            </div>
          </div>
        )}
        {/* WiFi bars */}
        <div style={{display:'flex',alignItems:'flex-end',gap:1.5,flexShrink:0}}>
          {bars.map(b=>(
            <div key={b} style={{
              width:3,
              height: 4+b*3,
              borderRadius:1,
              background:mesaConectada&&b<=wifiStrength
                ?'var(--gn)':'var(--bd2)',
              transition:'background .3s',
            }}/>
          ))}
        </div>
      </div>
    );
  };

  const [isTablet,setIsTablet]=useState(()=>window.innerWidth>=768);
  const [autoScroll,setAutoScroll]=useState(false);
  const [scrollSpeed,setScrollSpeed]=useState(RANGO_SCROLL.default);
  const [viewMode,setViewMode]=useState('lineal'); // mantener para compatibilidad interna
  const [showModePopup,setShowModePopup]=useState(false);
  const [notacion,setNotacion]=useState('americano'); // 'americano' | 'latino' | 'grados'
  const [showSpeedPopup,setShowSpeedPopup]=useState(false);

  const getSongContent=(song)=>{const k=song.name||song.n||'';return editedSongs[k]||contentDB[k]||null;};

  // ── Mapa de la Canción — vista de NAVEGACIÓN del panel lateral, INDEPENDIENTE
  // del contenido real de la canción. Reordenar/duplicar/eliminar aquí NUNCA
  // debe tocar getBloquesCancion() (lo que ve VistaBloques) ni el texto original.
  // Es solo un "mapa de lectura" privado del panel, por diseño explícito.
  const{getBloquesCancion,getActiveMapaCancion,initMapaCancion,duplicarBloqueMapa,eliminarBloqueMapa,reordenarMapa,resetMapa}=useMapaCancion({songs,idx,getSongContent});

  // ── Mover acorde por drag — posición absoluta en caracteres ─────────────
  // steps viene de Math.round(dx/7) donde dx es píxeles arrastrados.
  // En vez de mover 1 char por paso (que se acumula mal), calculamos
  // la posición objetivo del inicio del tag y reinsertamos ahí.
  const handleDragChord=(lineIdx,chordIdx,steps)=>{
    if(!steps)return;
    const song=songs[idx];
    if(song&&!song.name&&song.n){song.name=song.n;}
    const raw=getSongContent(song)||'';
    const allLines=raw.split('\n');

    // Saltar encabezado (igual que renderSongContent)
    let start=0;
    for(let i=0;i<Math.min(4,allLines.length);i++){
      const l=allLines[i].trim();
      if(!l||(!l.includes('[')&&!l.startsWith('===')))start=i+1;
      else break;
    }

    // Reconstruir bloques EXACTAMENTE igual que renderSongContent
    const blockRanges=[]; // {startAbsIdx, lines:[{text,absIdx}]}
    let curLines=[];
    allLines.slice(start).forEach((line,relIdx)=>{
      const absIdx=start+relIdx;
      const t=line.trim();
      if(t.startsWith('===')&&t.endsWith('===')){
        if(curLines.length)blockRanges.push(curLines);
        curLines=[];
      } else {
        curLines.push({text:line,absIdx});
      }
    });
    if(curLines.length)blockRanges.push(curLines);

    // Dentro de cada bloque, filtrar líneas vacías en bordes (igual que blines)
    let lineCounter=0;
    let targetAbsIdx=-1;

    for(const blockLines of blockRanges){
      const blines=blockLines.filter((l,i,a)=>!((!l.text.trim())&&(i===0||i===a.length-1)));
      // Detectar pares BARRO igual que el render
      let skipNext=false;
      for(let li=0;li<blines.length;li++){
        if(skipNext){skipNext=false;continue;}
        const line=blines[li].text;
        const isChordOnly=(()=>{
          const txt=line.trim();
          if(!txt)return false;
          if(/\[/.test(txt))return false;
          const tokens=txt.split(/\s+/);
          const CHORD_PLAIN=/^[A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?$/;
          return tokens.length>=1&&tokens.every(t=>CHORD_PLAIN.test(t));
        })();
        if(isChordOnly){
          // Línea BARRO — no es arrastrable (no tiene tags [X]), pero cuenta como línea
          if(lineCounter===lineIdx){targetAbsIdx=blines[li].absIdx;}
          lineCounter++;
          skipNext=true;
        } else {
          if(!line.trim())continue; // líneas vacías intermedias no cuentan (mismo criterio visual)
          if(lineCounter===lineIdx){targetAbsIdx=blines[li].absIdx;break;}
          lineCounter++;
        }
      }
      if(targetAbsIdx>=0)break;
    }

    if(targetAbsIdx<0)return;
    const line=allLines[targetAbsIdx];
    const chords=[];
    let m;
    CHORD_RE.lastIndex=0;
    while((m=CHORD_RE.exec(line))!==null){
      chords.push({start:m.index,end:m.index+m[0].length,full:m[0]});
    }
    const chord=chords[chordIdx];
    if(!chord)return;

    // Quitar el tag del acorde de su posición actual
    const lineWithout=line.slice(0,chord.start)+line.slice(chord.end);
    // Calcular nueva posición: start + steps, clamped a [0, lineWithout.length]
    const newPos=Math.max(0,Math.min(lineWithout.length,chord.start+steps));
    // Reinsertar el tag en la nueva posición
    const newLine=lineWithout.slice(0,newPos)+chord.full+lineWithout.slice(newPos);

    if(newLine===line)return;
    const newLines=[...allLines];
    newLines[targetAbsIdx]=newLine;
    setEditedSongs(prev=>({...prev,[song.name]:newLines.join('\n')}));
  };

  const handleSaveEdit=()=>{
    const song=songs[idx];
    const edited=editedSongs[song.name];
    if(edited&&onSaveChords){onSaveChords(song.name,edited);setToast('✓ Acordes guardados oficialmente');}
    setEditMode(false);setSelectedChord(null);
  };

  const isLight=theme==='cream';
  const svBg      =isLight?'#ffffff':'rgba(4,4,12,.97)';
  const svHdrBg   =isLight?'rgba(240,234,222,.98)':'rgba(5,5,14,.92)';
  const svNavBg   =isLight?'rgba(235,228,215,.98)':'rgba(5,5,14,.88)';
  const svTx      =isLight?'#1a1208':'var(--tx)';
  const svTx3     =isLight?'#8a7058':'var(--tx3)';
  const svAc      =isLight?'#D4500A':'var(--ac)';
  const svBd      =isLight?'rgba(0,0,0,.15)':'var(--bd)';

  useEffect(()=>{const h=()=>setIsTablet(window.innerWidth>=768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);

  const wrapRef=useRef(null);

  const song=songs[idx];
  const curKey=tpKey(song.key,tpOff);
  const sonaKey=tpKey(curKey,-capo);

  // ── Carpeta de canción (v36-ampliación) ──────────────────────────────────
  // baseName: nombre "real" de la canción sin el sufijo " · Variación" que
  // arma abrirSongDesdeRepertorio() en App.jsx al abrir una variación. Es
  // una heurística basada en esa convención de nombres — si esa convención
  // cambia, esto necesita un prop explícito baseCancionName en su lugar.
  const baseName=(song?.name||'').split(' · ')[0];
  const [showCarpeta,setShowCarpeta]=useState(false);
  const carpetaActual=archivosDB[baseName]||{trackReferencia:null,secuencia:[]};

  // ── Anotaciones (canvas de dibujo libre) — ver songview/useAnotaciones.js
  const{cvRef,startD,moveD,endD,undo,clear}=useAnotaciones({wrapRef,tool,color,sz,showAnnoBar,idx});
  // ── Auto-scroll por BPM — ver songview/useAutoScroll.js
  const{resetScroll}=useAutoScroll({wrapRef,autoScroll,setAutoScroll,scrollSpeed,idx});

  useEffect(()=>{setTpOff(0);setShowAnnoBar(false);setCapo(0);setCapoOpen(false);setShowSpeedPopup(false);},[idx]);
  useEffect(()=>{if(!autoScroll)setShowSpeedPopup(false);},[autoScroll]);
  // Si el permiso de ver acordes está desactivado, forzamos showChords=false
  // de forma persistente — sin esto, un alumno podría quedar con acordes
  // visibles si showChords ya estaba en true antes de aplicar el permiso.
  useEffect(()=>{if(!perm.verAcordes)setShowChords(false);},[perm.verAcordes]);
  // Mismo patrón defensivo para Nashville y Auto Scroll: si el permiso se
  // revoca mientras el control ya estaba activo, lo apagamos. Hoy esto no
  // puede ocurrir en la práctica (SongView reinicia su estado al desmontar),
  // pero queda como protección barata ante una futura persistencia de estado.
  useEffect(()=>{if(!perm.modoNashville)setNotacion('americano');},[perm.modoNashville]);
  useEffect(()=>{if(!perm.autoScroll)setAutoScroll(false);},[perm.autoScroll]);

  const doTp=steps=>{const nOff=tpOff+steps;setTpOff(nOff);setToast({text:`♩ ${tpKey(song.key,nOff)}`,sub:nOff===0?tx.original:`${nOff>0?'+':''}${nOff} st`});};
  const COLS=['#ff3b30','#0a84ff','#30d158','#ffd60a','#bf5af2'];
  // ── Panel Tono + Capo ─────────────────────────────────────────────────────
  const PanelTono=()=>(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',borderRadius:14,border:`1px solid ${svBd}`,background:isLight?'rgba(240,234,222,.85)':'rgba(6,4,18,.82)',backdropFilter:'blur(40px)',width:64,overflow:'visible',position:'relative'}}>
      <button onClick={()=>doTp(1)} style={{width:'100%',padding:'7px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)',borderRadius:'14px 14px 0 0'}}>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        <span style={{fontSize:8,fontWeight:900,color:'var(--tx3)',letterSpacing:'.5px'}}>#</span>
      </button>
      <div style={{width:'100%',padding:'6px 0',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:16,color:svAc,lineHeight:1}}>{curKey}</div>
        {tpOff!==0&&<div style={{fontSize:7,color:'var(--tx3)',fontWeight:700,marginTop:1}}>{tpOff>0?'+':''}{tpOff}st</div>}
      </div>
      <button onClick={()=>doTp(-1)} style={{width:'100%',padding:'7px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)'}}>
        <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',fontStyle:'italic'}}>b</span>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <button onClick={()=>setCapoOpen(o=>!o)} style={{width:'100%',padding:'6px 0',border:'none',background:capo>0?'rgba(200,169,126,.15)':'transparent',color:capo>0?'var(--ac)':'var(--tx3)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderRadius:'0 0 14px 14px',transition:'all .2s'}}>
        <span style={{fontSize:7,fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',color:capo>0?svAc:svTx3}}>CAPO</span>
        <span style={{fontSize:capo>0?13:11,fontWeight:900,color:capo>0?'var(--ac)':'var(--tx3)',lineHeight:1}}>{capo>0?capo:'—'}</span>
        {capo>0&&<span style={{fontSize:7,color:'var(--gn)',fontWeight:700,lineHeight:1.2}}>{sonaKey}</span>}
        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:capoOpen?'rotate(180deg)':'none',transition:'transform .2s',marginTop:1}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {capoOpen&&(
        <div style={{position:'absolute',right:60,top:'50%',transform:'translateY(-50%)',background:isLight?'rgba(240,234,222,.97)':'rgba(10,10,20,.97)',border:`2px solid ${svBd}`,borderRadius:14,padding:12,zIndex:10,minWidth:140,boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Posición de capo</div>
          {[0,1,2,3,4,5,6,7].map(c=>{
            const notaSuena=c===0?curKey:tpKey(curKey,-c);
            const isOn=capo===c;
            return(
              <button key={c} onClick={()=>{setCapo(c);setCapoOpen(false);setToast(c===0?{text:tx.noCapo,sub:tx.original}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                style={{width:'100%',padding:'7px 10px',marginBottom:3,border:'none',borderRadius:8,background:isOn?'rgba(200,169,126,.15)':'var(--s1)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {isOn?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--ac)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:10}}/>}
                  <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:13,color:isOn?'var(--ac)':'var(--tx)',lineHeight:1}}>{c===0?tx.noCapo:c}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,fontWeight:700,color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'Outfit',sans-serif"}}>{notaSuena}</div>
                  {c>0&&<div style={{fontSize:8,color:'var(--tx3)',marginTop:1}}>suena</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Fader de velocidad de Auto Scroll — contenido reusable ───────────────
  // Mismo slider, usado inline (tablet/PC) o dentro de un popup (móvil).
  // Thumb agrandado vía clase CSS .fader-velocidad (ver theme.css) — el
  // slider siempre soportó drag nativo, pero el thumb por defecto del
  // navegador es muy chico para agarrarlo con precisión en pantallas
  // táctiles, lo cual se sentía como "solo responde al clic".
  const FaderVelocidad=()=>(
    <>
      <span style={{fontSize:9,color:'var(--tx3)',fontWeight:700,flexShrink:0}}>Lento</span>
      <input
        type="range"
        className="fader-velocidad"
        min={RANGO_SCROLL.min}
        max={RANGO_SCROLL.max}
        value={scrollSpeed}
        onChange={e=>setScrollSpeed(Number(e.target.value))}
        style={{flex:1}}
      />
      <span style={{fontSize:9,color:'var(--tx3)',fontWeight:700,flexShrink:0}}>Rápido</span>
    </>
  );

  // ── Popup de velocidad — solo en móvil vertical, para no ocupar espacio
  // fijo en la barra de controles cuando la pantalla es angosta ───────────
  const PopupVelocidad=()=>(
    <div onClick={()=>setShowSpeedPopup(false)} style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#111113',border:'1px solid var(--bd)',borderRadius:20,padding:'22px 20px',maxWidth:300,width:'85%'}}>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,fontWeight:400,color:'var(--tx)',marginBottom:16}}>Velocidad de Auto Scroll</div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <FaderVelocidad/>
        </div>
        <button onClick={()=>setShowSpeedPopup(false)} style={{width:'100%',padding:'10px',marginTop:18,border:'1px solid var(--bd)',borderRadius:10,background:'transparent',color:'var(--tx2)',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:13}}>Listo</button>
      </div>
    </div>
  );

  // ── AnnoBar ───────────────────────────────────────────────────────────────
  const AnnoBar=()=>(
    <div style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',overflowX:'auto',scrollbarWidth:'none'}}>
        {perm.anotacionesPropias&&(
          <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,border:showAnnoBar?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:showAnnoBar?'rgba(200,169,126,.1)':'var(--s1)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
        )}
        <div style={{flex:1,flexShrink:0,minWidth:4}}/>
        {capo>0&&(
          <div style={{padding:'3px 8px',borderRadius:100,background:'rgba(94,206,160,.1)',border:'1px solid rgba(94,206,160,.25)',fontSize:10,fontWeight:700,color:'var(--gn)',flexShrink:0}}>
            Capo {capo} · {sonaKey}
          </div>
        )}
        {/* Selector de notación: Americano / Latino / Grados.
            BUG CORREGIDO (reportado por Danny): el dropdown no se veía al
            abrirlo. Causa real: este botón vive dentro de AnnoBar, cuyo
            contenedor directo tiene overflowX:'auto' para permitir scroll
            horizontal de toda la fila de botones. Cualquier hijo con
            position:absolute queda recortado por los límites de un
            ancestro con overflow distinto de 'visible' — regla básica de
            CSS, no relacionada con el estado de React (que sí se activaba
            bien, por eso la flecha rotaba en la captura de Danny aunque el
            panel no apareciera). Solución: createPortal renderiza el
            dropdown directamente en document.body, fuera del árbol DOM
            del contenedor con overflow, posicionado con coordenadas fijas
            calculadas desde getBoundingClientRect() del botón real. */}
        {/* Botón de Tono/Capo desplegable */}
        <div style={{position:'relative',flexShrink:0}}>
          <button ref={tonoBtnRef} onClick={()=>{
            if(!tonoOpen){
              const r=tonoBtnRef.current.getBoundingClientRect();
              const panelW=Math.min(260,window.innerWidth-24);
              const leftIdeal=r.left+(r.width/2)-(panelW/2);
              const left=Math.max(12,Math.min(leftIdeal,window.innerWidth-panelW-12));
              setTonoPos({top:r.bottom+6,left,width:panelW});
            }
            setTonoOpen(o=>!o);
          }} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,
            border:(tpOff!==0||capo>0)?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',
            background:(tpOff!==0||capo>0)?'rgba(200,169,126,.12)':'var(--s1)',
            color:(tpOff!==0||capo>0)?'var(--ac)':'var(--tx3)',
            cursor:'pointer',fontSize:12,fontWeight:900,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
            <span style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:13}}>{curKey}</span>
            {capo>0&&<span style={{fontSize:9,color:'var(--gn)',fontWeight:700}}>·{sonaKey}</span>}
            {notacion!=='americano'&&<span style={{fontSize:8,color:'#a78bfa',fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>{NOTACION_LABELS[notacion].slice(0,3)}</span>}
            <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{transform:tonoOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {tonoOpen&&tonoPos&&createPortal(
            <>
              <div onClick={()=>setTonoOpen(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
              <div style={{position:'fixed',top:tonoPos.top,left:tonoPos.left,
                width:tonoPos.width,
                background:isLight?'rgba(240,234,222,.97)':'rgba(10,10,20,.97)',
                border:`2px solid ${svBd}`,borderRadius:16,padding:14,zIndex:999,
                boxShadow:'0 8px 32px rgba(0,0,0,.8)'}}>
                {/* Transposición */}
                <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Transposición</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <button onClick={()=>doTp(-1)} style={{width:36,height:36,borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:16,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',fontStyle:'italic'}}>b</button>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:28,color:svAc,lineHeight:1}}>{curKey}</div>
                    {tpOff!==0&&<div style={{fontSize:9,color:'var(--tx3)',fontWeight:700,marginTop:2}}>{tpOff>0?'+':''}{tpOff}st</div>}
                  </div>
                  <button onClick={()=>doTp(1)} style={{width:36,height:36,borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:16,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>#</button>
                </div>
                {tpOff!==0&&<button onClick={()=>{setTpOff(0);setToast({text:`♩ ${song.key}`,sub:tx.original});}} style={{width:'100%',padding:'6px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',fontSize:10,fontWeight:700,fontFamily:"'Outfit',sans-serif",marginBottom:10}}>Restaurar original</button>}
                {/* Capo */}
                <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Capo</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:14}}>
                  {[0,1,2,3,4,5,6,7].map(c=>{
                    const notaSuena=c===0?curKey:tpKey(curKey,-c);
                    const isOn=capo===c;
                    return(
                      <button key={c} onClick={()=>{setCapo(c);setToast(c===0?{text:tx.noCapo,sub:tx.original}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                        style={{padding:'6px 4px',borderRadius:8,border:isOn?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',
                          background:isOn?'rgba(200,169,126,.15)':'var(--s1)',
                          cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,transition:'all .15s'}}>
                        <span style={{fontSize:12,fontWeight:900,color:isOn?'var(--ac)':'var(--tx)',fontFamily:"'Outfit',sans-serif"}}>{c===0?'—':c}</span>
                        <span style={{fontSize:8,color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'Outfit',sans-serif",fontWeight:700}}>{notaSuena}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Notación */}
                <div style={{borderTop:'1px solid var(--s3)',paddingTop:10}}>
                  <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Notación</div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {['americano','latino','grados'].map(opt=>{
                      const isOn=notacion===opt;
                      return(
                        <button key={opt} onClick={()=>setNotacion(opt)}
                          style={{padding:'7px 10px',border:'none',borderRadius:8,
                            background:isOn?'rgba(167,139,250,.15)':'var(--s1)',
                            cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'all .15s'}}>
                          {isOn
                            ?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#a78bfa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            :<div style={{width:10,flexShrink:0}}/>
                          }
                          <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:13,color:isOn?'#a78bfa':'var(--tx)',lineHeight:1}}>{NOTACION_LABELS[opt]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
        </div>

        {perm.verAcordes&&(
          <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:!showChords?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:!showChords?'rgba(200,169,126,.1)':'var(--s1)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
            {showChords?tx.lyricsOnly:tx.withChords}
          </button>
        )}
        {perm.autoScroll&&(
          <button onClick={()=>{const next=!autoScroll;setAutoScroll(next);resetScroll();if(next&&!isTablet)setShowSpeedPopup(true);}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:autoScroll?'1px solid rgba(94,206,160,.5)':'1px solid var(--bd)',background:autoScroll?'rgba(94,206,160,.15)':'var(--s1)',color:autoScroll?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0,transition:'all .2s'}}>
            {autoScroll?<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
            {tx.autoScroll}
          </button>
        )}

        {isAdmin&&(
          <>
          <button onClick={()=>{if(editMode){setEditMode(false);setSelectedChord(null);}else setEditMode(true);}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:editMode?'1px solid var(--ac)':'1px solid rgba(200,169,126,.28)',background:editMode?'rgba(200,169,126,.15)':'rgba(200,169,126,.07)',color:'var(--ac)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {editMode?tx.cancel:tx.edit}
          </button>
          {editMode&&editedSongs[songs[idx]?.name]&&(
            <button onClick={handleSaveEdit} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:'1px solid rgba(94,206,160,.5)',background:'rgba(94,206,160,.15)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Publicar
            </button>
          )}
          </>
        )}
        
      </div>
      {showAnnoBar&&(
        <div style={{display:'flex',alignItems:'center',gap:3,padding:'0 10px 5px',overflowX:'auto',scrollbarWidth:'none'}}>
          {[['draw','Lápiz'],['erase','Borrar']].map(([t,l])=>(
            <button key={t} onClick={()=>setTool(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,border:tool===t?'1px solid var(--bd)':'1px solid transparent',background:tool===t?'var(--s3)':'transparent',color:tool===t?'var(--tx)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>{l}</button>
          ))}
          <div style={{width:1,height:16,background:'var(--bd)',margin:'0 3px'}}/>
          {COLS.map(c=>(<button key={c} onClick={()=>setColor(c)} style={{width:18,height:18,borderRadius:'50%',background:c,border:color===c?'2px solid #fff':'2px solid transparent',cursor:'pointer',flexShrink:0}}/>))}
          <div style={{width:1,height:16,background:'var(--bd)',margin:'0 3px'}}/>
          <button onClick={undo} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
          </button>
          <button onClick={clear} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      )}
      {/* Fader de velocidad de Auto Scroll:
          - Tablet/PC (isTablet): inline en la barra, hay espacio de sobra.
          - Móvil vertical (!isTablet): como popup, para no competir con
            los demás botones en una pantalla angosta. */}
      {autoScroll&&(
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 10px 8px'}}>
          <FaderVelocidad/>
          <span style={{
            fontSize:11,fontWeight:900,color:'var(--gn)',
            fontFamily:"'Outfit',sans-serif",minWidth:28,textAlign:'right',flexShrink:0,
          }}>{scrollSpeed}×</span>
        </div>
      )}
    </div>
  );


  // ── Popup Guardar ──────────────────────────────────────────────────────────
  const PopupGuardar=()=>(
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}}>
      <div style={{background:'#111113',border:'1px solid var(--bd)',borderRadius:20,padding:'24px',maxWidth:300,width:'90%'}}>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,fontWeight:400,color:'var(--tx)',marginBottom:8}}>Guardar cambios</div>
        <div style={{fontSize:12,color:'var(--tx3)',fontFamily:"'Outfit',sans-serif",marginBottom:20,lineHeight:1.5}}>Tienes cambios sin guardar en esta canción. ¿Qué deseas hacer?</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={()=>{handleSaveEdit();setShowSavePopup(false);onClose();}} style={{padding:'11px',borderRadius:10,border:'none',background:'var(--gn)',color:'#fff',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:13}}>Guardar y salir</button>
          <button onClick={()=>{setShowSavePopup(false);onClose();}} style={{padding:'11px',borderRadius:10,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx2)',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:13}}>Salir sin guardar</button>
          <button onClick={()=>setShowSavePopup(false)} style={{padding:'8px',border:'none',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontSize:12}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
  // ── Popup modo bloques — solo la primera vez ──────────────────────────────
  const PopupModoBloques=()=>(
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--ov-modal)',backdropFilter:'blur(8px)'}} onClick={()=>setShowModePopup(false)}>
      <div onClick={e=>e.stopPropagation()} style={{background:isLight?'rgba(240,234,222,.97)':'rgba(10,6,22,.97)',backdropFilter:'blur(40px)',border:'1px solid var(--bd2)',borderRadius:20,padding:'28px 24px',maxWidth:320,width:'90%',boxShadow:'0 24px 60px rgba(0,0,0,.5)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:'var(--s1)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--ac)" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>
          </div>
          <div>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:'var(--tx)'}}>Vista por Bloques</div>
            <div style={{fontSize:11,color:'var(--ac)',fontWeight:700}}>Modo Pro</div>
          </div>
        </div>
        <div style={{fontSize:13,color:'var(--tx)',lineHeight:1.6,marginBottom:16,fontFamily:"'Outfit',sans-serif"}}>
          Toda la canción <strong>en pantalla, sin scroll.</strong> Cada sección ocupa su propio espacio.
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {[['🎯','Cero scroll — todo visible de un vistazo'],['📐','Texto al máximo tamaño por bloque'],['🗺️','Mapa lateral — visualiza y navega la estructura'],['⚡','Ideal para iPads y pantallas grandes']].map(([ico,txt],i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:'var(--s1)',border:'1px solid var(--bd)'}}>
              <span style={{fontSize:16}}>{ico}</span>
              <span style={{fontSize:12,color:'var(--tx2)',fontFamily:"'Outfit',sans-serif",fontWeight:600}}>{txt}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>{setViewMode('bloques');setAutoScroll(false);initMapaCancion();setShowModePopup(false);try{localStorage.setItem(POPUP_SEEN_KEY,'1');}catch{}}}
          style={{width:'100%',padding:'13px',border:'none',borderRadius:12,background:'var(--ac)',color:isLight?'#fff':'#0a0a0a',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:14,letterSpacing:'.5px'}}>
          Activar Vista Bloques
        </button>
        <button onClick={()=>setShowModePopup(false)} style={{width:'100%',padding:'8px',border:'none',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:12,marginTop:6}}>
          Cancelar
        </button>
      </div>
    </div>
  );

  // ── Toggle vista ──────────────────────────────────────────────────────────
  const ToggleVista=()=>(
    <div style={{display:'flex',gap:3,alignItems:'center',padding:'3px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',flexShrink:0}}>
      <button onClick={()=>{
        if(viewMode!=='bloques'){
          const seen=localStorage.getItem(POPUP_SEEN_KEY);
          if(seen){setViewMode('bloques');setAutoScroll(false);initMapaCancion();}
          else setShowModePopup(true);
        }
      }} title="Vista por bloques" style={{padding:'4px 8px',borderRadius:7,border:'none',background:viewMode==='bloques'?'var(--ac)':'transparent',color:viewMode==='bloques'?(isLight?'#fff':'#0a0a0a'):'var(--tx3)',cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
      </button>
      <button onClick={()=>{if(viewMode!=='lineal')setViewMode('lineal');}} title="Vista lineal" style={{padding:'4px 8px',borderRadius:7,border:'none',background:viewMode==='lineal'?'var(--ac)':'transparent',color:viewMode==='lineal'?(isLight?'#fff':'#0a0a0a'):'var(--tx3)',cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="3" y1="20" x2="21" y2="20"/></svg>
      </button>
    </div>
  );

  // ── ContentArea — layout correcto con MapaMaestro sticky ─────────────────
  const ContentArea=()=>(
    <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',position:'relative'}}>
      <MapaMaestro/>
      {/* Contenedor de letra — flex:1 relativo para canvas+scroll */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',width:'100%',height:'100%',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
          onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
          onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
        />
        <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 10px 112px 10px',display:'flex',alignItems:'flex-start',justifyContent:'flex-start'}}>
          {song.docId
            ?<iframe src={`https://docs.google.com/document/d/${song.docId}/preview`} allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none',zIndex:1}}/>
            :song.partitura
            ?<div style={{width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:12,paddingTop:10}}>
                <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                  letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif"}}>Partitura · {song.partitura.nombre}</div>
                <img src={song.partitura.url} alt={song.partitura.nombre}
                  style={{maxWidth:'100%',borderRadius:14,border:'1px solid var(--bd)',
                    boxShadow:'0 20px 50px rgba(0,0,0,.4)'}}/>
              </div>
            :<div style={{width:'100%'}}>{renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,steps)=>handleDragChord(li,ci,steps),notacion,curKey)}</div>
          }
        </div>
      </div>
    </div>
  );


  // ── Monitor panel — estado centralizado en SongView ─────────────────────
  const CIFRAS=['4/4','3/4','6/8','2/4','5/4','12/8'];
  const FADER_NAMES=['Kick','Snare','Hi-Hat','Bass','Gtr 1','Gtr 2','Keys','Voz 1','Voz 2','Voz 3','Coros','Coros 2','Pad','Fx','Aux L','Aux R'];
  const [faderVols,setFaderVols]=useState(()=>FADER_NAMES.map(()=>75));
  const [trackVols,setTrackVols]=useState(()=>Array(20).fill(80));
  const [trackMutes,setTrackMutes]=useState(()=>Array(20).fill(false));
  // seqLayer eliminado — con tope de 6 pistas ya no hace falta selector de capas A/B
  const [seqPos,setSeqPos]=useState(0);          // posición de playback 0-1
  const [seqHighlight,setSeqHighlight]=useState(null); // {from:0-1, to:0-1} bloque activo
  // ── Referencia (audio player) ───────────────────────────────────────────
  const [refAudio,setRefAudio]=useState(null);       // File object
  const [refUrl,setRefUrl]=useState(null);           // object URL
  const [refPlaying,setRefPlaying]=useState(false);
  const [refTime,setRefTime]=useState(0);
  const [refDuration,setRefDuration]=useState(0);
  const [refLoopIn,setRefLoopIn]=useState(null);
  const [refLoopOut,setRefLoopOut]=useState(null);
  const [refLooping,setRefLooping]=useState(false);
  const [refSpeed,setRefSpeed]=useState(1);
  const refPlayerRef=useRef(null);
  const refInputRef=useRef(null);
  const refWaveRef=useRef(null);
  const refAnimRef=useRef(null);
  // ── Referencia Capa 2 — Grabaciones de ensayo (v36) ──────────────────────
  // NOTA: los slots de grabación en Ensayo siguen 100% locales por ahora
  // (sin Firebase Storage/Firestore aún — decisión de Danny 01-Jul-2026).
  // El destino "Canción" en cambio SÍ persiste, en archivosDB (App.jsx).
  const [refTab,setRefTab]=useState('track');           // 'track' | 'grabaciones'
  const [grabaciones,setGrabaciones]=useState([null,null,null]); // 3 slots fijos (v36)
  const [isRecording,setIsRecording]=useState(false);
  const [recordSlot,setRecordSlot]=useState(null);       // idx del slot que se está grabando
  const [recordElapsed,setRecordElapsed]=useState(0);    // segundos
  const [recordError,setRecordError]=useState(null);
  const [pendingRecording,setPendingRecording]=useState(null); // {blob,url,duracionSeg,slotIdx}
  const [selectedEnsayoId,setSelectedEnsayoId]=useState(null);
  const mediaRecorderRef=useRef(null);
  const mediaStreamRef=useRef(null);
  const recordChunksRef=useRef([]);

  // Timer de grabación (hook en el nivel de SongView — nunca dentro de
  // ReferenciaPanel, que se re-crea cada render y perdería el estado)
  useEffect(()=>{
    if(!isRecording) return;
    const iv=setInterval(()=>setRecordElapsed(s=>s+1),1000);
    return ()=>clearInterval(iv);
  },[isRecording]);

  // Auto-carga de carpeta (v36-ampliación): si la canción ya tiene un
  // track de referencia guardado (subido o grabado en una sesión previa),
  // se carga solo al entrar — pedido de Danny: "si hay grabaciones o
  // referencias también deben aparecer". No pisa nada que el usuario ya
  // haya cargado en esta misma sesión (refUrl truthy).
  useEffect(()=>{
    const tr=archivosDB[baseName]?.trackReferencia;
    if(tr&&!refUrl){
      setRefAudio({name:tr.nombre});
      setRefUrl(tr.url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[baseName]);
  const [faderMutes,setFaderMutes]=useState(()=>FADER_NAMES.map(()=>false));

  // Conectar/desconectar mesa real vía driver (v36-ampliación). Vive acá,
  // después de FADER_NAMES/faderVols/faderMutes, porque los usa — antes
  // de esas declaraciones cae en zona muerta temporal.
  const conectarMesa=async()=>{
    if(!mesaIP.trim()){ setMesaErrorMsg('Ingresa la IP de la mesa'); return; }
    mesaDriverRef.current?.disconnect?.();
    mesaSubsRef.current.forEach(s=>s?.unsubscribe?.());
    mesaSubsRef.current=[];
    setMesaErrorMsg(null);
    setMesaEstado('conectando');
    const driver=crearDriver(mesaMarca, mesaIP.trim());
    driver.onStatusChange(estado=>setMesaEstado(estado));
    mesaDriverRef.current=driver;
    try{
      await driver.connect();
      setToast({text:`✓ Conectado a ${mesaNombre}`,sub:mesaIP.trim()});
      // Sincroniza los 8 faders visibles con los valores reales de la mesa
      FADER_NAMES.forEach((_,ci)=>{
        const subF=driver.onFaderChange(monitorBus, ci+1, v=>{
          setFaderVols(prev=>{const n=[...prev];n[ci]=Math.round(v*100);return n;});
        });
        const subM=driver.onMuteChange(monitorBus, ci+1, m=>{
          setFaderMutes(prev=>{const n=[...prev];n[ci]=m;return n;});
        });
        mesaSubsRef.current.push(subF,subM);
      });
    }catch(err){
      setMesaErrorMsg(err.message||'No se pudo conectar');
      setMesaEstado('error');
    }
  };
  const desconectarMesa=()=>{
    mesaDriverRef.current?.disconnect?.();
    mesaSubsRef.current.forEach(s=>s?.unsubscribe?.());
    mesaSubsRef.current=[];
    mesaDriverRef.current=null;
    setMesaEstado('desconectado');
  };
  // Limpieza al desmontar SongView — no dejar el socket abierto
  useEffect(()=>()=>{
    mesaDriverRef.current?.disconnect?.();
    mesaSubsRef.current.forEach(s=>s?.unsubscribe?.());
  },[]);

  // ── Barra de pestañas inferior (Letra / Monitor / Secuencia) + Nav ──────
  const BottomTabBar=()=>{
    const canPrev = idx > 0;
    const isLast  = idx === songs.length - 1;

    // Icono Monitor: headphone + WiFi arcs — verde con glow cuando conectado
    const IconMonitor=({active})=>{
      const connected = mesaConectada;
      const col = connected?'var(--gn)':active?'var(--ac)':'var(--tx3)';
      return(
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
          style={connected?{filter:'drop-shadow(0 0 5px rgba(48,192,183,.9)) drop-shadow(0 0 10px rgba(48,192,183,.5))'}:{}}>
          {/* Auricular */}
          <path d="M5 15v-3a7 7 0 0 1 14 0v3"
            stroke={col} strokeWidth="2" strokeLinecap="round"/>
          <rect x="3" y="13.5" width="4" height="5.5" rx="2"
            fill={col} opacity={connected?1:.7}/>
          <rect x="17" y="13.5" width="4" height="5.5" rx="2"
            fill={col} opacity={connected?1:.7}/>
          {/* WiFi arcos — 3 niveles, visibles solo cuando conectado */}
          {connected&&[
            {r:3,  sw:1.5, op:.5},
            {r:5,  sw:1.8, op:.7},
            {r:7,  sw:2,   op:.9},
          ].map(({r,sw,op},i)=>(
            <path key={i}
              d={`M ${12-r*0.707} ${8-r*0.707} A ${r} ${r} 0 0 1 ${12+r*0.707} ${8-r*0.707}`}
              stroke="var(--gn)" strokeWidth={sw} strokeLinecap="round" fill="none" opacity={op}/>
          ))}
        </svg>
      );
    };

    // Icono Secuencia: soundwave + marcador
    const IconSecuencia=({active})=>{
      const col = active ? 'var(--ac)' : 'var(--tx3)';
      const mk  = active ? 'var(--ac)' : 'var(--tx2)';
      return(
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={col} strokeWidth="1.8">
          <line x1="3"  y1="16" x2="3"  y2="9"  strokeLinecap="round"/>
          <line x1="6"  y1="19" x2="6"  y2="6"  strokeLinecap="round"/>
          <line x1="9"  y1="14" x2="9"  y2="11" strokeLinecap="round"/>
          <line x1="12" y1="20" x2="12" y2="5"  strokeLinecap="round"/>
          <line x1="15" y1="14" x2="15" y2="11" strokeLinecap="round"/>
          <line x1="18" y1="19" x2="18" y2="6"  strokeLinecap="round"/>
          <line x1="21" y1="16" x2="21" y2="9"  strokeLinecap="round"/>
          <line x1="9" y1="2" x2="9" y2="4.5" strokeWidth="1.4" stroke={mk}/>
          <polygon points="6.5,4.5 11.5,4.5 9,7.5" fill={mk} stroke="none"/>
        </svg>
      );
    };

    const tabs=[
      {id:'referencia',label:'Referencia',renderIcon:(a)=>(<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={a?'var(--ac)':'var(--tx3)'} strokeWidth="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>)},
      {id:'monitor', label:'Monitor',  renderIcon:(a)=>(<IconMonitor active={a}/>)},
      {id:'secuencia',label:'Secuencia',renderIcon:(a)=>(<IconSecuencia active={a}/>)},
    ];
    return(
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(8,8,9,.97)',borderTop:'1px solid var(--bd)',
        backdropFilter:'blur(20px)',zIndex:120,
        display:'flex',alignItems:'stretch',
        paddingBottom:'env(safe-area-inset-bottom,0px)',
        minHeight:54,
      }}>
        {/* ← Anterior */}
        <button onClick={()=>canPrev&&setIdx(i=>i-1)} disabled={!canPrev}
          style={{width:64,border:'none',background:'transparent',flexShrink:0,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
            cursor:canPrev?'pointer':'default',borderTop:'2px solid transparent',padding:'0 4px'}}>
          <div style={{
            display:'flex',alignItems:'center',gap:3,
            padding:'5px 10px',borderRadius:20,
            background:canPrev?'var(--bd)':'transparent',
            border:canPrev?'1px solid var(--div)':'1px solid transparent',
            transition:'all .2s',
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={canPrev?'var(--tx)':'var(--bd2)'} strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',
              fontFamily:"'Lexend Giga',sans-serif",color:canPrev?'var(--tx)':'var(--bd2)'}}>Ant</span>
          </div>
        </button>

        {/* Tabs */}
        {tabs.map(tab=>{
          const isOn = bottomTab===tab.id;
          return(
            <button key={String(tab.id)} onClick={()=>{
              if(tab.id==='monitor'){
                setShowMonitor(true);
                setBottomTab(isOn?null:tab.id);
              } else {
                setBottomTab(isOn?null:tab.id);
              }
            }} style={{
              flex:1,border:'none',background:'transparent',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
              color: isOn?'var(--ac)':mesaConectada&&tab.id==='monitor'?'var(--gn)':'var(--tx3)',
              borderTop: isOn?'2px solid var(--ac)':mesaConectada&&tab.id==='monitor'?'2px solid var(--gn)':'2px solid transparent',
              cursor:'pointer',transition:'all .15s',
              fontFamily:"'Lexend Giga',sans-serif",
            }}>
              <span style={{display:'flex',alignItems:'center'}}>{tab.renderIcon(isOn)}</span>
              <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'inherit'}}>{tab.label}</span>
            </button>
          );
        })}

        {/* Siguiente → */}
        <button onClick={()=>{ if(isLast) onClose(); else setIdx(i=>i+1); }}
          style={{width:64,border:'none',background:'transparent',flexShrink:0,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
            cursor:'pointer',borderTop:'2px solid transparent',padding:'0 4px'}}>
          <div style={{
            display:'flex',alignItems:'center',gap:3,
            padding:'5px 10px',borderRadius:20,
            background:isLast?'rgba(253,128,131,.2)':'rgba(48,192,183,.2)',
            border:isLast?'1px solid rgba(253,128,131,.5)':'1px solid rgba(48,192,183,.5)',
            transition:'all .2s',
          }}>
            <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',
              fontFamily:"'Lexend Giga',sans-serif",color:isLast?'var(--rd)':'var(--gn)'}}>
              {isLast?'Fin':'Sig'}
            </span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={isLast?'var(--rd)':'var(--gn)'} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      </div>
    );
  };

  // ── Datos de secuencia precargados por canción ────────────────────────────
  const SECUENCIA_DATA={
    'YESHUA':{
      click:{bpm:130,compas:'4/4',intro:4,activo:false},
      guias:[
        {label:'Intro',compases:4,color:'#30C0B7'},
        {label:'Verso 1',compases:8,color:'#a78bfa'},
        {label:'Pre-Coro',compases:4,color:'#f59e0b'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Verso 2',compases:8,color:'#a78bfa'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Bridge',compases:8,color:'#30C0B7'},
        {label:'Final',compases:4,color:'#52555c'},
      ],
      pads:['Calmo','Expectante','Poderoso','Cierre'],
      multitracks:[
        {label:'Guía vocal',color:'#EE227D'},
        {label:'Click/Perc',color:'#FD8083'},
        {label:'Keys pad',color:'#30C0B7'},
        {label:'Brass',color:'#f59e0b'},
        {label:'Guitarra',color:'#a78bfa'},
        {label:'Bajo',color:'#52555c'},
      ],
    },
    'GLORIA EN GLORIA':{
      click:{bpm:86,compas:'6/8',intro:8,activo:false},
      guias:[
        {label:'Intro',compases:8,color:'#30C0B7'},
        {label:'Verso 1',compases:8,color:'#a78bfa'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Verso 2',compases:8,color:'#a78bfa'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Bridge x2',compases:16,color:'#30C0B7'},
        {label:'Coro Final',compases:8,color:'#EE227D'},
      ],
      pads:['Calmo','Ascendente','Gloria','Outro'],
      multitracks:[
        {label:'Guía vocal',color:'#EE227D'},
        {label:'Click 6/8',color:'#FD8083'},
        {label:'Strings',color:'#30C0B7'},
        {label:'Guitarra',color:'#a78bfa'},
        {label:'Bajo',color:'#52555c'},
        {label:'Coros',color:'#f59e0b'},
      ],
    },
  };
  const seqData = SECUENCIA_DATA[song?.name] || null;
  const [clickActivo, setClickActivo] = useState(false);
  const [padActivo, setPadActivo] = useState(null);
  const audioCtxRef = useRef(null);
  const clickIntervalRef = useRef(null);

  // ── Motor de Click con Web Audio API ──────────────────────────────────────
  // Parsear beats por compás desde la cifra (ej: '6/8' → 6, '4/4' → 4)
  const beatsFromCifra=(c)=>{
    const n=parseInt((c||'4/4').split('/')[0]);
    return isNaN(n)?4:n;
  };

  const startClick = (bpm, cifra) => {
    if(clickIntervalRef.current) clearInterval(clickIntervalRef.current);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    const beats = beatsFromCifra(cifra||seqCifra);
    let beat = 0;
    const playBeat = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const isDown = beat % beats === 0;
      osc.frequency.value = isDown ? 1400 : 900;
      gain.gain.setValueAtTime(isDown ? 0.5 : 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
      beat++;
    };
    playBeat();
    clickIntervalRef.current = setInterval(playBeat, 60000 / bpm);
  };
  const stopClick = () => {
    if(clickIntervalRef.current){ clearInterval(clickIntervalRef.current); clickIntervalRef.current=null; }
    if(audioCtxRef.current){ audioCtxRef.current.close(); audioCtxRef.current=null; }
  };

  // ── Panel de Click con BPM y cifra editables ─────────────────────────────
  const defaultBpm = SECUENCIA_DATA[song?.name]?.click.bpm || song?.bpm || 120;
  const defaultCifra = SECUENCIA_DATA[song?.name]?.click.compas || '4/4';
  const [seqBpm, setSeqBpm] = useState(defaultBpm);
  const [seqCifra, setSeqCifra] = useState(defaultCifra);
  // seqBpmRef — espejo sincrónico de seqBpm para los botones +/- con
  // auto-repeat (mantener presionado). FIX bug "BPM se descontrola":
  // antes, el closure `fire` capturaba seqBpm del render en que se hizo
  // pointerdown y el setInterval lo re-usaba sin cambios en cada tick,
  // así que valores repetidos o intervalos huérfanos (por doble evento
  // pointerdown en touch) hacían saltar el número. Ahora fire lee/escribe
  // siempre el valor más reciente vía ref, sin esperar al re-render.
  const seqBpmRef = useRef(seqBpm);
  useEffect(()=>{ seqBpmRef.current = seqBpm; }, [seqBpm]);

  // ── Rueda de selección de BPM (Secuencia) ──────────────────────────────
  // Reemplaza los botones −/+ con auto-repeat: en touch, ese patrón podía
  // quedar corriendo sin control si el navegador no entregaba un pointerup
  // limpio. Un scroll nativo con scroll-snap no tiene esa clase de bug —
  // el navegador maneja el touch, nosotros solo leemos dónde quedó.
  const BPM_MIN=40, BPM_MAX=300, WHEEL_ITEM_H=26;
  const wheelRef=useRef(null);
  const wheelScrollTimeout=useRef(null);
  const wheelSyncing=useRef(false); // true mientras nosotros movemos el scroll por código
  const scrollWheelTo=useCallback((bpm,smooth=false)=>{
    const el=wheelRef.current;
    if(!el)return;
    wheelSyncing.current=true;
    el.scrollTo({top:(Math.max(BPM_MIN,Math.min(BPM_MAX,bpm))-BPM_MIN)*WHEEL_ITEM_H,behavior:smooth?'smooth':'auto'});
    requestAnimationFrame(()=>{setTimeout(()=>{wheelSyncing.current=false;},50);});
  },[]);
  const handleWheelScroll=()=>{
    if(wheelSyncing.current)return;
    clearTimeout(wheelScrollTimeout.current);
    wheelScrollTimeout.current=setTimeout(()=>{
      const el=wheelRef.current;
      if(!el)return;
      const idx=Math.round(el.scrollTop/WHEEL_ITEM_H);
      const v=Math.max(BPM_MIN,Math.min(BPM_MAX,BPM_MIN+idx));
      if(v!==seqBpmRef.current){
        seqBpmRef.current=v;
        setSeqBpm(v);
        if(clickActivo){stopClick();startClick(v);}
      }
    },120);
  };
  // Mantener la rueda sincronizada cuando seqBpm cambia desde afuera
  // (cambio de canción, tap tempo) — idempotente si el cambio vino de la
  // rueda misma, así que es seguro correrlo siempre.
  useEffect(()=>{ scrollWheelTo(seqBpm); },[seqBpm,scrollWheelTo]);

  // Tap tempo — mismo patrón que en Cancionero, pero escribe directo en
  // seqBpm/seqBpmRef y anima la rueda hasta el valor calculado.
  const tapsSeqRef=useRef([]);
  const [tapSeqLit,setTapSeqLit]=useState(false);
  // Pulso continuo del LED — conectado siempre al BPM de la rueda (antes
  // el LED solo flasheaba al tocar, sin relación visual con el tempo
  // activo). Arranca solo con el bpm inicial, sin esperar ningún tap.
  useEffect(()=>{
    const ms=60000/seqBpm;
    let alive=true;
    let flashId;
    const pulse=()=>{
      if(!alive)return;
      setTapSeqLit(true);
      flashId=setTimeout(()=>{if(alive)setTapSeqLit(false);},Math.min(110,ms*0.28));
    };
    pulse();
    const id=setInterval(pulse,ms);
    return ()=>{alive=false;clearInterval(id);clearTimeout(flashId);};
  },[seqBpm]);
  const handleTapSeq=()=>{
    const now=performance.now();
    const taps=tapsSeqRef.current;
    if(taps.length&&now-taps[taps.length-1]>2000) taps.length=0;
    taps.push(now);
    if(taps.length>8) taps.shift();
    if(taps.length>=2){
      const intervals=[];
      for(let i=1;i<taps.length;i++) intervals.push(taps[i]-taps[i-1]);
      const avgMs=intervals.reduce((a,b)=>a+b,0)/intervals.length;
      const bpm=Math.round(60000/avgMs);
      if(bpm>=BPM_MIN&&bpm<=BPM_MAX){
        seqBpmRef.current=bpm;
        setSeqBpm(bpm);
        scrollWheelTo(bpm,true);
        if(clickActivo){stopClick();startClick(bpm);}
      }
    }
  };
  // Sync when song changes (using ref to detect change)
  const prevSongRef = useRef(null);
  if(song?.name !== prevSongRef.current){
    prevSongRef.current = song?.name;
    if(clickActivo){ stopClick(); setClickActivo(false); }
    // Defer state updates to avoid mid-render setState
    Promise.resolve().then(()=>{
      setSeqBpm(SECUENCIA_DATA[song?.name]?.click.bpm || song?.bpm || 120);
      setSeqCifra(SECUENCIA_DATA[song?.name]?.click.compas || '4/4');
    });
  }


  // ── Seek de secuencia — posición activa al navegar el mapa maestro ─────────
  const [mapaSectionIdx, setMapaSectionIdx] = useState(0);
  const ABREV_MAP = {
    'Intro':'Intro','Verso 1':'V1','Verso 2':'V2','Verso 3':'V3',
    'Pre-Coro':'PC','Coro':'C','Puente':'P','Bridge':'P',
    'Bridge x2':'Px2','Final':'Fin','Outro':'Fin',
    'Coro Final':'CF','Interlude':'Int','Instrumental':'Inst',
  };
  const abrevLabel=(label,useShort)=>useShort?(ABREV_MAP[label]||label.slice(0,3)):label;

  // Mapa Maestro Horizontal — sticky encima del contenido de letra
  const MapaMaestro=()=>{
    // Se oculta cuando Secuencia está activa (el mapa va dentro del panel)
    if(bottomTab==='secuencia') return null;
    const guias = seqData?.guias;
    if(!guias||!guias.length) return null;
    const totalComp = guias.reduce((s,g)=>s+(g.compases||4),0);
    // Abreviar etiquetas
    const abrev=lbl=>{
      const m={
        'INTRO':'INT','VERSO':'V','VERSO 1':'V1','VERSO 2':'V2','VERSO 3':'V3',
        'CORO':'C','CORO 2':'C2','CORO 3':'C3','PRE-CORO':'PC','PRECORO':'PC',
        'PUENTE':'P','BRIDGE':'P','FINAL':'FIN','OUTRO':'OUT','INTERLUDIO':'INT',
        'ESTRIBILLO':'EST','CHORUS':'C','VERSE':'V','PRE-CHORUS':'PC',
      };
      return m[lbl.toUpperCase()]||lbl.slice(0,3).toUpperCase();
    };
    return(
      <div style={{
        display:'flex',height:28,flexShrink:0,
        borderBottom:'1px solid var(--s3)',
        background:'rgba(8,8,9,.95)',
        overflowX:'auto',scrollbarWidth:'none',
      }}>
        {guias.map((g,i)=>{
          const pct=(g.compases||4)/totalComp*100;
          const isActive=mapaSectionIdx===i;
          return(
            <button key={i}
              onClick={()=>{
                setMapaSectionIdx(i);
                const el=document.getElementById('section-'+i);
                const cont=wrapRef.current;
                if(el&&cont){const eT=el.getBoundingClientRect().top;const cT=cont.getBoundingClientRect().top;cont.scrollBy({top:eT-cT-12,behavior:'smooth'});}
                window.dispatchEvent(new CustomEvent('setsync-mapa-seek',{detail:{sectionIdx:i}}));
              }}
              style={{
                minWidth:`${pct}%`,
                border:'none',padding:'0 2px',cursor:'pointer',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                gap:1,
                background:isActive?`${g.color}18`:'transparent',
                borderBottom:isActive?`2px solid ${g.color}`:'2px solid transparent',
                transition:'all .15s',flexShrink:0,
              }}>
              <span style={{
                fontSize:8,fontWeight:900,
                color:isActive?g.color:`${g.color}cc`,
                fontFamily:"'Lexend Giga',sans-serif",
                textTransform:'uppercase',lineHeight:1,
              }}>{isTablet?g.label:abrev(g.label)}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const ClickPanel=()=>(
    <div>
      <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10,fontFamily:"'Lexend Giga',sans-serif"}}>Click · Metrónomo</div>
      <div style={{borderRadius:14,background:'var(--s1)',border:'1px solid var(--s3)',padding:'12px 14px',display:'flex',flexDirection:'column',gap:12}}>        {/* Fila 1: BPM + Play */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {/* BPM */}
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
            <button onClick={()=>{const v=Math.max(40,seqBpm-1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}}}
              style={{width:32,height:32,borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
              <input
                type="number" min="40" max="300"
                value={seqBpm}
                onChange={e=>{const v=Math.max(40,Math.min(300,Number(e.target.value)||120));setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}}}
                style={{width:'100%',maxWidth:90,textAlign:'center',
                  fontFamily:"'Special Gothic Expanded One',sans-serif",
                  fontSize:36,color:clickActivo?'var(--gn)':'var(--ac)',
                  background:'transparent',border:'none',outline:'none',
                  WebkitAppearance:'none',MozAppearance:'textfield',
                  lineHeight:1,display:'block'}}
              />
              <span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,marginTop:2}}>BPM</span>
            </div>
            <button onClick={()=>{const v=Math.min(300,seqBpm+1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}}}
              style={{width:32,height:32,borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
          </div>
          {/* Play/Stop */}
          <button onClick={()=>{const next=!clickActivo;setClickActivo(next);if(next)startClick(seqBpm);else stopClick();}}
            style={{width:52,height:52,borderRadius:'50%',border:'none',flexShrink:0,
              background:clickActivo?'var(--rd)':'var(--gn)',color:'#000',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',
              boxShadow:clickActivo?'0 0 20px rgba(253,128,131,.5)':'0 0 20px rgba(48,192,183,.3)'}}>
            {clickActivo
              ?<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              :<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          </button>
        </div>
        {/* Fila 2: Cifra como selector */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,flexShrink:0}}>CIFRA</span>
          <select
            value={seqCifra}
            onChange={e=>{
              const c=e.target.value;
              setSeqCifra(c);
              // Reiniciar click con nueva cifra si está activo
              if(clickActivo){ stopClick(); startClick(seqBpm,c); }
            }}
            style={{
              flex:1,
              padding:'8px 12px',
              borderRadius:10,
              border:'1px solid var(--bd)',
              background:'var(--s3)',
              color:'var(--ac)',
              fontSize:16,fontWeight:700,
              fontFamily:"'Special Gothic Expanded One',sans-serif",
              cursor:'pointer',
              outline:'none',
              appearance:'none',WebkitAppearance:'none',
            }}>
            {CIFRAS.map(c=>(<option key={c} value={c} style={{background:'#0a0a0a',color:'#fff',fontWeight:700}}>{c}</option>))}
          </select>
          {/* Flecha decorativa */}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{flexShrink:0,pointerEvents:'none',marginLeft:-32}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
    </div>
  );

  // ── Panel de Referencia — audio player con loop ──────────────────────────



  const volToDB=v=>{
    if(v<=0) return '-∞';
    const db=40*Math.log10(v/75);
    if(db>=0) return '+'+db.toFixed(1);
    return db.toFixed(1);
  };

  const DB_MARKS=[
    {db:10,pct:100},{db:5,pct:91},{db:0,pct:75},{db:-5,pct:65},
    {db:-10,pct:55},{db:-20,pct:40},{db:-30,pct:28},{db:-50,pct:14}
  ];

  // ── Carpeta de canción (v36-ampliación) — vista de contenidos. Sin
  // useState/useEffect propios (solo lee estado del nivel de SongView),
  // por eso es seguro llamarla como componente inline igual que las otras.
  const [notaCarpeta,setNotaCarpeta]=useState('');
  const [notaCarpetaGuardada,setNotaCarpetaGuardada]=useState(false);
  // Sincronizar el textarea de la nota con lo guardado cada vez que se abre
  // la carpeta o cambia de canción — si no, se arrastraría la nota de la
  // canción anterior.
  useEffect(()=>{
    if(showCarpeta) setNotaCarpeta(archivosDB[baseName]?.nota||'');
  },[showCarpeta,baseName]);
  const guardarNotaCarpeta=()=>{
    setArchivosDB(prev=>({...prev,[baseName]:{...(prev[baseName]||{secuencia:[]}),
      nota:notaCarpeta}}));
    setNotaCarpetaGuardada(true);
    setTimeout(()=>setNotaCarpetaGuardada(false),1500);
  };
  const agregarSecuenciaDesdeCarpeta=(file)=>{
    if(!file)return;
    const nuevo={id:Date.now()+'-'+Math.random().toString(36).slice(2,7),
      nombre:file.name,size:`${(file.size/1024/1024).toFixed(1)}MB`,fecha:new Date()};
    setArchivosDB(prev=>({...prev,[baseName]:{...(prev[baseName]||{secuencia:[]}),
      secuencia:[...(prev[baseName]?.secuencia||[]),nuevo]}}));
    setToast('✓ Track de secuencia agregado');
  };
  const CarpetaModal=()=>{
    if(!showCarpeta) return null;
    const vars=variacionesDB[baseName]||[];
    return createPortal((
      <div style={{position:'fixed',inset:0,zIndex:250,background:'rgba(0,0,0,.7)',
        display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
        onClick={()=>setShowCarpeta(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:380,maxHeight:'80vh',overflowY:'auto',
          padding:18,borderRadius:16,background:'var(--bg)',border:'1px solid var(--bd)',
          boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,color:'var(--tx)',fontWeight:400}}>{baseName}</div>
            <button onClick={()=>setShowCarpeta(false)} style={{background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
          </div>

          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>Original</div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'var(--s1)',marginBottom:14}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span style={{fontSize:11,color:'var(--tx2)'}}>Letra y acordes</span>
          </div>

          {vars.length>0&&(
            <>
              <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>Variaciones · {vars.length}</div>
              {vars.map(v=>(
                <div key={v.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'rgba(200,169,126,.06)',marginBottom:5}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ac)" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span style={{fontSize:11,color:'var(--ac)'}}>{v.label}</span>
                </div>
              ))}
              <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginBottom:14,fontStyle:'italic'}}>Se abren desde Cancionero — cierra esta canción y vuelve a entrar eligiendo la variación.</div>
            </>
          )}

          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>Secuencia · {(carpetaActual.secuencia||[]).length}</div>
          {(carpetaActual.secuencia||[]).length>0&&(
            <div style={{marginBottom:8}}>
              {carpetaActual.secuencia.map(sq=>(
                <div key={sq.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'var(--s1)',marginBottom:5}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  <span style={{fontSize:11,color:'var(--tx2)',flex:1,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{sq.nombre}</span>
                  <span style={{fontSize:9,color:'var(--tx3)'}}>{sq.size}</span>
                </div>
              ))}
            </div>
          )}
          {isAdmin?(
            <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              padding:'9px 12px',borderRadius:10,border:'1px dashed var(--div)',
              background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,
              fontFamily:"'Lexend Giga',sans-serif",marginBottom:14}}>
              <input type="file" accept="audio/*" style={{display:'none'}}
                onChange={e=>{agregarSecuenciaDesdeCarpeta(e.target.files[0]);e.target.value='';}}/>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              + Subir track de secuencia
            </label>
          ):((carpetaActual.secuencia||[]).length===0&&(
            <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontStyle:'italic',marginBottom:14}}>Sin tracks todavía.</div>
          ))}

          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>Track de referencia</div>
          {carpetaActual.trackReferencia?(
            <button onClick={()=>{setBottomTab('referencia');setRefTab('track');setShowCarpeta(false);}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,
                border:'none',background:'rgba(48,192,183,.1)',cursor:'pointer',textAlign:'left'}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <span style={{fontSize:11,color:'var(--gn)',flex:1,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{carpetaActual.trackReferencia.nombre}</span>
            </button>
          ):(
            <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontStyle:'italic',marginBottom:14}}>Sin track — se sube o graba desde la pestaña Referencia.</div>
          )}

          {/* ── Nota tipo post-it ── */}
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif",marginTop:14,marginBottom:8}}>Nota</div>
          <div style={{position:'relative'}}>
            <textarea value={notaCarpeta} onChange={e=>setNotaCarpeta(e.target.value)}
              placeholder="Ej: tocar con capo 2, pedir a Juan que suba una tercera en el coro, ojo con el cambio de compás en el puente..."
              style={{width:'100%',minHeight:80,padding:'10px 12px',borderRadius:10,resize:'vertical',
                border:'1px solid rgba(234,203,113,.25)',background:'rgba(234,203,113,.05)',
                color:'var(--tx)',fontSize:11,fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.5,
                outline:'none',boxSizing:'border-box'}}/>
          </div>
          <button onClick={guardarNotaCarpeta}
            style={{width:'100%',marginTop:6,padding:'8px 0',borderRadius:8,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",
              background:notaCarpetaGuardada?'var(--gn)':'var(--s3)',
              color:notaCarpetaGuardada?'#000':'var(--tx3)',transition:'all .2s'}}>
            {notaCarpetaGuardada?'✓ Guardada':'Guardar nota'}
          </button>
        </div>
      </div>
    ), document.body);
  };

  const MonitorPanel=() => {
    const h=window.innerHeight;
    const trackH=Math.max(100, h*0.32);

    const panel = (
      <div
        onTouchStart={e=>e.stopPropagation()}
        onTouchMove={e=>e.stopPropagation()}
        style={{position:'fixed',bottom:'calc(54px + env(safe-area-inset-bottom,0px))',left:0,right:0,
          background:'rgba(6,6,14,.97)',borderTop:'2px solid rgba(48,192,183,.4)',
          backdropFilter:'blur(40px)',zIndex:200,
          transform:(bottomTab==='monitor'&&showMonitor)?'translateY(0)':'translateY(110%)',
          transition:'transform .3s cubic-bezier(.4,0,.2,1)',
          display:'flex',flexDirection:'column',
          maxHeight:'70vh',
        }}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',
          borderBottom:'1px solid var(--s3)',flexShrink:0}}>
          <button onClick={()=>setShowConectarMesa(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left'}}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
              stroke={mesaConectada?'var(--gn)':mesaEstado==='conectando'?'#e0a458':'var(--tx3)'} strokeWidth="2">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <div style={{flex:1,fontSize:9,fontWeight:700,color:mesaConectada?'var(--gn)':mesaEstado==='conectando'?'#e0a458':'var(--tx3)',
              fontFamily:"'Lexend Giga',sans-serif",textTransform:'uppercase',letterSpacing:'1px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
              {mesaConectada?`Conectado · ${mesaNombre}`:mesaEstado==='conectando'?'Conectando…':'Monitor · Toca para conectar'}
            </div>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:3}}>
            <span style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Bus</span>
            {[1,2,3,4].map(b=>(
              <button key={b} onClick={()=>setMonitorBus(b)}
                style={{width:20,height:20,borderRadius:5,border:'none',cursor:'pointer',
                  background:monitorBus===b?'var(--gn)':'var(--s3)',
                  color:monitorBus===b?'#000':'var(--tx3)',fontSize:8,fontWeight:900}}>
                {b}
              </button>
            ))}
          </div>
          <div style={{display:'inline-flex',borderRadius:10,border:'1px solid var(--bd)',overflow:'hidden'}}>
            {['A','B'].map(l=>(
              <button key={l} onClick={()=>setMonitorLayer(l)}
                style={{padding:'2px 8px',border:'none',cursor:'pointer',fontSize:8,fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif",
                  background:monitorLayer===l?'rgba(48,192,183,.25)':'transparent',
                  color:monitorLayer===l?'var(--gn)':'var(--tx3)'}}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={()=>setShowMonitor(false)}
            style={{width:20,height:20,borderRadius:5,border:'1px solid var(--bd)',
              background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:14,
              display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
        </div>
        {!mesaConectada&&mesaEstado!=='conectando'&&(
          <div style={{padding:'6px 12px 0',fontSize:9,color:'var(--tx3)',fontWeight:300,
            fontFamily:"'Lexend Giga',sans-serif",opacity:.7}}>
            Conecta tu mesa por WiFi y controla tu propio monitoreo desde el teléfono
          </div>
        )}

        {/* Panel de conexión — marca + IP (v36/v37-ampliación) */}
        {showConectarMesa&&(
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--s3)',
            display:'flex',flexDirection:'column',gap:8,flexShrink:0,background:'var(--s1)'}}>
            <select value={mesaMarca} onChange={e=>{setMesaMarca(e.target.value);setMesaErrorMsg(null);}}
              disabled={mesaConectada}
              style={{padding:'7px 9px',borderRadius:8,border:'1px solid var(--bd)',
                background:'#111',color:'var(--tx)',fontSize:10,fontFamily:"'Lexend Giga',sans-serif",cursor:'pointer'}}>
              {MARCAS_MESA.map(m=>(
                <option key={m.id} value={m.id}>{m.nombre}{m.disponible?'':' — próximamente'}</option>
              ))}
            </select>
            <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
              {MARCAS_MESA.find(m=>m.id===mesaMarca)?.modelos}
            </div>
            {MARCAS_MESA.find(m=>m.id===mesaMarca)?.puente&&(
              <div style={{fontSize:9,color:'#e0a458',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.5,
                padding:'7px 9px',borderRadius:8,background:'rgba(224,164,88,.08)',border:'1px solid rgba(224,164,88,.2)'}}>
                Esta mesa necesita un puente corriendo en un notebook de la misma red (no se conecta directo). Ingresa la IP de ESE notebook, no la de la mesa.
              </div>
            )}
            <div style={{display:'flex',gap:6}}>
              <input value={mesaIP} onChange={e=>setMesaIP(e.target.value)} disabled={mesaConectada}
                placeholder={MARCAS_MESA.find(m=>m.id===mesaMarca)?.puente?'IP del puente (ej: 192.168.1.50:8080)':'IP de la mesa (ej: 10.10.1.1)'}
                style={{flex:1,padding:'7px 9px',borderRadius:8,border:'1px solid var(--bd)',
                  background:'#111',color:'var(--tx)',fontSize:10,fontFamily:"'Lexend Giga',sans-serif"}}/>
              {mesaConectada?(
                <button onClick={desconectarMesa}
                  style={{padding:'7px 14px',borderRadius:8,border:'none',background:'rgba(253,128,131,.15)',
                    color:'var(--rd)',cursor:'pointer',fontSize:10,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif"}}>
                  Desconectar
                </button>
              ):(
                <button onClick={conectarMesa} disabled={mesaEstado==='conectando'}
                  style={{padding:'7px 14px',borderRadius:8,border:'none',
                    background:mesaEstado==='conectando'?'var(--bd)':'var(--ac)',
                    color:mesaEstado==='conectando'?'var(--tx3)':'#000',cursor:mesaEstado==='conectando'?'not-allowed':'pointer',
                    fontSize:10,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif"}}>
                  {mesaEstado==='conectando'?'Conectando…':'Conectar'}
                </button>
              )}
            </div>
            {mesaErrorMsg&&(
              <div style={{fontSize:9,color:'var(--rd)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.4}}>{mesaErrorMsg}</div>
            )}
          </div>
        )}

        {/* Grid de 8 faders */}
        <div style={{flex:1,display:'flex',gap:2,padding:'6px 8px 8px',overflow:'hidden',minHeight:0}}>
          {Array.from({length:8},(_,li)=>{
            const ci=monitorLayer==='A'?li:li+8;
            const vol=faderVols[ci];
            const muted=faderMutes[ci];
            const dbStr=volToDB(muted?0:vol);
            const vuLit=muted?0:Math.round((vol/100)*12);
            return(
              <div key={ci} style={{
                flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                gap:2,minWidth:0,padding:'4px 2px 4px',borderRadius:6,
                background:muted?'rgba(253,128,131,.06)':'var(--s1)',
                border:`1px solid ${muted?'rgba(253,128,131,.2)':'var(--s3)'}`,
                overflow:'visible',
              }}>
                <div style={{fontSize:7,fontWeight:700,
                  color:muted?'var(--rd)':vol>90?'#FD8083':vol>75?'#f59e0b':'var(--tx)',
                  fontFamily:"'Lexend Giga',sans-serif",letterSpacing:'.3px',
                  flexShrink:0,textAlign:'center'}}>
                  {dbStr}
                </div>
                <div style={{flex:1,display:'flex',alignItems:'stretch',gap:2,
                  width:'100%',overflow:'visible',justifyContent:'center'}}>
                  {/* Escala dB */}
                  <div style={{position:'relative',width:10,flexShrink:0,pointerEvents:'none'}}>
                    {DB_MARKS.map(({db,pct})=>(
                      <div key={db} style={{
                        position:'absolute',right:0,bottom:`${pct}%`,
                        fontSize:4.5,color:'var(--em)',
                        fontFamily:"'Lexend Giga',sans-serif",
                        lineHeight:1,transform:'translateY(50%)',textAlign:'right',
                      }}>{db>0?'+'+db:db}</div>
                    ))}
                  </div>
                  {/* Track + Knob + VU */}
                  <div style={{position:'relative',display:'flex',alignItems:'center',
                    justifyContent:'center',overflow:'visible',flex:1}}>
                    <div style={{
                      position:'relative',width:48,height:trackH,
                      borderRadius:2,touchAction:'none',overflow:'visible',cursor:'ns-resize',
                    }}>
                      {/* Track line via pseudo — usamos un div real */}
                      <div style={{position:'absolute',top:0,bottom:0,left:'50%',
                        transform:'translateX(-50%)',width:5,
                        background:'var(--bd)',borderRadius:3,pointerEvents:'none'}}/>
                      {/* VU meter — señal de entrada (animada independiente del fader) */}
                      <div style={{
                        position:'absolute',top:3,bottom:3,right:3,width:4,
                        display:'flex',flexDirection:'column-reverse',gap:1,
                        zIndex:1,pointerEvents:'none',
                      }}>
                        {Array.from({length:12},(_,si)=>{
                          const lit=si<vuLit;
                          const col=si>=10?'#FD8083':si>=8?'#f59e0b':'#30C0B7';
                          return(
                            <div key={si} style={{
                              flex:1,borderRadius:.5,
                              background:lit?col:'var(--s3)',
                              boxShadow:lit&&si>=8?`0 0 3px ${col}`:'none',
                            }}/>
                          );
                        })}
                      </div>
                      {/* Knob */}
                      <div style={{
                        position:'absolute',left:'50%',transform:'translateX(-50%)',
                        width:44,height:30,borderRadius:6,zIndex:2,
                        bottom:`calc(${vol}% - 15px)`,
                        background:'linear-gradient(180deg,#e0e0e0 0%,#cecece 15%,#b5b5b5 45%,#c2c2c2 55%,#d5d5d5 85%,#dfdfdf 100%)',
                        boxShadow:'0 5px 15px rgba(0,0,0,.9),0 2px 0 rgba(255,255,255,.5) inset,0 -2px 0 rgba(0,0,0,.4) inset',
                        border:'1px solid rgba(0,0,0,.5)',cursor:'grab',
                        touchAction:'none',userSelect:'none',WebkitUserSelect:'none',
                      }}
                      onPointerDown={e=>{
                        /* ═══════════════════════════════════════════════════════════
                         * ⚠️  ZONA BLINDADA — LÓGICA DE FADER TÁCTIL — NO MODIFICAR ⚠️
                         * ═══════════════════════════════════════════════════════════
                         * Este patrón costó ~1 semana de debugging. Reglas NO NEGOCIABLES:
                         * 1. getBoundingClientRect() se captura UNA SOLA VEZ aquí, nunca
                         *    dentro de 'move'. Recalcularlo en cada pointermove causa que
                         *    el fader "salte" o se mueva solo unos pocos px porque React
                         *    re-renderiza y el rect queda desactualizado.
                         * 2. Durante el arrastre (pointermove) el conocimiento visual se
                         *    actualiza escribiendo knob.style.bottom DIRECTO en el DOM,
                         *    SIN llamar a setState. Llamar a setState en cada move fuerza
                         *    un re-render de React que invalida el rect y rompe el drag.
                         * 3. El estado de React (setFaderVols/setTrackVols) SOLO se
                         *    actualiza en pointerup, una vez, al soltar el dedo.
                         * 4. knob.setPointerCapture es obligatorio — sin esto, mover el
                         *    dedo fuera del knob (aunque sea 1px) cancela el drag.
                         * Si necesitas tocar este bloque, PRIMERO avisa a Danny — probó
                         * en dispositivo real y funciona. Cualquier "mejora" estética que
                         * toque este patrón debe volver a probarse en dispositivo físico.
                         * ═══════════════════════════════════════════════════════════ */
                        e.preventDefault();
                        e.stopPropagation();
                        const knob=e.currentTarget;
                        const track=knob.parentElement;
                        knob.setPointerCapture(e.pointerId);
                        // Capturar rect ANTES del primer re-render
                        const r=track.getBoundingClientRect();
                        const trackH=r.height;
                        const trackTop=r.top;
                        const calcPct=ev=>Math.round((1-Math.max(0,Math.min(1,(ev.clientY-trackTop)/trackH)))*100);
                        let curVol=calcPct(e);
                        // Mover knob directo en DOM — sin re-render de React
                        knob.style.bottom=`calc(${curVol}% - 15px)`;
                        const move=ev=>{
                          ev.preventDefault();
                          curVol=calcPct(ev);
                          knob.style.bottom=`calc(${curVol}% - 15px)`;
                        };
                        const up=ev=>{
                          knob.releasePointerCapture(ev.pointerId);
                          knob.removeEventListener('pointermove',move);
                          knob.removeEventListener('pointerup',up);
                          // Solo actualizar React state al soltar
                          setFaderVols(v=>{const n=[...v];n[ci]=curVol;return n;});
                          // Envía el valor real a la mesa conectada (v36-ampliación)
                          if(mesaConectada) mesaDriverRef.current?.setFaderLevel(monitorBus, ci+1, curVol/100);
                        };
                        knob.addEventListener('pointermove',move,{passive:false});
                        knob.addEventListener('pointerup',up,{once:true});
                      }}>
                        <div style={{position:'absolute',top:'50%',left:'50%',
                          transform:'translate(-50%,-50%)',
                          width:'60%',height:2,background:'rgba(0,0,0,.4)',borderRadius:1,
                          boxShadow:'0 -5px 0 rgba(0,0,0,.3),0 5px 0 rgba(0,0,0,.3),0 -10px 0 rgba(0,0,0,.15),0 10px 0 rgba(0,0,0,.15)'}}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{fontSize:6,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",
                  fontWeight:700,flexShrink:0,letterSpacing:'.5px'}}>CH {ci+1}</div>
                <button onClick={e=>{
                  e.stopPropagation();
                  setFaderMutes(m=>{const n=[...m];n[ci]=!n[ci];
                    if(mesaConectada) mesaDriverRef.current?.setMute(monitorBus, ci+1, n[ci]);
                    return n;});
                }} style={{
                  width:'100%',padding:'3px 0',borderRadius:4,border:'none',cursor:'pointer',
                  flexShrink:0,
                  background:muted?'#8B0000':'var(--s3)',
                  color:muted?'#ff4444':'var(--tx3)',
                  fontSize:7,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",
                  letterSpacing:'.5px',
                  boxShadow:muted?'0 0 8px rgba(255,68,68,.4)':'none',
                }}>MUTE</button>
              </div>
            );
          })}
        </div>
      </div>
    );

    if(!(bottomTab==='monitor'&&showMonitor)) return null;
    return createPortal(panel, document.body);
  }


  // ── Helpers Capa 1 — Track de referencia (reparados; estaban referenciados
  // pero nunca definidos: loadFile/seekTo/clearLoop/markIn/markOut/SPEEDS/audio) ──
  const SPEEDS=[0.5,0.75,1,1.25,1.5];

  const loadFile=(file)=>{
    if(refUrl) URL.revokeObjectURL(refUrl);
    const url=URL.createObjectURL(file);
    setRefAudio(file);
    setRefUrl(url);
    setRefPlaying(false);
    setRefTime(0);
    setRefDuration(0);
    setRefLoopIn(null);
    setRefLoopOut(null);
    setRefLooping(false);
    // Persiste en la carpeta de la canción — 1 solo slot, reemplazable (Capa 1, v35)
    setArchivosDB(prev=>({...prev,[baseName]:{...(prev[baseName]||{secuencia:[]}),
      trackReferencia:{url,nombre:file.name,fecha:new Date(),origen:'subido'}}}));
    const esMp3=file.type.includes('mpeg')||file.name.toLowerCase().endsWith('.mp3');
    setToast(esMp3?'✓ MP3 cargado (se convertirá a AAC 96kbps al sincronizar)':'✓ Track cargado');
  };

  const seekTo=(e,el)=>{
    const audio=refPlayerRef.current;
    if(!audio||!refDuration) return;
    const r=el.getBoundingClientRect();
    const p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    audio.currentTime=p*refDuration;
    setRefTime(p*refDuration);
  };

  const clearLoop=()=>{
    setRefLoopIn(null);
    setRefLoopOut(null);
    setRefLooping(false);
  };

  const markIn=()=>{
    const audio=refPlayerRef.current;
    const t=audio?audio.currentTime:refTime;
    if(refLoopOut!=null&&t>=refLoopOut){setToast('El punto IN debe ser antes del OUT');return;}
    setRefLoopIn(t);
  };

  const markOut=()=>{
    const audio=refPlayerRef.current;
    const t=audio?audio.currentTime:refTime;
    if(refLoopIn!=null&&t<=refLoopIn){setToast('El punto OUT debe ser después del IN');return;}
    setRefLoopOut(t);
  };

  const fmtDur=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  // ── Helpers Capa 2 — Grabaciones de ensayo (v36) ─────────────────────────
  // ENSAYOS_MOCK eliminado — ahora usa ensayosDisponibles (prop real desde
  // App.jsx, viene del mismo estado `ensayos` que crea BackstageView →
  // "Crear ensayo"). Si está vacío, el diálogo de destino avisa en vez de
  // mostrar opciones inventadas.

  const fmtFechaCorta=(d)=>d.toLocaleDateString('es-CL',{day:'2-digit',month:'short'})+' · '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});

  const getRecordMime=()=>{
    if(typeof MediaRecorder==='undefined') return null;
    if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if(MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'; // fallback iOS (AAC)
    return '';
  };

  const iniciarGrabacion=async(slotIdx)=>{
    setRecordError(null);
    if(typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia){
      setRecordError('Este dispositivo/navegador no soporta grabación');
      return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      mediaStreamRef.current=stream;
      const mime=getRecordMime();
      const opts={audioBitsPerSecond:32000,...(mime?{mimeType:mime}:{})};
      const mr=new MediaRecorder(stream,opts);
      recordChunksRef.current=[];
      mr.ondataavailable=e=>{if(e.data&&e.data.size>0)recordChunksRef.current.push(e.data);};
      mr.onstop=()=>{
        const blob=new Blob(recordChunksRef.current,{type:mime||'audio/webm'});
        const url=URL.createObjectURL(blob);
        stream.getTracks().forEach(t=>t.stop());
        setPendingRecording({blob,url,duracionSeg:recordElapsed,slotIdx});
        setIsRecording(false);
      };
      mediaRecorderRef.current=mr;
      mr.start();
      setRecordElapsed(0);
      setRecordSlot(slotIdx);
      setIsRecording(true);
    }catch(err){
      setRecordError('No se pudo acceder al micrófono — revisa permisos');
    }
  };

  const detenerGrabacion=()=>{ mediaRecorderRef.current?.stop(); };

  const descartarPending=()=>{
    if(pendingRecording?.url) URL.revokeObjectURL(pendingRecording.url);
    setPendingRecording(null);
    setSelectedEnsayoId(null);
  };

  const guardarEnCancion=()=>{
    if(!pendingRecording) return;
    if(refUrl) URL.revokeObjectURL(refUrl);
    const nombre=`Grabación de ensayo · ${fmtFechaCorta(new Date())}`;
    setRefAudio({name:nombre});
    setRefUrl(pendingRecording.url);
    setRefPlaying(false);setRefTime(0);setRefDuration(0);
    setRefLoopIn(null);setRefLoopOut(null);setRefLooping(false);
    // Persiste en la carpeta de la canción — reemplaza el slot único (Capa 1, v35)
    setArchivosDB(prev=>({...prev,[baseName]:{...(prev[baseName]||{secuencia:[]}),
      trackReferencia:{url:pendingRecording.url,nombre,fecha:new Date(),origen:'grabado'}}}));
    setPendingRecording(null);
    setSelectedEnsayoId(null);
    setRefTab('track');
    setToast('✓ Guardada en la Canción — permanente');
  };

  const guardarEnEnsayo=()=>{
    if(!pendingRecording||!selectedEnsayoId) return;
    const ensayo=ensayosDisponibles.find(e=>e.id===selectedEnsayoId);
    const idx=pendingRecording.slotIdx;
    setGrabaciones(g=>{
      const n=[...g];
      n[idx]={
        id:`g_${Date.now()}`,
        url:pendingRecording.url,
        duracionSeg:pendingRecording.duracionSeg,
        fecha:new Date(),
        ensayoId:selectedEnsayoId,
        ensayoNombre:ensayo?.nombre||'Ensayo',
      };
      return n;
    });
    setPendingRecording(null);
    setSelectedEnsayoId(null);
    setToast('✓ Guardada en el Ensayo — se autoborra 2 semanas después del evento');
  };

  const ReferenciaPanel=() => {
    const fmt=fmtDur;
    const grabActivas=grabaciones.filter(Boolean).length;

    const panel = (
        <div style={{
          position:'fixed',bottom:'calc(54px + env(safe-area-inset-bottom,0px))',left:0,right:0,
          background:'rgba(8,8,9,.98)',borderTop:'1px solid var(--s3)',
          backdropFilter:'blur(40px)',zIndex:110,
          transform:bottomTab==='referencia'?'translateY(0)':'translateY(100%)',
          transition:'transform .3s cubic-bezier(.4,0,.2,1)',
          display:'flex',flexDirection:'column',
          maxHeight:'62vh',
        }}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px 8px',flexShrink:0,borderBottom:'1px solid var(--s3)'}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="1.8">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <span style={{flex:1,fontSize:10,fontWeight:900,color:'var(--tx)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif"}}>
              Referencia
            </span>
            {refTab==='track'&&refAudio&&<span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",maxWidth:140,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{refAudio.name}</span>}
            {refTab==='track'&&(
              <>
                <button onClick={()=>refInputRef.current?.click()}
                  style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--bd2)',background:'var(--s3)',color:'var(--tx2)',cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
                  {refAudio?'Cambiar':'Subir audio'}
                </button>
                <input ref={refInputRef} type="file" accept="audio/*" style={{display:'none'}}
                  onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0]);}}/>
              </>
            )}
          </div>

          {/* Sub-tabs Capa 1 (Track) / Capa 2 (Grabaciones) — v36 */}
          <div style={{display:'flex',gap:6,padding:'8px 14px 0',flexShrink:0}}>
            <button onClick={()=>setRefTab('track')}
              style={{flex:1,padding:'7px 0',borderRadius:9,border:'none',cursor:'pointer',
                fontSize:9,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",letterSpacing:'.5px',
                background:refTab==='track'?'var(--bd)':'transparent',
                color:refTab==='track'?'var(--tx)':'var(--tx3)'}}>
              TRACK
            </button>
            <button onClick={()=>setRefTab('grabaciones')}
              style={{flex:1,padding:'7px 0',borderRadius:9,border:'none',cursor:'pointer',
                fontSize:9,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",letterSpacing:'.5px',
                background:refTab==='grabaciones'?'var(--bd)':'transparent',
                color:refTab==='grabaciones'?'var(--tx)':'var(--tx3)'}}>
              GRABACIONES · {grabActivas}/3
            </button>
          </div>

          {refTab==='track'?(
            !refUrl?(
              /* Estado vacío */
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:20}}>
                <div style={{width:56,height:56,borderRadius:'50%',border:'2px dashed var(--bd2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                  onClick={()=>refInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--tx3)" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",marginBottom:4}}>Sube un audio de referencia</div>
                  <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.5}}>MP3, AAC, WAV · Toca para seleccionar</div>
                </div>
              </div>
            ):(()=>{
              const audio=refPlayerRef.current;
              const pct=refDuration?(refTime/refDuration):0;
              const inPct=(refLoopIn!=null&&refDuration)?(refLoopIn/refDuration*100):null;
              const outPct=(refLoopOut!=null&&refDuration)?(refLoopOut/refDuration*100):null;
              return(
              <div style={{flex:1,display:'flex',flexDirection:'column',padding:'10px 14px 14px',gap:10,overflow:'hidden'}}>
                {/* Audio element oculto */}
                <audio ref={refPlayerRef} src={refUrl} preload="metadata"
                  onTimeUpdate={e=>{
                    const t=e.target.currentTime;
                    setRefTime(t);
                    // Loop check
                    if(refLooping&&refLoopOut!=null&&t>=refLoopOut){
                      e.target.currentTime=refLoopIn??0;
                    }
                  }}
                  onLoadedMetadata={e=>setRefDuration(e.target.duration)}
                  onEnded={()=>setRefPlaying(false)}
                  style={{display:'none'}}/>

                {/* Waveform / Progress bar principal */}
                <div style={{position:'relative',height:48,borderRadius:10,background:'var(--s1)',overflow:'hidden',cursor:'pointer',flexShrink:0}}
                  onClick={e=>seekTo(e,e.currentTarget)}
                  onPointerDown={e=>{
                    e.preventDefault();
                    const el=e.currentTarget;
                    el.setPointerCapture(e.pointerId);
                    seekTo(e,el);
                    const move=ev=>{ev.preventDefault();seekTo(ev,el);};
                    const up=ev=>{el.releasePointerCapture(ev.pointerId);el.removeEventListener('pointermove',move);};
                    el.addEventListener('pointermove',move,{passive:false});
                    el.addEventListener('pointerup',up,{once:true});
                  }}>
                  {/* Fondo de barras simuladas (decorativo estilo waveform) */}
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',gap:1,padding:'4px 0'}}>
                    {Array.from({length:80},(_,i)=>{
                      const h=Math.sin(i*0.4)*0.3+Math.sin(i*0.13)*0.4+0.3;
                      const filled=(i/80)<pct;
                      const inLoop=inPct!=null&&outPct!=null&&(i/80*100)>=inPct&&(i/80*100)<=outPct;
                      return(
                        <div key={i} style={{
                          flex:1,borderRadius:1,
                          height:`${Math.max(15,h*100)}%`,
                          background: filled
                            ? inLoop&&refLooping?'var(--gn)':'rgba(200,169,126,.9)'
                            : inLoop?'rgba(48,192,183,.3)':'var(--bd)',
                          transition:'background .1s',
                        }}/>
                      );
                    })}
                  </div>
                  {/* Marcador In */}
                  {inPct!=null&&(
                    <div style={{position:'absolute',top:0,bottom:0,left:`${inPct}%`,width:2,background:'var(--gn)',zIndex:3}}>
                      <div style={{position:'absolute',top:0,left:2,fontSize:7,color:'var(--gn)',fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",background:'rgba(8,8,9,.8)',padding:'1px 3px',borderRadius:3,whiteSpace:'nowrap'}}>IN</div>
                    </div>
                  )}
                  {/* Marcador Out */}
                  {outPct!=null&&(
                    <div style={{position:'absolute',top:0,bottom:0,left:`${outPct}%`,width:2,background:'var(--rd)',zIndex:3}}>
                      <div style={{position:'absolute',top:0,left:2,fontSize:7,color:'var(--rd)',fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",background:'rgba(8,8,9,.8)',padding:'1px 3px',borderRadius:3,whiteSpace:'nowrap'}}>OUT</div>
                    </div>
                  )}
                  {/* Playhead */}
                  <div style={{position:'absolute',top:0,bottom:0,left:`${pct*100}%`,width:2,background:'var(--ac)',zIndex:4,transition:'left .05s'}}/>
                </div>

                {/* Tiempos */}
                <div style={{display:'flex',justifyContent:'space-between',flexShrink:0}}>
                  <span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>{fmt(refTime)}</span>
                  {refLoopIn!=null&&refLoopOut!=null&&(
                    <span style={{fontSize:9,color:'var(--gn)',fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
                      Loop {fmt(refLoopIn)} → {fmt(refLoopOut)}
                    </span>
                  )}
                  <span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>{fmt(refDuration)}</span>
                </div>

                {/* Controles principales */}
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  {/* Retroceder 5s */}
                  <button onClick={()=>{if(audio){audio.currentTime=Math.max(0,audio.currentTime-5);}}}
                    style={{width:34,height:34,borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L4 9v6h6l-2.18-2.18A6.93 6.93 0 0 1 12.5 11c3.02 0 5.6 2 6.54 4.77l1.92-.64A9 9 0 0 0 12.5 8z"/></svg>
                  </button>

                  {/* Play / Pause */}
                  <button onClick={()=>{
                    if(!audio)return;
                    if(refPlaying){audio.pause();setRefPlaying(false);}
                    else{
                      if(refLooping&&refLoopIn!=null&&(audio.currentTime<(refLoopIn??0)||audio.currentTime>=(refLoopOut??refDuration))){
                        audio.currentTime=refLoopIn??0;
                      }
                      audio.play();setRefPlaying(true);
                    }
                  }} style={{width:48,height:48,borderRadius:'50%',border:'none',background:'var(--ac)',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px var(--div)'}}>
                    {refPlaying
                      ?<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      :<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    }
                  </button>

                  {/* Adelantar 5s */}
                  <button onClick={()=>{if(audio){audio.currentTime=Math.min(refDuration,audio.currentTime+5);}}}
                    style={{width:34,height:34,borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 9c-1.85-1.6-4.25-2.6-6.9-2.6A9 9 0 0 0 2.54 15.13l1.92.64A7 7 0 0 1 11.1 11c1.89 0 3.63.76 4.9 2L14 15h6V9l-2 2z"/></svg>
                  </button>

                  <div style={{flex:1}}/>

                  {/* Velocidad */}
                  <div style={{display:'flex',gap:3}}>
                    {SPEEDS.map(s=>(
                      <button key={s} onClick={()=>{setRefSpeed(s);if(audio)audio.playbackRate=s;}}
                        style={{padding:'4px 6px',borderRadius:6,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,
                          fontFamily:"'Lexend Giga',sans-serif",
                          background:refSpeed===s?'rgba(200,169,126,.25)':'var(--s3)',
                          color:refSpeed===s?'var(--ac)':'var(--tx3)'}}>
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loop controls */}
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button onClick={markIn}
                    style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${refLoopIn!=null?'rgba(48,192,183,.4)':'var(--bd)'}`,
                      background:refLoopIn!=null?'rgba(48,192,183,.1)':'var(--s1)',
                      color:refLoopIn!=null?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:9,fontWeight:900,
                      fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                    <span style={{fontSize:8,letterSpacing:'.5px'}}>▶ IN</span>
                    {refLoopIn!=null&&<span style={{opacity:.7}}>{fmt(refLoopIn)}</span>}
                  </button>
                  <button onClick={markOut}
                    style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${refLoopOut!=null?'rgba(253,128,131,.4)':'var(--bd)'}`,
                      background:refLoopOut!=null?'rgba(253,128,131,.1)':'var(--s1)',
                      color:refLoopOut!=null?'var(--rd)':'var(--tx3)',cursor:'pointer',fontSize:9,fontWeight:900,
                      fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                    <span style={{fontSize:8,letterSpacing:'.5px'}}>OUT ■</span>
                    {refLoopOut!=null&&<span style={{opacity:.7}}>{fmt(refLoopOut)}</span>}
                  </button>
                  <button onClick={()=>{
                    if(refLoopIn==null||refLoopOut==null)return;
                    const next=!refLooping;
                    setRefLooping(next);
                    if(next){
                      const a=refPlayerRef.current;
                      if(a){a.currentTime=refLoopIn??0;a.play().then(()=>setRefPlaying(true)).catch(()=>{});}
                    }
                  }} disabled={refLoopIn==null||refLoopOut==null}
                    style={{width:60,padding:'6px 8px',borderRadius:8,
                      border:`1px solid ${refLooping?'var(--gn)':'var(--bd)'}`,
                      background:refLooping?'rgba(48,192,183,.2)':'var(--s1)',
                      color:refLooping?'var(--gn)':'var(--tx3)',
                      cursor:refLoopIn==null||refLoopOut==null?'not-allowed':'pointer',
                      fontSize:9,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",
                      opacity:refLoopIn==null||refLoopOut==null?.4:1,
                      boxShadow:refLooping?'0 0 8px rgba(48,192,183,.4)':'none',
                      transition:'all .2s'}}>
                    {refLooping?'↻ ON':'↻'}
                  </button>
                  {(refLoopIn!=null||refLoopOut!=null)&&(
                    <button onClick={clearLoop}
                      style={{width:30,borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',
                        color:'var(--tx3)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      ×
                    </button>
                  )}
                </div>
              </div>
              );
            })()
          ):(
            /* ── Capa 2 — Grabaciones de ensayo (v36) ──────────────────────── */
            <div style={{flex:1,display:'flex',flexDirection:'column',padding:'12px 14px 14px',gap:8,overflow:'auto'}}>
              <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.5,marginBottom:2}}>
                Grabación en vivo · Opus 32kbps · cualquiera del equipo puede grabar
              </div>
              {recordError&&(
                <div style={{fontSize:9,color:'var(--rd)',fontFamily:"'Lexend Giga',sans-serif",padding:'6px 8px',background:'rgba(253,128,131,.1)',borderRadius:8}}>{recordError}</div>
              )}
              {grabaciones.map((slot,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,
                  background:'var(--s1)',border:'1px solid var(--s3)'}}>
                  <div style={{width:26,height:26,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                    background:slot?'rgba(48,192,183,.15)':'var(--s3)',
                    color:slot?'var(--gn)':'var(--tx3)',fontSize:11,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif"}}>
                    {i+1}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    {slot?(
                      <>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>{fmtDur(slot.duracionSeg)} · {slot.ensayoNombre}</div>
                        <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>{fmtFechaCorta(slot.fecha)} · autoborra en 2 sem.</div>
                      </>
                    ):isRecording&&recordSlot===i?(
                      <div style={{fontSize:10,fontWeight:700,color:'var(--rd)',fontFamily:"'Lexend Giga',sans-serif"}}>● Grabando · {fmtDur(recordElapsed)}</div>
                    ):(
                      <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Slot vacío</div>
                    )}
                  </div>
                  {slot&&(<audio src={slot.url} controls style={{height:26,maxWidth:90}}/>)}
                  {isRecording&&recordSlot===i?(
                    <button onClick={detenerGrabacion}
                      style={{padding:'6px 10px',borderRadius:8,border:'none',cursor:'pointer',
                        background:'var(--rd)',color:'#000',fontSize:9,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
                      ■ Detener
                    </button>
                  ):(
                    <button disabled={isRecording} onClick={()=>iniciarGrabacion(i)}
                      style={{padding:'6px 10px',borderRadius:8,border:'1px solid var(--bd2)',cursor:isRecording?'not-allowed':'pointer',
                        background:'var(--s3)',color:'var(--tx2)',fontSize:9,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",
                        flexShrink:0,opacity:isRecording?.4:1}}>
                      {slot?'Reemplazar':'Grabar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
    );

    // Diálogo de destino — aparece justo después de detener una grabación
    const destinoDialog = pendingRecording && (
      <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.7)',
        display:'flex',alignItems:'flex-end',justifyContent:'center'}}
        onClick={descartarPending}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,background:'#0d0d10',
          borderTop:'1px solid var(--bd)',borderRadius:'16px 16px 0 0',padding:'18px 18px calc(18px + env(safe-area-inset-bottom,0px))',
          display:'flex',flexDirection:'column',gap:12}}>
          <div style={{fontSize:12,fontWeight:900,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",textTransform:'uppercase',letterSpacing:'1px'}}>
            ¿Dónde guardamos la grabación? · {fmtDur(pendingRecording.duracionSeg)}
          </div>

          <button onClick={guardarEnCancion}
            style={{textAlign:'left',padding:'12px 14px',borderRadius:12,border:'1px solid rgba(48,192,183,.3)',
              background:'rgba(48,192,183,.08)',cursor:'pointer'}}>
            <div style={{fontSize:11,fontWeight:900,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif"}}>En la Canción</div>
            <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginTop:2,lineHeight:1.4}}>
              Queda permanente en la carpeta de esta canción.
            </div>
          </button>

          <div style={{padding:'12px 14px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)'}}>
            <div style={{fontSize:11,fontWeight:900,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>En un Ensayo</div>
            <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginTop:2,marginBottom:8,lineHeight:1.4}}>
              Se autoborra 2 semanas después de la fecha del evento.
            </div>
            {ensayosDisponibles.length===0?(
              <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",padding:'8px 0',fontStyle:'italic'}}>
                No hay ensayos creados todavía — crea uno desde Backstage → Crear ensayo.
              </div>
            ):(
              <select value={selectedEnsayoId||''} onChange={e=>setSelectedEnsayoId(e.target.value||null)}
                style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--bd2)',
                  background:'#111',color:'var(--tx)',fontSize:10,fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>
                <option value="">Elegir ensayo…</option>
                {ensayosDisponibles.map(en=>(<option key={en.id} value={en.id}>{en.nombre}{en.setlistNombre?` · ${en.setlistNombre}`:''}</option>))}
              </select>
            )}
            <button disabled={!selectedEnsayoId} onClick={guardarEnEnsayo}
              style={{width:'100%',padding:'9px 0',borderRadius:8,border:'none',cursor:selectedEnsayoId?'pointer':'not-allowed',
                background:selectedEnsayoId?'var(--ac)':'var(--bd)',color:selectedEnsayoId?'#000':'var(--tx3)',
                fontSize:9,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif"}}>
              Guardar en este ensayo
            </button>
          </div>

          <button onClick={descartarPending}
            style={{padding:'8px 0',borderRadius:8,border:'none',background:'transparent',color:'var(--tx3)',
              cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
            Descartar grabación
          </button>
        </div>
      </div>
    );

    if(bottomTab!=='referencia') return null;
    return (
      <>
        {createPortal(panel, document.body)}
        {destinoDialog&&createPortal(destinoDialog, document.body)}
      </>
    );
  }



  const WAVE_DATA=Array.from({length:80},(_,i)=>
    Math.abs(Math.sin(i*.31)*.45+Math.sin(i*.13)*.3+Math.sin(i*.07)*.15+.1)
  );

  const SecuenciaPanel=() => {
      // Calcular total de compases para proporciones del mapa
      const guias=seqData?.guias;
      const totalComp=guias?guias.reduce((s,g)=>s+(g.compases||4),0):0;

      // Seek táctil en waveform
      const seekOnEl=(e,el)=>{
        const r=el.getBoundingClientRect();
        const p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
        setSeqPos(p);
        // Highlight del bloque correspondiente
        if(guias&&totalComp){
          let acc=0,found=false;
          for(const g of guias){
            const from=acc/totalComp;
            acc+=g.compases||4;
            const to=acc/totalComp;
            if(p>=from&&p<=to){setSeqHighlight({from,to});found=true;break;}
          }
          if(!found)setSeqHighlight(null);
        }
      };

      // Navegar al bloque por idx (desde mapa)
      const gotoBloque=(i)=>{
        if(!guias||!totalComp)return;
        let acc=0;
        for(let j=0;j<i;j++) acc+=(guias[j].compases||4);
        const from=acc/totalComp;
        acc+=(guias[i].compases||4);
        const to=acc/totalComp;
        setSeqPos(from+.001);
        setSeqHighlight({from,to});
        // Scroll en letra
        const el=document.getElementById('section-'+i);
        const cont=wrapRef.current;
        if(el&&cont){const eT=el.getBoundingClientRect().top;const cT=cont.getBoundingClientRect().top;cont.scrollBy({top:eT-cT-12,behavior:'smooth'});}
        window.dispatchEvent(new CustomEvent('setsync-mapa-seek',{
          detail:{sectionIdx:i,compasInicio:acc-(guias[i].compases||4),msInicio:((acc-(guias[i].compases||4))/(totalComp))*(60000/(seqBpm||120))*4*totalComp}
        }));
      };

      const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
      // Abreviar etiquetas de sección en móvil vertical — mismo criterio
      // que MapaMaestro, duplicado acá porque SecuenciaPanel vive en su
      // propio closure (no se puede compartir función entre ambos sin
      // sacarlos a archivo aparte, y eso ya rompió pantallas en negro antes).
      const abrevMapaSecuencia=lbl=>{
        const m={
          'INTRO':'INT','VERSO':'V','VERSO 1':'V1','VERSO 2':'V2','VERSO 3':'V3',
          'CORO':'C','CORO 2':'C2','CORO 3':'C3','PRE-CORO':'PC','PRECORO':'PC',
          'PUENTE':'P','BRIDGE':'P','FINAL':'FIN','OUTRO':'OUT','INTERLUDIO':'INT',
          'ESTRIBILLO':'EST','CHORUS':'C','VERSE':'V','PRE-CHORUS':'PC',
        };
        return m[lbl.toUpperCase()]||lbl.slice(0,3).toUpperCase();
      };


    const panel = (
      <div
        onTouchStart={e=>e.stopPropagation()}
        onTouchMove={e=>e.stopPropagation()}
        style={{
        position:'fixed',bottom:'calc(54px + env(safe-area-inset-bottom,0px))',left:0,right:0,
        background:'rgba(8,8,9,.98)',borderTop:'1px solid var(--bd)',
        backdropFilter:'blur(40px)',zIndex:110,
        maxHeight:'72vh',
        transform:bottomTab==='secuencia'?'translateY(0)':'translateY(100%)',
        transition:'transform .3s cubic-bezier(.4,0,.2,1)',
        display:'flex',flexDirection:'column',
        overflow:'hidden',
      }}>

        {/* Área scrollable: mapa + waveform + controles + BPM */}
        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none',minHeight:0}}>
        <div style={{padding:'10px 14px 0'}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif"}}>Secuencia</div>
          <div style={{fontSize:9,color:'var(--tx3)',fontWeight:300,fontFamily:"'Lexend Giga',sans-serif",marginTop:2,opacity:.7}}>Click, mapa de estructura y pistas de la canción</div>
        </div>
        {/* ── MAPA DE ESTRUCTURA — integrado en el panel ── */}
        {guias&&guias.length>0&&(
          <div style={{display:'flex',height:34,borderBottom:'1px solid var(--s3)',flexShrink:0}}>
            {guias.map((g,i)=>{
              const pct=(g.compases||4)/totalComp*100;
              let acc=0; for(let j=0;j<i;j++) acc+=(guias[j].compases||4);
              const from=acc/totalComp, to=(acc+(g.compases||4))/totalComp;
              const isActive=seqHighlight&&seqPos>=from&&seqPos<=to;
              return(
                <button key={i} onClick={()=>gotoBloque(i)}
                  style={{width:`${pct}%`,border:'none',cursor:'pointer',padding:0,
                    background:isActive?`${g.color}22`:'transparent',
                    borderBottom:isActive?`2px solid ${g.color}`:'2px solid transparent',
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
                    transition:'all .15s'}}>
                  <span style={{fontSize:8,fontWeight:900,color:isActive?g.color:`${g.color}cc`,
                    fontFamily:"'Lexend Giga',sans-serif",textTransform:'uppercase',lineHeight:1}}>{isTablet?g.label:abrevMapaSecuencia(g.label)}</span>
                  <span style={{fontSize:5,color:'var(--div)',fontWeight:700}}>{g.compases||4}c</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── WAVEFORM GENERAL + SEEK ── */}
        <div style={{padding:'10px 14px 0',flexShrink:0}}>
          <div
            style={{height:44,position:'relative',cursor:'pointer',borderRadius:8,
              background:'var(--s1)',overflow:'hidden',touchAction:'none'}}
            onPointerDown={e=>{
              e.preventDefault();
              const el=e.currentTarget;
              el.setPointerCapture(e.pointerId);
              seekOnEl(e,el);
              const mv=ev=>{ev.preventDefault();seekOnEl(ev,el);};
              const up=ev=>{el.releasePointerCapture(ev.pointerId);el.removeEventListener('pointermove',mv);};
              el.addEventListener('pointermove',mv,{passive:false});
              el.addEventListener('pointerup',up,{once:true});
            }}>
            {/* Barras waveform */}
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',gap:1,padding:'4px 0'}}>
              {WAVE_DATA.map((h,i)=>{
                const pr=i/WAVE_DATA.length;
                const played=pr<seqPos;
                // Highlight del bloque seleccionado
                const inHL=seqHighlight&&pr>=seqHighlight.from&&pr<=seqHighlight.to;
                // Color de sección
                let sc='var(--s3)';
                if(guias&&totalComp){
                  let acc=0;
                  for(const g of guias){
                    const fr=acc/totalComp;
                    acc+=g.compases||4;
                    if(pr<=acc/totalComp){sc=g.color;break;}
                  }
                }
                return(
                  <div key={i} style={{
                    flex:1,borderRadius:1,
                    height:`${Math.max(12,h*100)}%`,
                    background: inHL
                      ? (played?sc+'ee':sc+'55')  // bloque seleccionado: más brillante
                      : (played?sc+'99':'var(--s3)'),
                    transition:'background .08s',
                  }}/>
                );
              })}
            </div>
            {/* Playhead */}
            <div style={{position:'absolute',top:0,bottom:0,left:`${seqPos*100}%`,
              width:2,background:'#fff',zIndex:3,boxShadow:'0 0 5px rgba(255,255,255,.8)'}}/>
          </div>
          {/* Tiempo */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
            <span style={{fontSize:8,color:'var(--tx3)'}}>{fmt(seqPos*192)}</span>
            <span style={{fontSize:8,color:'var(--tx3)'}}>3:12</span>
          </div>
        </div>

        {/* ── BARRA ÚNICA: BPM + Cifra + Controles ── */}
        <div style={{display:'flex',alignItems:'center',gap:0,
          margin:'8px 14px',padding:'8px 12px',
          background:'var(--s1)',borderRadius:12,
          border:'1px solid var(--s3)',flexShrink:0}}>

          {/* Rueda de selección de BPM — scroll nativo, sin bugs de touch */}
          <div style={{position:'relative',width:52,height:78,flexShrink:0}}>
            <div ref={wheelRef} onScroll={handleWheelScroll} className="bpm-wheel"
              style={{height:'100%',overflowY:'scroll',scrollSnapType:'y mandatory',
                scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
              <div style={{height:WHEEL_ITEM_H}}/>
              {Array.from({length:BPM_MAX-BPM_MIN+1},(_,i)=>BPM_MIN+i).map(n=>(
                <div key={n} style={{height:WHEEL_ITEM_H,scrollSnapAlign:'center',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:"'Special Gothic Expanded One',sans-serif",
                  fontSize:n===seqBpm?19:12,
                  color:n===seqBpm?(clickActivo?'var(--gn)':'var(--ac)'):'var(--tx3)',
                  transition:'font-size .1s,color .1s'}}>{n}</div>
              ))}
              <div style={{height:WHEEL_ITEM_H}}/>
            </div>
            {/* Marco central — indica la selección, no intercepta touch */}
            <div style={{position:'absolute',top:WHEEL_ITEM_H,left:0,right:0,height:WHEEL_ITEM_H,
              borderTop:'1px solid var(--bd2)',borderBottom:'1px solid var(--bd2)',
              pointerEvents:'none'}}/>
            {/* Fades arriba/abajo para que se sienta como rueda, no lista cortada */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:18,
              background:'linear-gradient(180deg,var(--bg),transparent)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:18,
              background:'linear-gradient(0deg,var(--bg),transparent)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:-11,left:0,right:0,textAlign:'center',
              fontSize:7,color:'var(--tx3)',fontWeight:700,letterSpacing:1,pointerEvents:'none'}}>BPM</div>
          </div>

          {/* Tap tempo con LED */}
          <button onClick={handleTapSeq}
            style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:5,width:40,height:56,borderRadius:10,marginLeft:8,flexShrink:0,
              border:'1px solid var(--bd)',background:'var(--s3)',
              cursor:'pointer'}}>
            <div style={{width:9,height:9,borderRadius:'50%',
              background:tapSeqLit?'var(--gn)':'var(--bd2)',
              boxShadow:tapSeqLit?'0 0 8px rgba(48,192,183,.9)':'none',
              transition:'background .08s,box-shadow .08s'}}/>
            <span style={{fontSize:7,fontWeight:900,color:'var(--tx3)',
              fontFamily:"'Lexend Giga',sans-serif",letterSpacing:.5}}>TAP</span>
          </button>

          {/* Divisor */}
          <div style={{width:1,height:26,background:'var(--bd)',margin:'0 10px',flexShrink:0}}/>

          {/* Cifra — sin label */}
          <div style={{position:'relative',flexShrink:0}}>
            <select value={seqCifra}
              onChange={e=>{const c=e.target.value;setSeqCifra(c);if(clickActivo){stopClick();startClick(seqBpm,c);}}}
              style={{padding:'5px 20px 5px 8px',borderRadius:8,
                border:'1px solid var(--bd)',
                background:'var(--s3)',color:'var(--ac)',
                fontSize:14,fontWeight:700,
                fontFamily:"'Special Gothic Expanded One',sans-serif",
                outline:'none',WebkitAppearance:'none',appearance:'none',
                cursor:'pointer',minWidth:52}}>
              {CIFRAS.map(c=><option key={c} value={c} style={{background:'#0a0a0a'}}>{c}</option>)}
            </select>
            <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="var(--em)" strokeWidth="2.5"
              style={{position:'absolute',right:5,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {/* Divisor */}
          <div style={{width:1,height:26,background:'var(--bd)',margin:'0 10px',flexShrink:0}}/>

          {/* Controles: ⏮ Play ⏭ */}
          {/* Sección anterior */}
          <button onClick={()=>{
            if(!guias)return;
            let cur=0;
            for(let j=0;j<guias.length;j++){
              const to=(cur+(guias[j].compases||4))/totalComp;
              if(seqPos<to+.001){gotoBloque(Math.max(0,j-1));break;}
              cur+=guias[j].compases||4;
            }
          }} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2.5"/>
            </svg>
          </button>

          {/* Play / Stop click */}
          <button onClick={()=>{const next=!clickActivo;setClickActivo(next);if(next)startClick(seqBpm);else stopClick();}}
            style={{width:44,height:44,borderRadius:'50%',border:'none',flexShrink:0,
              marginLeft:6,
              background:clickActivo?'var(--rd)':'var(--gn)',color:'#000',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',
              boxShadow:clickActivo?'0 0 16px rgba(253,128,131,.5)':'0 0 16px rgba(48,192,183,.3)'}}>
            {clickActivo
              ?<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              :<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          </button>

          {/* Sección siguiente */}
          <button onClick={()=>{
            if(!guias)return;
            let cur=0;
            for(let j=0;j<guias.length;j++){
              const to=(cur+(guias[j].compases||4))/totalComp;
              if(seqPos<to-.001){gotoBloque(Math.min(guias.length-1,j+1));break;}
              cur+=guias[j].compases||4;
            }
          }} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:6}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5"/>
            </svg>
          </button>
        </div>

        </div>{/* fin área scrollable */}
        {/* ── Multitracks FUERA del scroll para touch libre ── */}
        <div style={{flexShrink:0,padding:'0 12px 10px',borderTop:'1px solid var(--s3)'}}>
        {/* ── Multitracks con faders — tope de 6 pistas, 2 por fila (50%/50%) ── */}
        <div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif"}}>Multitracks</div>
            <div style={{fontSize:9,color:'var(--tx3)',fontWeight:300,fontFamily:"'Lexend Giga',sans-serif",marginTop:2,opacity:.7}}>Ajusta el volumen de cada pista mientras tocas</div>
          </div>
          {seqData?.multitracks?(
            <div style={{display:'grid',gridTemplateColumns:isTablet?'repeat(3,1fr)':'repeat(2,1fr)',gap:8}}>
              {seqData.multitracks.slice(0,6).map((tr,i)=>{
                const vol = trackVols[i]??80;
                const muted = trackMutes[i]??false;
                return(
                  <div key={i} style={{position:'relative',display:'flex',flexDirection:'column',gap:5,
                    padding:'6px 10px 5px',borderRadius:12,overflow:'visible',
                    background:muted?'rgba(253,128,131,.08)':'var(--s1)',
                    border:`1px solid ${muted?'rgba(253,128,131,.3)':'var(--s3)'}`}}>
                    {/* Mute — arriba a la derecha */}
                    <button onClick={e=>{e.stopPropagation();setTrackMutes(m=>{const n=[...m];n[i]=!n[i];return n;})}}
                      style={{position:'absolute',top:5,right:5,fontSize:8,fontWeight:900,
                        padding:'2px 6px',borderRadius:5,border:'none',
                        cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",
                        background:muted?'var(--rd)':'var(--s3)',
                        color:muted?'#fff':'var(--tx3)'}}>
                      {muted?'MUTE':'M'}
                    </button>
                    {/* Dot + Label */}
                    <div style={{display:'flex',alignItems:'center',gap:7,paddingRight:26}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:muted?'rgba(253,128,131,.5)':tr.color,flexShrink:0}}/>
                      <div style={{fontSize:11,fontWeight:400,color:muted?'var(--tx3)':'var(--tx2)',
                        fontFamily:"'Lexend Giga',sans-serif",overflow:'hidden',whiteSpace:'nowrap',
                        textOverflow:'ellipsis',flex:1}}>{tr.label}</div>
                    </div>
                    {/* Fader Secuencia — horizontal */}
                    <div style={{width:'100%',padding:'1px 0',overflow:'visible'}}>
                      <div className="fader-track-h">
                        <div className="fader-knob-h"
                          style={{left:`calc(${vol}% - 11px)`}}
                          onPointerDown={e=>{
                            /* ⚠️ Mismo patrón crítico que .fader-knob (ZONA
                             * BLINDADA), solo con eje X en vez de Y.
                             * NO recalcular rect en move. NO usar setState
                             * en move. knob.style.left se mueve directo en
                             * DOM; setState solo en pointerup. */
                            e.preventDefault();
                            e.stopPropagation();
                            const knob=e.currentTarget;
                            const track=knob.parentElement;
                            knob.setPointerCapture(e.pointerId);
                            const r=track.getBoundingClientRect();
                            const trackW=r.width;
                            const trackLeft=r.left;
                            const calcPct=ev=>Math.round(Math.max(0,Math.min(1,(ev.clientX-trackLeft)/trackW))*100);
                            let curVol=calcPct(e);
                            knob.style.left=`calc(${curVol}% - 11px)`;
                            const move=ev=>{
                              ev.preventDefault();
                              curVol=calcPct(ev);
                              knob.style.left=`calc(${curVol}% - 11px)`;
                            };
                            const up=ev=>{
                              knob.releasePointerCapture(ev.pointerId);
                              knob.removeEventListener('pointermove',move);
                              knob.removeEventListener('pointerup',up);
                              setTrackVols(v=>{const n=[...v];n[i]=curVol;return n;});
                            };
                            knob.addEventListener('pointermove',move,{passive:false});
                            knob.addEventListener('pointerup',up,{once:true});
                          }}
                          onTouchStart={e=>e.stopPropagation()}
                        >{/* knob */}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ):(
            <div style={{padding:'16px',borderRadius:12,border:'1px dashed var(--bd)',textAlign:'center'}}>
              <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Sin pistas para esta canción.</div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
    if(bottomTab!=='secuencia') return null;
    return createPortal(panel, document.body);
  }


  // ── NavBar — botones flotantes, sin título ───────────────────────────────
  const NavBar=()=>(
    <>
      {idx>0&&(
        <button onClick={()=>setIdx(i=>i-1)}
          style={{position:'fixed',left:12,bottom:72,zIndex:20,display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:100,border:'1px solid var(--bd)',background:'rgba(10,10,20,.88)',backdropFilter:'blur(20px)',color:'var(--tx2)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          {tx.previous}
        </button>
      )}
      <button onClick={()=>{if(idx===songs.length-1)onClose();else setIdx(i=>i+1);}}
        style={{position:'fixed',right:12,bottom:72,zIndex:20,display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:100,border:'1px solid var(--bd2)',background:'var(--bd)',backdropFilter:'blur(20px)',color:'var(--tx)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
        {idx===songs.length-1?tx.done:tx.next}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </>
  );

  // ── Layout tablet ≥768px — sin sidebar de canciones (pantalla completa)──
  if(isTablet){
    return(
      <div className="sv" style={{background:svBg,position:'fixed',inset:0,zIndex:100}}>
        {showSavePopup&&<PopupGuardar/>}
                {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
        <div className="sv-hdr" style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`}}>
          <div className="sv-back" onClick={()=>{if(editMode&&editedSongs[song?.name]){setShowSavePopup(true);}else onClose();}}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
            <div style={{fontSize:8,color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
              {song.autor||song.artista||'—'}
              {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
              {song.asignaciones&&song.asignaciones.length>0&&song.asignaciones.map((a,ai)=>(<span key={ai} style={{color:'var(--ac)',marginLeft:6,background:'rgba(200,169,126,.15)',padding:'2px 7px',borderRadius:100}}>{a.persona?`${a.variacion} → ${a.persona}`:a.variacion}</span>))}
            </div>
          </div>
          <button onClick={()=>setShowCarpeta(true)} title="Ver carpeta de esta canción"
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,
              background:'none',border:'none',cursor:'pointer',padding:'0 4px',flexShrink:0}}>
            <div style={{width:26,height:26,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
              background:'rgba(200,169,126,.12)'}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span style={{fontSize:8,fontWeight:700,color:'var(--ac)'}}>
              {1+(variacionesDB[baseName]||[]).length+(carpetaActual.secuencia||[]).length+(carpetaActual.trackReferencia?1:0)}
            </span>
          </button>
          <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
            {songs.map((_,i)=>(<div key={i} style={{width:i===idx?14:6,height:4,borderRadius:2,background:i===idx?'var(--ac)':'var(--div)',transition:'all .3s'}}/>))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{idx+1}/{songs.length}</div>
          </div>
        </div>
        <AnnoBar/>
        <ContentArea/>
          <MonitorPanel/>
        <ReferenciaPanel/>
        <SecuenciaPanel/>
        <CarpetaModal/>
        <BottomTabBar/>
      </div>
    );
  }

  // ── Layout mobile <768px ──────────────────────────────────────────────────
  return(
    <div className={`sv${sidebarVisible?' sv-with-sidebar':''}${sidebarCollapsed?' sv-sb-col':''}`} style={{background:svBg,position:'fixed',inset:0,zIndex:100}}>
      {showSavePopup&&<PopupGuardar/>}
            {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div className="sv-hdr" style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`}}>
        <div className="sv-back" onClick={()=>{if(editMode&&editedSongs[song?.name]){setShowSavePopup(true);}else onClose();}}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:8,color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
            {song.autor||song.artista||'—'}
            {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
            {song.asignaciones&&song.asignaciones.length>0&&song.asignaciones.map((a,ai)=>(<span key={ai} style={{color:'var(--ac)',marginLeft:6,background:'rgba(200,169,126,.15)',padding:'2px 7px',borderRadius:100}}>{a.persona?`${a.variacion} → ${a.persona}`:a.variacion}</span>))}
          </div>
        </div>
        <button onClick={()=>setShowCarpeta(true)} title="Ver carpeta de esta canción"
          style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,
            background:'none',border:'none',cursor:'pointer',padding:'0 4px',flexShrink:0}}>
          <div style={{width:26,height:26,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(200,169,126,.12)'}}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span style={{fontSize:8,fontWeight:700,color:'var(--ac)'}}>
            {1+(variacionesDB[baseName]||[]).length+(carpetaActual.secuencia||[]).length+(carpetaActual.trackReferencia?1:0)}
          </span>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{idx+1}/{songs.length}</div>
        </div>
      </div>
      <AnnoBar/>
      <ContentArea/>
        <MonitorPanel/>
        <ReferenciaPanel/>
        <SecuenciaPanel/>
        <CarpetaModal/>
      <BottomTabBar/>
    </div>
  );
}
