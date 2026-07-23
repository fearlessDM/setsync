import { t as getT } from '../i18n';
// SongView: visor de canción con transposición, capo, anotaciones,
// vista bloques/lineal, Nashville, panel Estructura con drag touch.
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { tpKey } from '../utils/music';
import { Toast, CustomSelect } from './common';
import { renderSongContent, CHORD_RE, resolveLineAbsIndex } from './songview/vistaLineal';
import { useMapaCancion } from './songview/useMapaCancion';

import { crearDriver, MARCAS_MESA } from '../mixer/mixerDrivers';
import { subirAudiosMultiples, subirAudio, borrarAudio } from '../firebase/storage';
import { getAccountId } from '../firebase/firestore';
import { firebaseListo as firebaseListoGlobal } from '../firebase/config';
import { estimarConversion, convertirAMp3, convertirAOpus } from '../utils/audioConvert';
import { useAnotaciones } from './songview/useAnotaciones';
import { useAutoScroll, RANGO_SCROLL } from './songview/useAutoScroll';
import { useModoVivo, calcularProgramacion } from '../hooks/useModoVivo';


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
};

const POPUP_SEEN_KEY='ss_bloques_popup_seen';
export function SongView({songs,startIdx,onClose,theme="dark",isAdmin=false,onSaveChords,contentDB={},permisos=null,lang='es',sidebarVisible=false,sidebarCollapsed=false,ensayosDisponibles=[],archivosDB={},setArchivosDB=()=>{},variacionesDB={},estructurasDB={},onEditInCancionero=null,accountId=null,authListo=true,miNombre='Líder'}){
  const tx=getT(lang);
  // ── Capa de permisos (Academia) — ÚLTIMA capa, solo oculta/muestra
  // controles. Nunca se entrevera dentro de cada feature: cada feature sigue
  // funcionando igual, esto solo decide si su botón/panel se renderiza.
  // permisos=null (default) o no provisto = acceso total, sin restricciones.
  const perm={...PERMISOS_TOTAL,...(permisos||{})};
  const [idx,setIdx]=useState(startIdx);
  const [tpOff,setTpOff]=useState(0);
  const [showChords,setShowChords]=useState(true);
  const [capo,setCapo]=useState(0);
  const [editMode,setEditMode]=useState(false);
  const [selectedChord,setSelectedChord]=useState(null);
  const [editedSongs,setEditedSongs]=useState({});
  const [showSavePopup,setShowSavePopup]=useState(false);
  const [capoOpen,setCapoOpen]=useState(false);
  const [tonoOpen,setTonoOpen]=useState(false);
  const tonoBtnRef=useRef(null);
  const [tonoPos,setTonoPos]=useState(null);
  const [metroOpen,setMetroOpen]=useState(false);
  const metroBtnRef=useRef(null);
  const [metroPos,setMetroPos]=useState(null);
  const [notacionOpen,setNotacionOpen]=useState(false);
  const [notacionPos,setNotacionPos]=useState(null);
  const notacionBtnRef=useRef(null);
  const NOTACION_LABELS={americano:tx.notationAmerican,latino:tx.notationLatin,grados:tx.degrees};
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
        background:mesaConectada?'rgba(var(--gn-rgb),.1)':'var(--s1)',
      }}>
        {/* Headphones icon */}
        <svg viewBox="0 0 24 24" width={compact?12:14} height={compact?12:14} fill="none"
          stroke={mesaConectada?'var(--gn)':'var(--tx3)'} strokeWidth="2">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
        </svg>
        {!compact&&(
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:mesaConectada?'var(--gn)':'var(--tx3)',
              textTransform:'uppercase',letterSpacing:'1px',fontFamily:"var(--font-body)",lineHeight:1}}>
              {mesaConectada?tx.connectedLbl:tx.disconnectedLbl}
            </div>
            <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginTop:2,
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
  const [viewMode,setViewMode]=useState('lineal'); // mantener para compatibilidad interna
  const [showModePopup,setShowModePopup]=useState(false);
  const [notacion,setNotacion]=useState('americano'); // 'americano' | 'latino' | 'grados'

  const getSongContent=(song)=>{if(!song)return null;const k=song.name||song.n||'';return editedSongs[k]||contentDB[k]||null;};

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
    if(!song)return;
    if(!song.name&&song.n){song.name=song.n;}
    const raw=getSongContent(song)||'';
    const allLines=raw.split('\n');

    // Ubicar la línea real usando EXACTAMENTE la misma lógica que ya usó
    // el render para numerar esta línea con este lineIdx (ver
    // songview/vistaLineal.jsx → resolveLineAbsIndex) — antes esta lógica
    // estaba reimplementada acá por separado y podía desincronizarse del
    // render, hacía que mover un acorde fallara en silencio y "volviera a
    // su lugar" al soltar.
    const targetAbsIdx=resolveLineAbsIndex(raw,lineIdx);
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
    if(!song)return;
    const edited=editedSongs[song.name];
    if(edited&&onSaveChords){onSaveChords(song.name,edited);setToast('✓ Acordes guardados oficialmente');}
    setEditMode(false);setSelectedChord(null);
  };
  // svBg usa la variable de tema en lugar de negro fijo — así Brasa, Blue Lava
  // y cualquier tema claro/cálido muestran su color real en vez de negro.
  // Se mantiene una opacidad alta para que los elementos flotantes (header,
  // nav) tengan el efecto de cristal oscuro sobre la letra.
  const svBg      ='var(--bg)';
  const svHdrBg   ='color-mix(in srgb, var(--bg) 92%, transparent)';
  const svNavBg   ='color-mix(in srgb, var(--bg) 88%, transparent)';
  const svTx      ='var(--tx)';
  const svTx3     ='var(--tx3)';
  const svAc      ='var(--ac)';
  const svBd      ='var(--bd)';

  useEffect(()=>{const h=()=>setIsTablet(window.innerWidth>=768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);

  const wrapRef=useRef(null);

  // ── Anotaciones (lápiz libre) + Autoscroll — v90. Reactivados: estaban
  // guardados (nunca borrados, ver useAnotaciones.js/useAutoScroll.js)
  // desde que Danny los sacó por bugs de dibujo. El fix de posición del
  // trazo (rectRef capturado UNA VEZ por gesto) sigue el mismo patrón ya
  // probado del fader de Monitoreo (ZONA BLINDADA).
  const annoContainerRef=useRef(null); // envuelve SOLO la letra (adentro del área scrolleable), no el viewport — así el canvas scrollea junto con la canción
  const [dibujoActivo,setDibujoActivo]=useState(false); // ¿lápiz habilitado para dibujar ahora?
  const [annoTool,setAnnoTool]=useState('pen'); // 'pen' | 'erase'
  const [annoColor,setAnnoColor]=useState('#EE227D');
  const [annoSz,setAnnoSz]=useState(4);
  const [annoOpen,setAnnoOpen]=useState(false);
  const annoBtnRef=useRef(null);
  const [annoPos,setAnnoPos]=useState(null);
  const [autoScroll,setAutoScroll]=useState(false);
  const [scrollSpeed,setScrollSpeed]=useState(RANGO_SCROLL.default);
  const [scrollOpen,setScrollOpen]=useState(false);
  const scrollBtnRef=useRef(null);
  const [scrollPos,setScrollPos]=useState(null);
  const anno=useAnotaciones({containerRef:annoContainerRef,tool:annoTool,color:annoColor,sz:annoSz,showAnnoBar:dibujoActivo,idx});
  const {resetScroll}=useAutoScroll({wrapRef,autoScroll,setAutoScroll,scrollSpeed,idx});
  const [vivoOpen,setVivoOpen]=useState(false);
  const vivoBtnRef=useRef(null);
  const [vivoPos,setVivoPos]=useState(null);

  const song=songs[idx]||songs[songs.length-1]||{name:'',key:'C'};
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

  useEffect(()=>{setTpOff(0);setCapo(0);setCapoOpen(false);},[idx]);
  // Si el permiso de ver acordes está desactivado, forzamos showChords=false
  // de forma persistente — sin esto, un alumno podría quedar con acordes
  // visibles si showChords ya estaba en true antes de aplicar el permiso.
  useEffect(()=>{if(!perm.verAcordes)setShowChords(false);},[perm.verAcordes]);
  // Mismo patrón defensivo para Nashville: si el permiso se revoca mientras
  // el control ya estaba activo, lo apagamos. Hoy esto no puede ocurrir en
  // la práctica (SongView reinicia su estado al desmontar), pero queda como
  // protección barata ante una futura persistencia de estado.
  useEffect(()=>{if(!perm.modoNashville)setNotacion('americano');},[perm.modoNashville]);

  const doTp=steps=>{const nOff=tpOff+steps;setTpOff(nOff);setToast({text:`♩ ${tpKey(song.key,nOff)}`,sub:nOff===0?tx.original:`${nOff>0?'+':''}${nOff} st`});};
  // ── Panel Tono + Capo ─────────────────────────────────────────────────────
  const PanelTono=()=>(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',borderRadius:14,background:'rgba(6,4,18,.82)',backdropFilter:'blur(40px)',width:64,overflow:'visible',position:'relative'}}>
      <button onClick={()=>doTp(1)} style={{width:'100%',padding:'7px 0',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)',borderRadius:'14px 14px 0 0'}}>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        <span style={{fontSize:'var(--fs-2xs)',fontWeight:900,color:'var(--tx3)',letterSpacing:'.5px'}}>#</span>
      </button>
      <div style={{width:'100%',padding:'6px 0',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'var(--fs-xl)',color:svAc,lineHeight:1}}>{curKey}</div>
        {tpOff!==0&&<div style={{fontSize:'var(--fs-3xs)',color:'var(--tx3)',fontWeight:700,marginTop:1}}>{tpOff>0?'+':''}{tpOff}st</div>}
      </div>
      <button onClick={()=>doTp(-1)} style={{width:'100%',padding:'7px 0',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)'}}>
        <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',fontStyle:'italic'}}>b</span>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <button onClick={()=>setCapoOpen(o=>!o)} style={{width:'100%',padding:'6px 0',background:capo>0?'rgba(200,169,126,.15)':'transparent',color:capo>0?'var(--ac)':'var(--tx3)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderRadius:'0 0 14px 14px',transition:'all .2s'}}>
        <span style={{fontSize:'var(--fs-3xs)',fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',color:capo>0?svAc:svTx3}}>CAPO</span>
        <span style={{fontSize:capo>0?'var(--fs-lg)':'var(--fs-base)',fontWeight:900,color:capo>0?'var(--ac)':'var(--tx3)',lineHeight:1}}>{capo>0?capo:'—'}</span>
        {capo>0&&<span style={{fontSize:'var(--fs-3xs)',color:'var(--gn)',fontWeight:700,lineHeight:1.2}}>{sonaKey}</span>}
        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:capoOpen?'rotate(180deg)':'none',transition:'transform .2s',marginTop:1}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {capoOpen&&(
        <div style={{position:'absolute',right:60,top:'50%',transform:'translateY(-50%)',background:'rgba(10,10,20,.97)',borderRadius:14,padding:12,zIndex:10,minWidth:140,boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{tx.capoPositionLbl}</div>
          {[0,1,2,3,4,5,6,7].map(c=>{
            const notaSuena=c===0?curKey:tpKey(curKey,-c);
            const isOn=capo===c;
            return(
              <button key={c} onClick={()=>{setCapo(c);setCapoOpen(false);setToast(c===0?{text:tx.noCapo,sub:tx.original}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                style={{width:'100%',padding:'7px 10px',marginBottom:3,borderRadius:8,background:isOn?'rgba(200,169,126,.15)':'var(--s1)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {isOn?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--ac)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:10}}/>}
                  <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'var(--fs-lg)',color:isOn?'var(--ac)':'var(--tx)',lineHeight:1}}>{c===0?tx.noCapo:c}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'var(--fs-base)',fontWeight:700,color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'Outfit',sans-serif"}}>{notaSuena}</div>
                  {c>0&&<div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',marginTop:1}}>suena</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── AnnoBar ───────────────────────────────────────────────────────────────
  const AnnoBar=()=>(
    <div style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',overflowX:'auto',scrollbarWidth:'none'}}>
        <div style={{flex:1,flexShrink:0,minWidth:4}}/>
        {capo>0&&(
          <div style={{padding:'3px 8px',borderRadius:100,background:'rgba(94,206,160,.1)',fontSize:'var(--fs-sm)',fontWeight:700,color:'var(--gn)',flexShrink:0}}>
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
        {/* ── Metrónomo ────────────────────────────────────────────────────
            Antes el click con sonido vivía solo dentro del panel de
            Secuencia. Ahora que Secuencia tiene sus propios multitracks
            reales (incluyendo, típicamente, una pista de Click grabada),
            el metrónomo generado por Web Audio ya no pinta ahí — esa pega
            la hace el track real. Se sube a la barra principal, disponible
            siempre, sin depender de estar en el panel de Secuencia. Usa el
            mismo motor startClick/stopClick y el mismo BPM (seqBpm) que ya
            existía, solo cambia dónde vive el botón. */}
        <div style={{position:'relative',flexShrink:0}}>
          <button ref={metroBtnRef} onClick={()=>{
            if(!metroOpen){
              const r=metroBtnRef.current.getBoundingClientRect();
              const panelW=Math.min(200,window.innerWidth-24);
              const leftIdeal=r.left+(r.width/2)-(panelW/2);
              const left=Math.max(12,Math.min(leftIdeal,window.innerWidth-panelW-12));
              setMetroPos({top:r.bottom+6,left,width:panelW});
            }
            setMetroOpen(o=>!o);
          }}
            title="Metrónomo"
            style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,flexShrink:0,
              background:clickActivo?'rgba(var(--gn-rgb),.15)':'var(--s1)',
              color:clickActivo?'var(--gn)':'var(--tx3)',cursor:'pointer',
              fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"'Outfit',sans-serif"}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:clickActivo?'var(--gn)':'var(--tx3)',flexShrink:0}}/>
            {seqBpm}
          </button>
          {metroOpen&&metroPos&&createPortal(
            <>
              <div onClick={()=>setMetroOpen(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
              <div style={{position:'fixed',top:metroPos.top,left:metroPos.left,
                width:metroPos.width,
                background:'rgba(10,10,20,.97)',
                borderRadius:16,padding:14,zIndex:999,
                boxShadow:'0 8px 32px rgba(0,0,0,.8)'}}>
                <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Metrónomo</div>
                {/* BPM +/- , solo afecta al click sintetizado — sin influencia sobre multitracks */}
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <button onClick={()=>{const v=Math.max(40,seqBpm-1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v,seqCifra);}}}
                    style={{width:32,height:32,borderRadius:8,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-xl)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-3xl)',color:clickActivo?'var(--gn)':'var(--ac)',lineHeight:1}}>{seqBpm}</div>
                    <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700,marginTop:2}}>BPM</div>
                  </div>
                  <button onClick={()=>{const v=Math.min(300,seqBpm+1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v,seqCifra);}}}
                    style={{width:32,height:32,borderRadius:8,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-xl)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
                </div>
                {/* TAP tempo — mismo cálculo que ya existía, solo que ahora
                    vive únicamente acá y no influye sobre Secuencia */}
                <button onClick={handleTapSeq}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                    padding:'10px',borderRadius:10,background:'var(--s1)',cursor:'pointer',marginBottom:10}}>
                  <div style={{width:9,height:9,borderRadius:'50%',
                    background:tapSeqLit?'var(--gn)':'var(--bd2)',
                    boxShadow:tapSeqLit?'0 0 8px rgba(var(--gn-rgb),.9)':'none',
                    transition:'background .08s,box-shadow .08s'}}/>
                  <span style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--tx2)',fontFamily:"'Outfit',sans-serif"}}>TAP TEMPO</span>
                </button>
                {/* Cifra — movida acá desde Secuencia, junto con BPM/TAP */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700,marginBottom:5,textAlign:'center'}}>CIFRA</div>
                  <CustomSelect value={seqCifra}
                    onChange={c=>{setSeqCifra(c);if(clickActivo){stopClick();startClick(seqBpm,c);}}}
                    options={CIFRAS.map(c=>({value:c,label:c}))}
                    style={{width:'100%',padding:'8px',fontSize:'var(--fs-emph)',fontWeight:700,color:'var(--ac)',textAlign:'center',
                      fontFamily:"var(--font-display)"}}/>
                </div>
                <button onClick={handleTransportePress}
                  style={{width:'100%',padding:'10px',borderRadius:10,background:clickActivo?'var(--rd)':'var(--gn)',color:'#000',cursor:'pointer',
                    fontSize:'var(--fs-base)',fontWeight:900,fontFamily:"'Outfit',sans-serif"}}>
                  {clickActivo?'DETENER':'REPRODUCIR'}
                </button>
              </div>
            </>,
            document.body
          )}
        </div>
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
            background:(tpOff!==0||capo>0)?'rgba(200,169,126,.12)':'var(--s1)',
            color:(tpOff!==0||capo>0)?'var(--ac)':'var(--tx3)',
            cursor:'pointer',fontSize:'var(--fs-md)',fontWeight:900,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
            <span style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-lg)'}}>{curKey}</span>
            {capo>0&&<span style={{fontSize:'var(--fs-xs)',color:'var(--gn)',fontWeight:700}}>·{sonaKey}</span>}
            {notacion!=='americano'&&<span style={{fontSize:'var(--fs-2xs)',color:'#a78bfa',fontWeight:700,fontFamily:"var(--font-body)"}}>{NOTACION_LABELS[notacion].slice(0,3)}</span>}
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
                background:'rgba(10,10,20,.97)',
                borderRadius:16,padding:14,zIndex:999,
                boxShadow:'0 8px 32px rgba(0,0,0,.8)'}}>
                {/* Transposición */}
                <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.transpositionLbl}</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <button onClick={()=>doTp(-1)} style={{width:36,height:36,borderRadius:10,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-xl)',fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',fontStyle:'italic'}}>b</button>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-display)',color:svAc,lineHeight:1}}>{curKey}</div>
                    {tpOff!==0&&<div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontWeight:700,marginTop:2}}>{tpOff>0?'+':''}{tpOff}st</div>}
                  </div>
                  <button onClick={()=>doTp(1)} style={{width:36,height:36,borderRadius:10,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-xl)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>#</button>
                </div>
                {tpOff!==0&&<button onClick={()=>{setTpOff(0);setToast({text:`♩ ${song.key}`,sub:tx.original});}} style={{width:'100%',padding:'6px',borderRadius:8,background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-sm)',fontWeight:700,fontFamily:"'Outfit',sans-serif",marginBottom:10}}>{tx.restoreOriginalLbl}</button>}
                {/* Capo */}
                <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.capoShortLbl}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:14}}>
                  {[0,1,2,3,4,5,6,7].map(c=>{
                    const notaSuena=c===0?curKey:tpKey(curKey,-c);
                    const isOn=capo===c;
                    return(
                      <button key={c} onClick={()=>{setCapo(c);setToast(c===0?{text:tx.noCapo,sub:tx.original}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                        style={{padding:'6px 4px',borderRadius:8,background:isOn?'rgba(200,169,126,.15)':'var(--s1)',
                          cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,transition:'all .15s'}}>
                        <span style={{fontSize:'var(--fs-md)',fontWeight:900,color:isOn?'var(--ac)':'var(--tx)',fontFamily:"'Outfit',sans-serif"}}>{c===0?'—':c}</span>
                        <span style={{fontSize:'var(--fs-2xs)',color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'Outfit',sans-serif",fontWeight:700}}>{notaSuena}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Notación */}
                <div style={{borderTop:'1px solid var(--s3)',paddingTop:10}}>
                  <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.notationLbl}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {['americano','latino','grados'].map(opt=>{
                      const isOn=notacion===opt;
                      return(
                        <button key={opt} onClick={()=>setNotacion(opt)}
                          style={{padding:'7px 10px',borderRadius:8,
                            background:isOn?'rgba(167,139,250,.15)':'var(--s1)',
                            cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'all .15s'}}>
                          {isOn
                            ?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#a78bfa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            :<div style={{width:10,flexShrink:0}}/>
                          }
                          <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'var(--fs-lg)',color:isOn?'#a78bfa':'var(--tx)',lineHeight:1}}>{NOTACION_LABELS[opt]}</span>
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

        {perm.anotacionesPropias&&(
          <div style={{position:'relative',flexShrink:0}}>
            <button ref={annoBtnRef} onClick={()=>{
                if(!annoOpen){
                  const r=annoBtnRef.current.getBoundingClientRect();
                  const panelW=Math.min(220,window.innerWidth-24);
                  const leftIdeal=r.left+(r.width/2)-(panelW/2);
                  const left=Math.max(12,Math.min(leftIdeal,window.innerWidth-panelW-12));
                  setAnnoPos({top:r.bottom+6,left,width:panelW});
                }
                setAnnoOpen(o=>!o);
              }}
              title="Anotar"
              style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,flexShrink:0,
                background:dibujoActivo?'rgba(var(--gn-rgb),.15)':'var(--s1)',
                color:dibujoActivo?'var(--gn)':'var(--tx3)',cursor:'pointer'}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
            </button>
            {annoOpen&&annoPos&&createPortal(
              <>
                <div onClick={()=>setAnnoOpen(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
                <div style={{position:'fixed',top:annoPos.top,left:annoPos.left,width:annoPos.width,
                  background:'rgba(10,10,20,.97)',borderRadius:16,padding:14,zIndex:999,
                  boxShadow:'0 8px 32px rgba(0,0,0,.8)'}}>
                  <button onClick={()=>setDibujoActivo(v=>!v)}
                    style={{width:'100%',padding:'9px',borderRadius:10,marginBottom:12,
                      background:dibujoActivo?'var(--gn)':'var(--s1)',color:dibujoActivo?'#000':'var(--tx2)',
                      cursor:'pointer',fontWeight:900,fontFamily:"'Outfit',sans-serif",fontSize:'var(--fs-sm)'}}>
                    {dibujoActivo?'DIBUJANDO — TOCA PARA PARAR':'ACTIVAR LÁPIZ'}
                  </button>
                  <div style={{display:'flex',gap:6,marginBottom:12}}>
                    {['pen','erase'].map(t=>(
                      <button key={t} onClick={()=>setAnnoTool(t)}
                        style={{flex:1,padding:'7px',borderRadius:8,
                          background:annoTool===t?'rgba(200,169,126,.15)':'var(--s1)',
                          color:annoTool===t?'var(--ac)':'var(--tx3)',cursor:'pointer',fontWeight:700,fontSize:'var(--fs-sm)'}}>
                        {t==='pen'?'Lápiz':'Borrador'}
                      </button>
                    ))}
                  </div>
                  {annoTool==='pen'&&(
                    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                      {['#EE227D','#5e9eff','#30C0B7','#f5a623','#f3f1ed'].map(c=>(
                        <button key={c} onClick={()=>setAnnoColor(c)}
                          style={{width:26,height:26,borderRadius:'50%',
                            background:c,cursor:'pointer'}}/>
                      ))}
                    </div>
                  )}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700,marginBottom:4}}>GROSOR</div>
                    <input type="range" min={2} max={16} value={annoSz} onChange={e=>setAnnoSz(Number(e.target.value))} style={{width:'100%'}}/>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={anno.undo} style={{flex:1,padding:'7px',borderRadius:8,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-sm)',fontWeight:700}}>Deshacer</button>
                    <button onClick={anno.clear} style={{flex:1,padding:'7px',borderRadius:8,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-sm)',fontWeight:700}}>Borrar todo</button>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        )}

        <div style={{position:'relative',flexShrink:0}}>
          <button ref={scrollBtnRef} onClick={()=>{
              if(!scrollOpen){
                const r=scrollBtnRef.current.getBoundingClientRect();
                const panelW=Math.min(200,window.innerWidth-24);
                const leftIdeal=r.left+(r.width/2)-(panelW/2);
                const left=Math.max(12,Math.min(leftIdeal,window.innerWidth-panelW-12));
                setScrollPos({top:r.bottom+6,left,width:panelW});
              }
              setScrollOpen(o=>!o);
            }}
            title="Autoscroll"
            style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,flexShrink:0,
              background:autoScroll?'rgba(var(--gn-rgb),.15)':'var(--s1)',
              color:autoScroll?'var(--gn)':'var(--tx3)',cursor:'pointer'}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="19 12 12 19 5 12"/><line x1="12" y1="5" x2="12" y2="19"/>
            </svg>
            <span style={{fontSize:'var(--fs-sm)',fontWeight:700,fontFamily:"var(--font-body)"}}>Scroll</span>
          </button>
          {scrollOpen&&scrollPos&&createPortal(
            <>
              <div onClick={()=>setScrollOpen(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
              <div style={{position:'fixed',top:scrollPos.top,left:scrollPos.left,width:scrollPos.width,
                background:'rgba(10,10,20,.97)',borderRadius:16,padding:14,zIndex:999,
                boxShadow:'0 8px 32px rgba(0,0,0,.8)'}}>
                <button onClick={()=>{if(!autoScroll)resetScroll();setAutoScroll(v=>!v);}}
                  style={{width:'100%',padding:'9px',borderRadius:10,marginBottom:12,
                    background:autoScroll?'var(--gn)':'var(--s1)',color:autoScroll?'#000':'var(--tx2)',
                    cursor:'pointer',fontWeight:900,fontFamily:"'Outfit',sans-serif",fontSize:'var(--fs-sm)'}}>
                  {autoScroll?'DETENER':'INICIAR AUTOSCROLL'}
                </button>
                <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700,marginBottom:4}}>VELOCIDAD</div>
                <input type="range" min={RANGO_SCROLL.min} max={RANGO_SCROLL.max} step={RANGO_SCROLL.step||1} value={scrollSpeed}
                  onChange={e=>setScrollSpeed(Number(e.target.value))} style={{width:'100%'}}/>
              </div>
            </>,
            document.body
          )}
        </div>

        {isAdmin&&(
          <div style={{position:'relative',flexShrink:0}}>
            <button ref={vivoBtnRef} onClick={()=>{
                if(!vivoOpen){
                  const r=vivoBtnRef.current.getBoundingClientRect();
                  const panelW=Math.min(260,window.innerWidth-24);
                  const leftIdeal=r.left+(r.width/2)-(panelW/2);
                  const left=Math.max(12,Math.min(leftIdeal,window.innerWidth-panelW-12));
                  setVivoPos({top:r.bottom+6,left,width:panelW});
                }
                setVivoOpen(o=>!o);
              }}
              title="Modo En Vivo"
              style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,flexShrink:0,
                background:modoVivo.sesionActiva?'rgba(var(--rd-rgb),.15)':'var(--s1)',
                color:modoVivo.sesionActiva?'var(--rd)':'var(--tx3)',cursor:'pointer'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:modoVivo.sesionActiva?'var(--rd)':'var(--tx3)',
                boxShadow:modoVivo.sesionActiva?'0 0 6px var(--rd)':'none',flexShrink:0}}/>
              <span style={{fontSize:'var(--fs-sm)',fontWeight:700,fontFamily:"var(--font-body)"}}>En Vivo</span>
            </button>
            {vivoOpen&&vivoPos&&createPortal(
              <>
                <div onClick={()=>setVivoOpen(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
                <div style={{position:'fixed',top:vivoPos.top,left:vivoPos.left,width:vivoPos.width,
                  background:'rgba(10,10,20,.97)',borderRadius:16,padding:14,zIndex:999,
                  boxShadow:'0 8px 32px rgba(0,0,0,.8)'}}>
                  {!modoVivo.sesionActiva?(
                    <button onClick={()=>{modoVivo.iniciar();setVivoOpen(false);}}
                      style={{width:'100%',padding:'9px',borderRadius:10,background:'var(--rd)',color:'#fff',cursor:'pointer',fontWeight:900,
                        fontFamily:"'Outfit',sans-serif",fontSize:'var(--fs-sm)'}}>
                      ● INICIAR MODO EN VIVO
                    </button>
                  ):(
                    <>
                      <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700,marginBottom:8,
                        textTransform:'uppercase',letterSpacing:'1px'}}>
                        Equipo ({modoVivo.participantes.filter(p=>p.estado==='aceptado').length} de {modoVivo.participantes.length||0})
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:12,maxHeight:150,overflowY:'auto'}}>
                        {modoVivo.participantes.map(p=>(
                          <div key={p.id} style={{display:'flex',alignItems:'center',gap:6,fontSize:'var(--fs-sm)',color:'var(--tx2)'}}>
                            <div style={{width:6,height:6,borderRadius:'50%',
                              background:p.estado==='aceptado'?'var(--gn)':p.estado==='rechazado'?'var(--rd)':'var(--tx3)'}}/>
                            {p.nombre}
                          </div>
                        ))}
                        {modoVivo.participantes.length===0&&(
                          <div style={{fontSize:'var(--fs-sm)',color:'var(--tx3)',fontStyle:'italic'}}>Esperando que el equipo acepte…</div>
                        )}
                      </div>
                      <button onClick={()=>{modoVivo.finalizar();setVivoOpen(false);}}
                        style={{width:'100%',padding:'9px',borderRadius:10,background:'rgba(var(--rd-rgb),.1)',color:'var(--rd)',cursor:'pointer',fontWeight:900,
                          fontFamily:"'Outfit',sans-serif",fontSize:'var(--fs-sm)'}}>
                        FINALIZAR MODO EN VIVO
                      </button>
                    </>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>
        )}

        {perm.verAcordes&&(
          <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,background:!showChords?'rgba(200,169,126,.1)':'var(--s1)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
            {showChords?tx.lyricsOnly:tx.withChords}
          </button>
        )}
        {isAdmin&&(
          <>
          {/* ── Botón "Editar" ─────────────────────────────────────────────
              Antes activaba editMode (drag-to-reposition interno de acordes,
              que Danny reportó como poco confiable). Ahora navega de vuelta
              al editor de Cancionero con la canción precargada — mismo lugar
              donde se creó la canción, con acceso al editor de acordes nuevo
              (songview/EditorAcordes.jsx) además de letra/estructura/mapa.
              onEditInCancionero es opcional: si SongView se usa en un
              contexto sin esa navegación disponible, el botón simplemente
              no se muestra (ver condición abajo) en vez de fallar en silencio. */}
          {onEditInCancionero&&(
            <button onClick={()=>onEditInCancionero(songs[idx]?.name)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,background:'rgba(200,169,126,.07)',color:'var(--ac)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {tx.edit}
            </button>
          )}
          {editMode&&editedSongs[songs[idx]?.name]&&(
            <button onClick={handleSaveEdit} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,background:'rgba(94,206,160,.15)',color:'var(--gn)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Publicar
            </button>
          )}
          </>
        )}
        
      </div>
    </div>
  );


  // ── Popup Guardar ──────────────────────────────────────────────────────────
  const PopupGuardar=()=>(
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}}>
      <div style={{background:'#111113',borderRadius:20,padding:'24px',maxWidth:300,width:'90%'}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',fontWeight:400,color:'var(--tx)',marginBottom:8}}>{tx.saveChangesLbl}</div>
        <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontFamily:"'Outfit',sans-serif",marginBottom:20,lineHeight:1.5}}>Tienes cambios sin guardar en esta canción. ¿Qué deseas hacer?</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={()=>{handleSaveEdit();setShowSavePopup(false);onClose();}} style={{padding:'11px',borderRadius:10,background:'var(--gn)',color:'#fff',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:'var(--fs-lg)'}}>{tx.saveAndExitLbl}</button>
          <button onClick={()=>{setShowSavePopup(false);onClose();}} style={{padding:'11px',borderRadius:10,background:'transparent',color:'var(--tx2)',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:'var(--fs-lg)'}}>{tx.exitWithoutSavingLbl}</button>
          <button onClick={()=>setShowSavePopup(false)} style={{padding:'8px',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontSize:'var(--fs-md)'}}>{tx.cancel}</button>
        </div>
      </div>
    </div>
  );
  // ── Popup modo bloques — solo la primera vez ──────────────────────────────
  const PopupModoBloques=()=>(
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--ov-modal)',backdropFilter:'blur(8px)'}} onClick={()=>setShowModePopup(false)}>
      <div onClick={e=>e.stopPropagation()} style={{background:'rgba(10,6,22,.97)',backdropFilter:'blur(40px)',borderRadius:20,padding:'28px 24px',maxWidth:320,width:'90%',boxShadow:'0 24px 60px rgba(0,0,0,.5)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:'var(--s1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--ac)" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>
          </div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)'}}>Vista por Bloques</div>
            <div style={{fontSize:'var(--fs-base)',color:'var(--ac)',fontWeight:700}}>Modo Pro</div>
          </div>
        </div>
        <div style={{fontSize:'var(--fs-lg)',color:'var(--tx)',lineHeight:1.6,marginBottom:16,fontFamily:"'Outfit',sans-serif"}}>
          Toda la canción <strong>en pantalla, sin scroll.</strong> Cada sección ocupa su propio espacio.
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {[['🎯',tx.linearViewBullets[0]],['📐',tx.linearViewBullets[1]],['🗺️',tx.linearViewBullets[2]],['⚡',tx.linearViewBullets[3]]].map(([ico,txt],i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:'var(--s1)',}}>
              <span style={{fontSize:'var(--fs-xl)'}}>{ico}</span>
              <span style={{fontSize:'var(--fs-md)',color:'var(--tx2)',fontFamily:"'Outfit',sans-serif",fontWeight:600}}>{txt}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>{setViewMode('bloques');setAutoScroll(false);initMapaCancion();setShowModePopup(false);try{localStorage.setItem(POPUP_SEEN_KEY,'1');}catch{}}}
          style={{width:'100%',padding:'13px',borderRadius:12,background:'var(--ac)',color:'#0a0a0a',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'var(--fs-emph)',letterSpacing:'.5px'}}>
          Activar Vista Bloques
        </button>
        <button onClick={()=>setShowModePopup(false)} style={{width:'100%',padding:'8px',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:'var(--fs-md)',marginTop:6}}>
          Cancelar
        </button>
      </div>
    </div>
  );

  // ── Toggle vista ──────────────────────────────────────────────────────────
  const ToggleVista=()=>(
    <div style={{display:'flex',gap:3,alignItems:'center',padding:'3px',borderRadius:10,background:'var(--s2)',flexShrink:0}}>
      <button onClick={()=>{
        if(viewMode!=='bloques'){
          const seen=localStorage.getItem(POPUP_SEEN_KEY);
          if(seen){setViewMode('bloques');setAutoScroll(false);initMapaCancion();}
          else setShowModePopup(true);
        }
      }} title="Vista por bloques" style={{padding:'4px 8px',borderRadius:7,background:viewMode==='bloques'?'var(--ac)':'transparent',color:viewMode==='bloques'?('#0a0a0a'):'var(--tx3)',cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
      </button>
      <button onClick={()=>{if(viewMode!=='lineal')setViewMode('lineal');}} title="Vista lineal" style={{padding:'4px 8px',borderRadius:7,background:viewMode==='lineal'?'var(--ac)':'transparent',color:viewMode==='lineal'?('#0a0a0a'):'var(--tx3)',cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="3" y1="20" x2="21" y2="20"/></svg>
      </button>
    </div>
  );

  // ── ContentArea — layout correcto con MapaMaestro sticky ─────────────────
  const ContentArea=()=>(
    <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',position:'relative'}}>
      {MapaMaestro()}
      {/* Contenedor de letra */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 10px 112px 10px',display:'flex',alignItems:'flex-start',justifyContent:'flex-start'}}>
          {song.docId
            ?<iframe src={`https://docs.google.com/document/d/${song.docId}/preview`} allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:1}}/>
            :song.partitura
            ?<div style={{width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:12,paddingTop:10}}>
                <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                  letterSpacing:'1.5px',fontFamily:"var(--font-body)"}}>Partitura · {song.partitura.nombre}</div>
                <img src={song.partitura.url} alt={song.partitura.nombre}
                  style={{maxWidth:'100%',borderRadius:14,boxShadow:'0 20px 50px rgba(0,0,0,.4)'}}/>
              </div>
            // ── BUG FIX (reportado por Danny): el canvas de anotaciones vivía
            // como hermano de este div, DENTRO del wrapper NO-scrollable de
            // afuera — quedaba anclado al viewport y no se movía con la
            // letra al hacer scroll (manual o automático). Fix: annoContainerRef
            // ahora envuelve SOLO la letra, adentro del área que sí scrollea
            // (wrapRef). Su alto natural = alto real del contenido (no el del
            // viewport), así que el canvas —posicionado absolute inset:0
            // adentro suyo— crece con la canción completa y se desplaza junto
            // con ella al hacer scroll, en vez de quedar fijo en pantalla.
            :<div ref={annoContainerRef} style={{width:'100%',position:'relative'}}>
                <div style={{width:'100%'}}>{renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,steps)=>handleDragChord(li,ci,steps),notacion,curKey)}</div>
                {perm.anotacionesPropias&&(
                  <canvas ref={anno.cvRef}
                    onPointerDown={anno.onPointerDown}
                    onPointerMove={anno.onPointerMove}
                    onPointerUp={anno.onPointerUp}
                    onPointerCancel={anno.onPointerCancel}
                    style={{position:'absolute',inset:0,zIndex:5,
                      pointerEvents:dibujoActivo?'auto':'none',
                      touchAction:dibujoActivo?'none':'auto'}}/>
                )}
              </div>
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

  // ── Motor de reproducción de multitracks (Secuencia) ──────────────────────
  // Hasta ahora los faders de multitracks (trackVols/trackMutes) eran solo
  // UI: no había ningún archivo de audio real detrás, así que mover el
  // fader o mutear no cambiaba ningún sonido. Esto conecta cada pista a un
  // elemento <audio> real, cargado localmente por el usuario (sin Firebase
  // Storage todavía — decisión explícita: esta sesión resuelve la
  // reproducción funcional, la persistencia entre sesiones queda para
  // cuando se conecte Storage). Tope de 8 pistas, no 6: cubre el caso
  // típico de banda/iglesia (click, guía, batería, bajo, 2-4 pads/coros)
  // sin la carga de un multitrack completo de 12+ pistas.
  const MAX_MULTITRACKS=8;
  const [multitracksLocal,setMultitracksLocal]=useState(null); // [{label,color,url,file}] | null — null = usar demo (seqData?.multitracks) sin audio real
  const multitrackAudioRefs=useRef([]); // array de elementos <audio> reales, uno por pista
  const [multitrackPlaying,setMultitrackPlaying]=useState(false);
  const multitrackInputRef=useRef(null);

  // ── Modo En Vivo (v90) — el líder controla play/pause de TODAS las
  // pistas para todo el equipo a la vez. esLider hoy se ata a isAdmin
  // (mismo criterio que el resto de controles de líder en la app —
  // Backstage usa isLeader=userRole==='leader'||isAdmin). Ver
  // hooks/useModoVivo.js para el motor de sincronización.
  const modoVivo=useModoVivo({accountId, esLider:isAdmin, miNombre, eventoId:null, songIndex:idx, songName:song?.name});
  const scheduledTimeoutRef=useRef(null);

  const [subiendoMultitracks,setSubiendoMultitracks]=useState(null); // {pct} | null — progreso de subida a Storage
  const [waveformReal,setWaveformReal]=useState(null); // [0-1,...] | null — picos de amplitud reales del primer track, null = usar el patrón decorativo (WAVE_DATA)

  // Decodifica el audio real de un track y extrae picos de amplitud —
  // reemplaza el waveform decorativo (Math.sin) por la forma real de la
  // canción. Acepta un File local (recién elegido en el input) o una URL
  // remota (pista ya guardada en Storage, al reabrir la canción). Se
  // calcula una sola vez por archivo, no en cada render: es trabajo de
  // CPU real (decodeAudioData de un archivo de varios MB).
  const calcularWaveformReal=async(fileOrUrl)=>{
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      const ctx=new AudioCtx();
      const buf=typeof fileOrUrl==='string'
        ?await(await fetch(fileOrUrl)).arrayBuffer()
        :await fileOrUrl.arrayBuffer();
      const audioBuf=await ctx.decodeAudioData(buf);
      const canal=audioBuf.getChannelData(0); // canal izquierdo/mono alcanza para la forma visual
      const NUM_BARRAS=80;
      const tamBloque=Math.floor(canal.length/NUM_BARRAS);
      const picos=[];
      for(let i=0;i<NUM_BARRAS;i++){
        let max=0;
        const inicio=i*tamBloque;
        for(let j=inicio;j<inicio+tamBloque&&j<canal.length;j++){
          const v=Math.abs(canal[j]);
          if(v>max)max=v;
        }
        picos.push(max);
      }
      // Normaliza para que el pico más alto llegue a 1 — evita que una
      // pista grabada bajo de volumen se vea como una línea plana.
      const maxGlobal=Math.max(...picos,0.01);
      setWaveformReal(picos.map(p=>p/maxGlobal));
      ctx.close();
    }catch(e){
      console.warn('No se pudo generar el waveform real, se usa el patrón decorativo:',e);
      setWaveformReal(null);
    }
  };

  // Reemplaza (o inicializa) los multitracks de esta canción a partir de
  // los archivos elegidos en el input de carga. El nombre de archivo sin
  // extensión se usa como label del canal — Danny pidió que el nombre del
  // fader respete el nombre real del canal, no un genérico "Pista 1".
  //
  // Ahora sube de verdad a Firebase Storage (antes solo generaba URLs
  // blob: locales que se perdían al recargar) y persiste las URLs reales
  // en archivosDB — mismo mecanismo que ya usa el track de Referencia.
  // ── Lectura de BPM desde metadata ID3 (frame TBPM) ────────────────────────
  // La mayoría de archivos de audio NO traen el BPM guardado — solo lo
  // tienen si se puso a mano en el DAW al exportar (Ableton, Logic, etc.),
  // usando tags ID3v2 (formato típico de MP3; WAV/Opus/AAC casi nunca lo
  // llevan). Parser mínimo escrito a mano en vez de agregar una librería
  // externa — solo necesitamos leer un frame (TBPM), no el tag completo.
  // Devuelve null si no hay tag ID3v2, no hay frame TBPM, o el valor no es
  // un número válido — en cualquiera de esos casos el caller debe caer a
  // TAP manual, como ya existía.
  const leerBpmDeID3=async(file)=>{
    try{
      // Alcanza con los primeros ~256KB: el header ID3v2 declara su propio
      // tamaño, pero los frames de texto (como TBPM) están casi siempre al
      // principio; si no aparece ahí, asumimos que no está.
      const head=await file.slice(0,262144).arrayBuffer();
      const bytes=new Uint8Array(head);
      // Header ID3v2: 'ID3' + versión (2 bytes) + flags (1 byte) + tamaño sincsafe (4 bytes)
      if(bytes[0]!==0x49||bytes[1]!==0x44||bytes[2]!==0x33)return null; // no es "ID3"
      const tagSize=((bytes[6]&0x7f)<<21)|((bytes[7]&0x7f)<<14)|((bytes[8]&0x7f)<<7)|(bytes[9]&0x7f);
      let pos=10;
      const fin=Math.min(10+tagSize,bytes.length);
      while(pos<fin-10){
        const frameId=String.fromCharCode(bytes[pos],bytes[pos+1],bytes[pos+2],bytes[pos+3]);
        const frameSize=(bytes[pos+4]<<24)|(bytes[pos+5]<<16)|(bytes[pos+6]<<8)|bytes[pos+7];
        if(frameSize<=0||frameSize>fin-pos)break; // frame corrupto o tamaño inválido, cortar lectura
        if(frameId==='TBPM'){
          // Frame de texto: primer byte = encoding, resto = texto del BPM
          const encoding=bytes[pos+10];
          const textBytes=bytes.slice(pos+11,pos+10+frameSize);
          const texto=encoding===1||encoding===2
            ?new TextDecoder('utf-16').decode(textBytes)
            :new TextDecoder('latin1').decode(textBytes);
          const bpm=parseInt(texto.replace(/\D/g,''),10);
          return(bpm>=40&&bpm<=300)?bpm:null; // rango razonable, descarta basura
        }
        pos+=10+frameSize;
      }
      return null;
    }catch(e){
      return null; // cualquier error de parseo: se trata igual que "no tiene BPM"
    }
  };

  // ── Carga/borrado de UN canal individual ──────────────────────────────
  // Antes solo existía "Cambiar", que reemplazaba el set completo de 8
  // pistas de una — si el músico quería corregir un solo canal (ej. subió
  // el bajo con el nombre mal, o quiere reemplazar solo el click), tenía
  // que volver a subir todo. Ahora cada canal tiene su propio botón de
  // cargar (reemplaza solo esa pista) y borrar (la saca del set, corriendo
  // el resto hacia arriba) — misma lógica de subida/Storage que
  // cargarMultitracksLocal, aplicada a un índice puntual.
  // ── Espera a que la sesión de Firebase Auth esté confirmada ────────────
  // accountId puede llegar calculado con el ID de respaldo de localStorage
  // (formato "acc_...") si App.jsx todavía no confirmó currentUser en el
  // instante en que se abrió esta canción — ese ID nunca coincide con
  // request.auth.uid en las reglas de seguridad, y la subida a Storage
  // falla con "storage/unauthorized" (bug real reportado y reproducido:
  // el accountId de las URLs de error tenía el prefijo "acc_", propio del
  // fallback, no un uid real). En vez de solo pasar la prop tal cual,
  // esto bloquea la subida hasta que authListo sea true — el usuario ve
  // un toast breve en vez de un error de permisos silencioso.
  const esperarAuthListo=async()=>{
    if(authListo)return true;
    setToast('Confirmando tu sesión…');
    for(let i=0;i<20;i++){ // hasta ~5s de espera, en pasos cortos
      await new Promise(r=>setTimeout(r,250));
      if(authListo)return true;
    }
    setToast('✕ No se pudo confirmar tu sesión — recargá la página e intentá de nuevo');
    return false;
  };

  const cargarUnCanal=async(idx,file)=>{
    const colorPrevio=multitracksLocal?.[idx]?.color||'#EE227D';
    if(!firebaseListoGlobal){
      const url=URL.createObjectURL(file);
      const prevUrl=multitracksLocal?.[idx]?.url;
      if(prevUrl&&prevUrl.startsWith('blob:'))URL.revokeObjectURL(prevUrl);
      setMultitracksLocal(prev=>{
        const next=[...(prev||[])];
        next[idx]={label:file.name.replace(/\.[^/.]+$/,''),color:colorPrevio,url,file};
        return next;
      });
      multitrackAudioRefs.current[idx]=null; // fuerza remonte del <audio> con la nueva key/url
      setToast('⚠ Firebase no configurado — este canal no va a persistir al recargar');
      return;
    }
    if(!(await esperarAuthListo()))return;
    setSubiendoMultitracks({pct:0});
    try{
      const accId=accountId||getAccountId(); // prop real (App.jsx: currentUser?.uid||getAccountId()) con fallback solo si no llegó
      const {url,path}=await subirAudio(accId,baseName,'multitracks',file,(pct)=>setSubiendoMultitracks({pct}));
      const anterior=multitracksLocal?.[idx];
      if(anterior?.path)borrarAudio(anterior.path).catch(()=>{});
      setMultitracksLocal(prev=>{
        const next=[...(prev||[])];
        next[idx]={label:file.name.replace(/\.[^/.]+$/,''),color:colorPrevio,url,path};
        setArchivosDB(prevDB=>({...prevDB,[baseName]:{...(prevDB[baseName]||{secuencia:[]}),multitracks:next}}));
        return next;
      });
      multitrackAudioRefs.current[idx]=null;
      setToast(`✓ Canal reemplazado y guardado en la nube`);
    }catch(err){
      setToast(`✕ ${err.message||'Error al subir el audio'}`);
    }finally{
      setSubiendoMultitracks(null);
    }
  };
  const borrarUnCanal=(idx)=>{
    const canal=multitracksLocal?.[idx];
    if(!canal)return;
    if(canal.path)borrarAudio(canal.path).catch(()=>{});
    else if(canal.url&&canal.url.startsWith('blob:'))URL.revokeObjectURL(canal.url);
    setMultitracksLocal(prev=>{
      const next=(prev||[]).filter((_,i)=>i!==idx);
      setArchivosDB(prevDB=>({...prevDB,[baseName]:{...(prevDB[baseName]||{secuencia:[]}),multitracks:next}}));
      return next.length?next:null;
    });
    // Corrimiento de vols/mutes para que sigan alineados con los índices tras el borrado
    setTrackVols(v=>{const n=[...v];n.splice(idx,1);n.push(80);return n;});
    setTrackMutes(m=>{const n=[...m];n.splice(idx,1);n.push(false);return n;});
    multitrackAudioRefs.current.splice(idx,1);
    setToast('✓ Canal eliminado');
  };

  const [modalConversion,setModalConversion]=useState(null); // {archivos, estimaciones} | null — abierto tras elegir archivos, antes de subir
  const [convirtiendo,setConvirtiendo]=useState(null); // {formato, pct, archivoActual, totalArchivos} | null

  // Paso 1: el usuario elige archivos → se calculan estimaciones de tamaño/
  // tiempo para MP3 y Opus (sin convertir nada todavía) y se abre el modal
  // para que elija formato con esa información a la vista.
  // Marca (o desmarca, si ya lo era) una pista como 'click' o 'guia' — el
  // resto de las pistas ('' o cualquier otro instrumento) no necesita
  // esta etiqueta. Sirve para 2 cosas: (1) Monitoreo puede mostrar un
  // fader LOCAL para esas 2 pistas específicas sin ocupar canal real de
  // la mesa (a pedido de Danny — "ahorrar canales del mixer digital"),
  // (2) referencia rápida de cuál es cuál sin depender del nombre del
  // archivo. Solo una pista puede tener cada rol a la vez (si marco otra
  // como 'click', la anterior se destilda sola).
  const marcarRolPista=(i,rol)=>{
    const aplicar=(arr)=>arr.map((t,j)=>{
      if(j===i) return {...t, rol: t.rol===rol?null:rol};
      if(t.rol===rol) return {...t, rol:null}; // solo una pista por rol
      return t;
    });
    setMultitracksLocal(prev=>{
      if(!prev) return prev;
      const next=aplicar(prev);
      setArchivosDB(prevDB=>({...prevDB,[baseName]:{...(prevDB[baseName]||{secuencia:[]}),multitracks:next}}));
      return next;
    });
  };

  const elegirMultitracksLocal=async(files)=>{
    console.log('[SetSync] cargarMultitracksLocal disparada, archivos:',files?.length);
    const arr=Array.from(files).slice(0,MAX_MULTITRACKS);
    if(!arr.length)return;
    arr.forEach(f=>console.log(`[SetSync] archivo "${f.name}": ${(f.size/1024/1024).toFixed(1)}MB`));
    console.log('[SetSync] calculando estimaciones de conversión para', arr.length, 'archivos...');
    const estimaciones=await Promise.all(arr.map(f=>estimarConversion(f)));
    console.log('[SetSync] estimaciones listas, abriendo modal:',estimaciones);
    setModalConversion({archivos:arr,estimaciones});
    console.log('[SetSync] setModalConversion llamado');
  };

  // Paso 2: con el formato elegido (o "original" para subir el WAV tal
  // cual, sin convertir), convierte si corresponde y sube — misma lógica
  // de siempre, ahora parametrizada por formato.
  const procesarYSubirMultitracks=async(arrOriginal,formato)=>{
    setModalConversion(null);
    const colores=['#EE227D','#FD8083','#30C0B7','#f59e0b','#a78bfa','#52555c','#5dcaa5','#e0a458'];
    let arr=arrOriginal;

    // BPM: si alguno de los archivos originales trae BPM en su metadata
    // ID3 (TBPM), se usa ese como control maestro — se lee del original,
    // antes de convertir, porque la conversión a Opus/MP3 no preserva
    // tags ID3.
    for(const f of arrOriginal){
      const bpmDetectado=await leerBpmDeID3(f);
      if(bpmDetectado){
        setSeqBpm(bpmDetectado);
        if(clickActivo){stopClick();startClick(bpmDetectado,seqCifra);}
        setToast(`♩ BPM ${bpmDetectado} detectado en "${f.name}"`);
        break;
      }
    }

    // Waveform real: del primer archivo, ya convertido si corresponde (o
    // el original si formato==='original').
    if(formato!=='original'){
      console.log(`[SetSync] iniciando conversión a ${formato} de ${arrOriginal.length} archivo(s)`);
      setConvirtiendo({formato,pct:0,archivoActual:1,totalArchivos:arrOriginal.length});
      try{
        const convertir=formato==='mp3'?convertirAMp3:convertirAOpus;
        const convertidos=[];
        for(let i=0;i<arrOriginal.length;i++){
          console.log(`[SetSync] convirtiendo archivo ${i+1}/${arrOriginal.length}: "${arrOriginal[i].name}"`);
          setConvirtiendo({formato,pct:0,archivoActual:i+1,totalArchivos:arrOriginal.length});
          // Timeout de seguridad: 3 minutos por archivo. Un WAV de varios
          // minutos a 59MB puede tardar bastante en decodificar+codificar
          // sin Web Worker, pero si algo se traba de verdad (memoria,
          // AudioContext que no responde), esto evita que la conversión
          // quede colgada para siempre sin nunca llegar al catch — que es
          // lo que probablemente pasó: "el mensaje desapareció y no
          // convirtió nada" sugiere que se cortó de un lado (ej. el
          // navegador mató la pestaña por considerarla no-responsiva)
          // antes de que el finally/catch de React llegara a ejecutarse.
          const out=await Promise.race([
            convertir(arrOriginal[i],(pct)=>setConvirtiendo({formato,pct,archivoActual:i+1,totalArchivos:arrOriginal.length})),
            new Promise((_,reject)=>setTimeout(()=>reject(new Error(`"${arrOriginal[i].name}" tardó demasiado en convertir (más de 3 min)`)),180000)),
          ]);
          console.log(`[SetSync] archivo ${i+1}/${arrOriginal.length} convertido OK`);
          convertidos.push(out);
        }
        arr=convertidos;
        console.log(`[SetSync] conversión completa, ${arr.length} archivo(s) listos`);
        setToast(`✓ Convertido${arr.length===1?'':'s'} a ${formato.toUpperCase()}`);
      }catch(err){
        console.error('[SetSync] ERROR durante la conversión:',err);
        setToast(`✕ Error al convertir a ${formato.toUpperCase()}: ${err.message||'desconocido'} — subiendo el archivo original`);
        arr=arrOriginal;
      }finally{
        setConvirtiendo(null);
      }
    }

    calcularWaveformReal(arr[0]);

    if(!firebaseListoGlobal){
      // Sin Firebase configurado: se sigue permitiendo trabajar en memoria
      // (útil en desarrollo local), pero se avisa que no va a persistir.
      const nuevos=arr.map((file,i)=>({label:file.name.replace(/\.[^/.]+$/,''),color:colores[i%colores.length],url:URL.createObjectURL(file),file}));
      (multitracksLocal||[]).forEach(t=>{ if(t.url&&t.url.startsWith('blob:')) URL.revokeObjectURL(t.url); });
      setMultitracksLocal(nuevos);
      setTrackVols(Array(20).fill(80));setTrackMutes(Array(20).fill(false));
      multitrackAudioRefs.current=[];
      setToast('⚠ Firebase no configurado — las pistas no van a persistir al recargar');
      return;
    }

    if(!(await esperarAuthListo()))return;
    setSubiendoMultitracks({pct:0});
    try{
      const accId=accountId||getAccountId(); // prop real (App.jsx: currentUser?.uid||getAccountId()) con fallback solo si no llegó
      const subidos=await subirAudiosMultiples(accId,baseName,'multitracks',arr,(pct)=>setSubiendoMultitracks({pct}));
      // Borra del bucket las pistas anteriores de esta canción, si había —
      // evita acumular archivos huérfanos cada vez que se reemplaza el set.
      const anteriores=archivosDB[baseName]?.multitracks||[];
      anteriores.forEach(t=>{ if(t.path) borrarAudio(t.path).catch(()=>{}); });

      const nuevos=subidos.map((s,i)=>({label:s.nombre.replace(/\.[^/.]+$/,''),color:colores[i%colores.length],url:s.url,path:s.path}));
      setArchivosDB(prev=>({...prev,[baseName]:{...(prev[baseName]||{secuencia:[]}),multitracks:nuevos}}));
      setMultitracksLocal(nuevos);
      setTrackVols(Array(20).fill(80));setTrackMutes(Array(20).fill(false));
      multitrackAudioRefs.current=[];
      setToast(`✓ ${nuevos.length} pista${nuevos.length===1?'':'s'} guardada${nuevos.length===1?'':'s'} en la nube`);
    }catch(err){
      setToast(`✕ ${err.message||'Error al subir el audio'}`);
    }finally{
      setSubiendoMultitracks(null);
    }
  };

  // Al abrir la canción, si ya hay multitracks guardados en archivosDB
  // (subidos en una sesión previa), se cargan automáticamente — mismo
  // criterio que ya usa el track de Referencia más abajo.
  useEffect(()=>{
    const guardados=archivosDB[baseName]?.multitracks;
    if(guardados&&guardados.length&&!multitracksLocal){
      setMultitracksLocal(guardados);
      calcularWaveformReal(guardados[0].url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[baseName]);


  // Play/pause de TODAS las pistas al mismo tiempo — el corazón de "deben
  // reproducirse al mismo tiempo": un solo transporte, N elementos <audio>
  // arrancados en el mismo tick, cada uno con su propio volumen/mute real
  // aplicado vía audio.volume, no solo visual.
  const toggleMultitrackPlay=()=>{
    const tracks=multitrackAudioRefs.current.filter(Boolean);
    if(!tracks.length)return;
    if(multitrackPlaying){
      tracks.forEach(a=>a.pause());
      setMultitrackPlaying(false);
    } else {
      // Sincroniza todas al mismo tiempo antes de arrancar, por si una quedó
      // desfasada de una pausa/seek anterior.
      const t=tracks[0]?.currentTime||0;
      tracks.forEach(a=>{ a.currentTime=t; });
      Promise.all(tracks.map(a=>a.play().catch(()=>{}))).then(()=>setMultitrackPlaying(true));
    }
  };
  const seekMultitracks=(time)=>{
    multitrackAudioRefs.current.filter(Boolean).forEach(a=>{ a.currentTime=time; });
  };
  // ── Control maestro de transporte ──────────────────────────────────────
  // Antes había hasta 4 botones de play/click independientes (3 copias del
  // botón de click en distintos paneles, más el play de multitracks) — cada
  // uno arrancaba su propio motor sin enterarse del otro. Danny pidió que
  // el click y el play sean LOS controles maestros: un solo transporte que
  // arranca (o para) el metrónomo Y los multitracks juntos, en el mismo
  // instante. Si no hay multitracks cargados, se comporta como el
  // metrónomo solo (comportamiento de siempre, sin romper nada).
  const toggleTransporteMaestro=()=>{
    const hayMultitracks=multitrackAudioRefs.current.some(Boolean);
    const next=!clickActivo;
    setClickActivo(next);
    if(next){
      startClick(seqBpm,seqCifra);
      if(hayMultitracks)toggleMultitrackPlay();
    } else {
      stopClick();
      if(hayMultitracks&&multitrackPlaying)toggleMultitrackPlay();
    }
  };

  // ── Modo En Vivo — ejecución local del transporte sincronizado ──────
  // Reutiliza el mismo motor de siempre (click + multitracks juntos),
  // pero llamado desde la programación de Modo En Vivo en vez de un
  // click directo del usuario. Misma seguridad de "arrancar todas las
  // pistas en el mismo tick" que ya tenía toggleMultitrackPlay.
  const ejecutarTransporte=(accion,posSeg)=>{
    const tracks=multitrackAudioRefs.current.filter(Boolean);
    if(accion==='pausar'){
      tracks.forEach(a=>{a.pause();a.currentTime=posSeg;});
      stopClick();
      setClickActivo(false);
      setMultitrackPlaying(false);
    } else { // 'arrancar_ahora'
      tracks.forEach(a=>{a.currentTime=posSeg;});
      Promise.all(tracks.map(a=>a.play().catch(()=>{}))).then(()=>setMultitrackPlaying(true));
      startClick(seqBpm,seqCifra);
      setClickActivo(true);
    }
  };

  // Reacciona a cambios en el transporte compartido (sesion.transporte) —
  // corre para TODOS los que aceptaron la sesión, incluido el líder (así
  // hay un solo camino de código para todos, sin duplicar lógica entre
  // "soy líder" y "soy participante"). calcularProgramacion es una
  // función pura, testeada aparte (ver hooks/useModoVivo.js).
  useEffect(()=>{
    if(scheduledTimeoutRef.current){clearTimeout(scheduledTimeoutRef.current);scheduledTimeoutRef.current=null;}
    if(!modoVivo.sesionActiva||!modoVivo.yaAcepte) return;
    const prog=calcularProgramacion(modoVivo.sesion?.transporte);
    if(prog.accion==='pausar'){
      ejecutarTransporte('pausar',prog.posSeg);
    } else if(prog.accion==='arrancar_ahora'){
      ejecutarTransporte('arrancar_ahora',prog.posSeg);
    } else if(prog.accion==='programar'){
      scheduledTimeoutRef.current=setTimeout(()=>ejecutarTransporte('arrancar_ahora',prog.posSeg),prog.delayMs);
    }
    return ()=>{if(scheduledTimeoutRef.current)clearTimeout(scheduledTimeoutRef.current);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[modoVivo.sesion?.transporte?.reproduciendo,modoVivo.sesion?.transporte?.tsInicioAbs,
     modoVivo.sesion?.transporte?.posBaseSeg,modoVivo.sesionActiva,modoVivo.yaAcepte]);

  // Botón de play/pause que ve el usuario: si hay una sesión En Vivo
  // activa y soy el líder, publica el cambio (todo el equipo lo recibe,
  // incluido yo mismo, vía el efecto de arriba) en vez de tocar el
  // transporte local directo. Fuera de una sesión En Vivo, comportamiento
  // de siempre, sin cambios.
  const handleTransportePress=()=>{
    if(modoVivo.sesionActiva&&isAdmin){
      const posActual=multitrackAudioRefs.current.find(Boolean)?.currentTime||0;
      if(multitrackPlaying||clickActivo) modoVivo.publicarPause(posActual);
      else modoVivo.publicarPlay(posActual);
      return;
    }
    toggleTransporteMaestro();
  };

  // Aplica volumen/mute real a cada <audio> cuando cambian los faders —
  // antes trackVols/trackMutes solo movían el knob visual.
  useEffect(()=>{
    multitrackAudioRefs.current.forEach((a,i)=>{
      if(!a)return;
      a.volume=trackMutes[i]?0:(trackVols[i]??80)/100;
    });
  },[trackVols,trackMutes]);
  // Avanza el playhead visual (seqPos, 0–1) mientras las pistas reproducen,
  // leyendo currentTime/duration de la primera pista como referencia de
  // tiempo — antes seqPos solo cambiaba con un seek manual, el waveform no
  // avanzaba solo durante la reproducción real.
  useEffect(()=>{
    if(!multitrackPlaying)return;
    const iv=setInterval(()=>{
      const primeraPista=multitrackAudioRefs.current.find(Boolean);
      if(primeraPista&&primeraPista.duration){
        setSeqPos(primeraPista.currentTime/primeraPista.duration);
      }
    },100);
    return ()=>clearInterval(iv);
  },[multitrackPlaying]);

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
  // Ref: último momento en que NOSOTROS empujamos un valor de fader a la
  // mesa, por canal. La mesa (X32/M32 vía OSC) a veces responde con un eco
  // del valor ANTERIOR antes de confirmar el nuestro (latencia de red +
  // el refresh periódico de /xremote) — sin esto, ese eco pisaba el valor
  // recién puesto por el usuario apenas soltaba el dedo, y el fader
  // "volvía a su posición inicial" aunque el drag en sí funcionara bien.
  const lastLocalFaderWrite=useRef({});

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
          const lastWrite=lastLocalFaderWrite.current[ci];
          if(lastWrite&&Date.now()-lastWrite<600) return; // eco de nuestro propio cambio reciente — ignorar
          setFaderVols(prev=>{const n=[...prev];n[ci]=Math.round(v*100);return n;});
        });
        const subM=driver.onMuteChange(monitorBus, ci+1, m=>{
          setFaderMutes(prev=>{const n=[...prev];n[ci]=m;return n;});
        });
        mesaSubsRef.current.push(subF,subM);
      });
    }catch(err){
      setMesaErrorMsg(err.message||tx.couldNotConnectLbl);
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

  // Icono Monitor: headphone + WiFi arcs — verde con glow cuando conectado.
  // Vive acá (nivel de SongView, no dentro de BottomTabBar) porque tanto
  // BottomTabBar como MonitorPanel lo necesitan — declararlo dentro de
  // BottomTabBar lo dejaba invisible para MonitorPanel (ReferenceError:
  // IconMonitor is not defined, pantalla negra en la pestaña Monitor).
  const IconMonitor=({active,size=22})=>{
    const connected = mesaConectada;
    const col = connected?'var(--gn)':active?'var(--ac)':'var(--tx3)';
    return(
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
        style={connected?{filter:'drop-shadow(0 0 5px rgba(var(--gn-rgb),.9)) drop-shadow(0 0 10px rgba(var(--gn-rgb),.5))'}:{}}>
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

  // ── Barra de pestañas inferior (Letra / Monitor / Secuencia) + Nav ──────
  const BottomTabBar=()=>{
    const canPrev = idx > 0;
    const isLast  = idx === songs.length - 1;

    // Icono Secuencia: soundwave (SVG inline) — a pedido de Danny, vuelve
    // a ser el ícono de onda de audio que tenía antes (se había reemplazado
    // por el logo PNG /logo secuencias.png). Mismo lenguaje visual que
    // IconMonitor: color según estado activo, sin dependencias externas.
    const IconSecuencia=({active,size=22})=>{
      const col=active?'var(--ac)':'var(--tx3)';
      // Alturas de barras — pico simétrico al centro, como una onda de audio.
      const barras=[
        {x:2, y1:10,y2:14},{x:6, y1:6, y2:18},{x:10,y1:9, y2:15},
        {x:14,y1:3, y2:21},{x:18,y1:7, y2:17},{x:22,y1:10,y2:14},
      ];
      return(
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          {barras.map(({x,y1,y2})=>(
            <line key={x} x1={x} y1={y1} x2={x} y2={y2}
              stroke={col} strokeWidth="2" strokeLinecap="round"
              opacity={active?1:.75}/>
          ))}
        </svg>
      );
    };

    const tabs=[
      {id:'referencia',label:tx.referenceTabLbl,renderIcon:(a)=>(<IconSecuencia active={a}/>)},
      {id:'monitor', label:tx.monitorTabLbl,  renderIcon:(a)=>IconMonitor({active:a})},
      {id:'secuencia',label:tx.sequenceTabLbl,renderIcon:(a)=>(
        <div style={{width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <img src="/logo referencias.svg" alt="" style={{width:'88%',height:'88%',objectFit:'contain',
            opacity:a?1:.55,transition:'opacity .15s'}}/>
        </div>
      )},
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
        <button onClick={()=>canPrev&&setIdx(i=>Math.max(i-1,0))} disabled={!canPrev}
          style={{
            flex:1,margin:'6px 3px',borderRadius:9,
            background:'var(--s1)',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
            padding:'4px 0',
            color:canPrev?'var(--tx)':'var(--bd2)',
            cursor:canPrev?'pointer':'default',transition:'all .15s',
            fontFamily:"var(--font-body)",
          }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={canPrev?'var(--tx)':'var(--bd2)'} strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-2xs)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'inherit'}}>Ant</span>
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
              flex:1,margin:'6px 3px',borderRadius:9,
              background:'var(--s1)',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
              padding:'4px 0',
              color: isOn?'var(--ac)':mesaConectada&&tab.id==='monitor'?'var(--gn)':'var(--tx3)',
              cursor:'pointer',transition:'all .15s',
              fontFamily:"var(--font-body)",
            }}>
              <span style={{display:'flex',alignItems:'center'}}>{tab.renderIcon(isOn)}</span>
              <span style={{fontSize:'var(--fs-2xs)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'inherit'}}>{tab.label}</span>
            </button>
          );
        })}

        {/* Siguiente → */}
        <button onClick={()=>{ if(isLast) onClose(); else setIdx(i=>Math.min(i+1,songs.length-1)); }}
          style={{
            flex:1,margin:'6px 3px',borderRadius:9,
            background:'var(--s1)',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
            padding:'4px 0',
            color:isLast?'var(--rd)':'var(--gn)',
            cursor:'pointer',transition:'all .15s',
            fontFamily:"var(--font-body)",
          }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={isLast?'var(--rd)':'var(--gn)'} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{fontSize:'var(--fs-2xs)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'inherit'}}>
            {isLast?'Fin':'Sig'}
          </span>
        </button>
      </div>
    );
  };

  // ── Datos de secuencia precargados por canción ────────────────────────────
  const SECUENCIA_DATA={
    'YESHUA':{
      click:{bpm:130,compas:'4/4',intro:4,activo:false},
      guias:[
        {label:'Intro',compases:4,color:'var(--gn)'},
        {label:'Verso 1',compases:8,color:'#a78bfa'},
        {label:'Pre-Coro',compases:4,color:'#f59e0b'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Verso 2',compases:8,color:'#a78bfa'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Bridge',compases:8,color:'var(--gn)'},
        {label:'Final',compases:4,color:'#52555c'},
      ],
      pads:['Calmo','Expectante','Poderoso','Cierre'],
      multitracks:[
        {label:'Guía vocal',color:'#EE227D'},
        {label:'Click/Perc',color:'var(--rd)'},
        {label:'Keys pad',color:'var(--gn)'},
        {label:'Brass',color:'#f59e0b'},
        {label:'Guitarra',color:'#a78bfa'},
        {label:'Bajo',color:'#52555c'},
      ],
    },
    'GLORIA EN GLORIA':{
      click:{bpm:86,compas:'6/8',intro:8,activo:false},
      guias:[
        {label:'Intro',compases:8,color:'var(--gn)'},
        {label:'Verso 1',compases:8,color:'#a78bfa'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Verso 2',compases:8,color:'#a78bfa'},
        {label:'Coro',compases:8,color:'#EE227D'},
        {label:'Bridge x2',compases:16,color:'var(--gn)'},
        {label:'Coro Final',compases:8,color:'#EE227D'},
      ],
      pads:['Calmo','Ascendente','Gloria','Outro'],
      multitracks:[
        {label:'Guía vocal',color:'#EE227D'},
        {label:'Click 6/8',color:'var(--rd)'},
        {label:'Strings',color:'var(--gn)'},
        {label:'Guitarra',color:'#a78bfa'},
        {label:'Bajo',color:'#52555c'},
        {label:'Coros',color:'#f59e0b'},
      ],
    },
  };
  // seqData: primero busca en estructurasDB (configurado desde el editor de
  // carga manual de Cancionero — datos reales del usuario), y hace fallback
  // a SECUENCIA_DATA solo para las canciones de demo que todavía no tienen
  // datos guardados. Esto conecta el editor de carga con MapaMaestro.
  const seqData = estructurasDB[song?.name] || SECUENCIA_DATA[song?.name] || null;
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
  const suppressNextWheelSync=useRef(false); // true cuando quien cambió seqBpm ya posicionó la rueda a mano (tap tempo) — evita que el efecto sincronizador la vuelva a mover y corte la animación smooth a medio camino
  const scrollWheelTo=useCallback((bpm,smooth=false)=>{
    const el=wheelRef.current;
    if(!el)return;
    const target=(Math.max(BPM_MIN,Math.min(BPM_MAX,bpm))-BPM_MIN)*WHEEL_ITEM_H;
    // Si la rueda ya está (o casi) en la posición correcta, no la toquemos — esto es
    // exactamente lo que pasa cuando el propio usuario la arrastró: forzar un
    // scrollTo acá pelea con el scroll nativo y se siente como que "no responde
    // bien al tacto". Solo corregimos cuando el cambio vino de afuera (canción
    // nueva, tap tempo).
    if(Math.abs(el.scrollTop-target)<1)return;
    wheelSyncing.current=true;
    el.scrollTo({top:target,behavior:smooth?'smooth':'auto'});
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
  // rueda misma, así que es seguro correrlo siempre. useLayoutEffect (no
  // useEffect) para que la corrección ocurra ANTES del primer pintado:
  // con useEffect alcanzaba a pintarse un frame con la rueda en su
  // posición nativa de scrollTop=0 (que visualmente muestra "40", por ser
  // BPM_MIN) antes de saltar al bpm real de la canción — ese destello es
  // el "no parte bien en 40" que se reportó.
  useLayoutEffect(()=>{
    if(suppressNextWheelSync.current){suppressNextWheelSync.current=false;return;}
    scrollWheelTo(seqBpm);
  },[seqBpm,scrollWheelTo]);

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
        suppressNextWheelSync.current=true;
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
    // Si las guías tienen compases, úsalos para el ancho proporcional.
    // Si no (datos del nuevo editor sin compases), distribuir en partes iguales.
    const tieneCompases=guias.some(g=>g.compases&&g.compases>1);
    const totalComp = tieneCompases
      ? guias.reduce((s,g)=>s+(g.compases||4),0)
      : guias.length * 4; // ficticio — todos iguales
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
          const label=g.abrev||(isTablet?g.label:abrev(g.label));
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
                padding:'0 2px',cursor:'pointer',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                gap:1,
                background:isActive?`${g.color}18`:'transparent',
                borderBottom:isActive?`2px solid ${g.color}`:'2px solid transparent',
                transition:'all .15s',flexShrink:0,
              }}>
              <span style={{
                fontSize:'var(--fs-2xs)',fontWeight:900,
                color:isActive?g.color:`${g.color}cc`,
                fontFamily:"var(--font-body)",
                textTransform:'uppercase',lineHeight:1,
              }}>{label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const ClickPanel=()=>(
    <div>
      <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10,fontFamily:"var(--font-body)"}}>Click · Metrónomo</div>
      <div style={{borderRadius:14,background:'var(--s1)',padding:'12px 14px',display:'flex',flexDirection:'column',gap:12}}>        {/* Fila 1: BPM + Play */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {/* BPM */}
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
            <button onClick={()=>{const v=Math.max(40,seqBpm-1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}}}
              style={{width:32,height:32,borderRadius:8,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-xl)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
              <input
                type="number" min="40" max="300"
                value={seqBpm}
                onChange={e=>{const v=Math.max(40,Math.min(300,Number(e.target.value)||120));setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}}}
                style={{width:'100%',maxWidth:90,textAlign:'center',
                  fontFamily:"var(--font-display)",
                  fontSize:'var(--fs-4xl)',color:clickActivo?'var(--gn)':'var(--ac)',
                  background:'transparent',outline:'none',
                  WebkitAppearance:'none',MozAppearance:'textfield',
                  lineHeight:1,display:'block'}}
              />
              <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",fontWeight:700,marginTop:2}}>BPM</span>
            </div>
            <button onClick={()=>{const v=Math.min(300,seqBpm+1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}}}
              style={{width:32,height:32,borderRadius:8,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-xl)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
          </div>
          {/* Play/Stop — control maestro, mismo transporte que Secuencia */}
          <button onClick={handleTransportePress}
            style={{width:52,height:52,borderRadius:'50%',flexShrink:0,
              background:clickActivo?'var(--rd)':'var(--gn)',color:'#000',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',
              boxShadow:clickActivo?'0 0 20px rgba(var(--rd-rgb),.5)':'0 0 20px rgba(var(--gn-rgb),.3)'}}>
            {clickActivo
              ?<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              :<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          </button>
        </div>
        {/* Fila 2: Cifra como selector */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",fontWeight:700,flexShrink:0}}>CIFRA</span>
          <CustomSelect
            value={seqCifra}
            onChange={c=>{
              setSeqCifra(c);
              // Reiniciar click con nueva cifra si está activo
              if(clickActivo){ stopClick(); startClick(seqBpm,c); }
            }}
            options={CIFRAS.map(c=>({value:c,label:c}))}
            style={{flex:1,padding:'8px 12px',borderRadius:10,color:'var(--ac)',
              fontSize:'var(--fs-xl)',fontWeight:700,fontFamily:"var(--font-display)"}}/>
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
          padding:18,borderRadius:16,background:'var(--bg)',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',color:'var(--tx)',fontWeight:400}}>{baseName}</div>
            <button onClick={()=>setShowCarpeta(false)} style={{background:'none',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-xl)',lineHeight:1}}>×</button>
          </div>

          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"var(--font-body)",marginBottom:8}}>{tx.originalLbl}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'var(--s1)',marginBottom:14}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span style={{fontSize:'var(--fs-base)',color:'var(--tx2)'}}>{tx.lyricsAndChordsLbl}</span>
          </div>

          {vars.length>0&&(
            <>
              <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"var(--font-body)",marginBottom:8}}>Variaciones · {vars.length}</div>
              {vars.map(v=>(
                <div key={v.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'rgba(200,169,126,.06)',marginBottom:5}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ac)" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span style={{fontSize:'var(--fs-base)',color:'var(--ac)'}}>{v.label}</span>
                </div>
              ))}
              <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginBottom:14,fontStyle:'italic'}}>Se abren desde Cancionero — cierra esta canción y vuelve a entrar eligiendo la variación.</div>
            </>
          )}

          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"var(--font-body)",marginBottom:8}}>Secuencia · {(carpetaActual.secuencia||[]).length}</div>
          {(carpetaActual.secuencia||[]).length>0&&(
            <div style={{marginBottom:8}}>
              {carpetaActual.secuencia.map(sq=>(
                <div key={sq.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'var(--s1)',marginBottom:5}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  <span style={{fontSize:'var(--fs-base)',color:'var(--tx2)',flex:1,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{sq.nombre}</span>
                  <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)'}}>{sq.size}</span>
                </div>
              ))}
            </div>
          )}
          {isAdmin?(
            <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              padding:'9px 12px',borderRadius:10,background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,
              fontFamily:"var(--font-body)",marginBottom:14}}>
              <input type="file" accept="audio/*" style={{display:'none'}}
                onChange={e=>{agregarSecuenciaDesdeCarpeta(e.target.files[0]);e.target.value='';}}/>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--tx3)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              + Subir track de secuencia
            </label>
          ):((carpetaActual.secuencia||[]).length===0&&(
            <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontStyle:'italic',marginBottom:14}}>{tx.noTracksYetShort}</div>
          ))}

          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"var(--font-body)",marginBottom:8}}>{tx.referenceTrackLbl}</div>
          {carpetaActual.trackReferencia?(
            <button onClick={()=>{setBottomTab('referencia');setRefTab('track');setShowCarpeta(false);}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,
                background:'rgba(var(--gn-rgb),.1)',cursor:'pointer',textAlign:'left'}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <span style={{fontSize:'var(--fs-base)',color:'var(--gn)',flex:1,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{carpetaActual.trackReferencia.nombre}</span>
            </button>
          ):(
            <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontStyle:'italic',marginBottom:14}}>Sin track — se sube o graba desde la pestaña Referencia.</div>
          )}

          {/* ── Nota tipo post-it ── */}
          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"var(--font-body)",marginTop:14,marginBottom:8}}>{tx.noteLbl}</div>
          <div style={{position:'relative'}}>
            <textarea value={notaCarpeta} onChange={e=>setNotaCarpeta(e.target.value)}
              placeholder="Ej: tocar con capo 2, pedir a Juan que suba una tercera en el coro, ojo con el cambio de compás en el puente..."
              style={{width:'100%',minHeight:80,padding:'10px 12px',borderRadius:10,resize:'vertical',
                background:'rgba(234,203,113,.05)',
                color:'var(--tx)',fontSize:'var(--fs-base)',fontFamily:"var(--font-body)",lineHeight:1.5,
                outline:'none',boxSizing:'border-box'}}/>
          </div>
          <button onClick={guardarNotaCarpeta}
            style={{width:'100%',marginTop:6,padding:'8px 0',borderRadius:8,cursor:'pointer',
              fontSize:'var(--fs-sm)',fontWeight:900,fontFamily:"var(--font-body)",
              background:notaCarpetaGuardada?'var(--gn)':'var(--s3)',
              color:notaCarpetaGuardada?'#000':'var(--tx3)',transition:'all .2s'}}>
            {notaCarpetaGuardada?tx.savedCheckLbl:tx.saveNoteLbl}
          </button>
        </div>
      </div>
    ), document.body);
  };

  const MonitorPanel=() => {
    const trackH=140; // fijo, compartido por Monitoreo y Secuencia — mismo alto en ambos. Subido varias veces a pedido de Danny (95→105→130→140).

    const panel = (
      <div
        onTouchStart={e=>e.stopPropagation()}
        onTouchMove={e=>e.stopPropagation()}
        style={{position:'fixed',bottom:'calc(54px + env(safe-area-inset-bottom,0px))',left:0,right:0,
          background:'rgba(8,8,9,.98)',border:'2px solid var(--gn)',borderBottom:'none',
          borderRadius:'14px 14px 0 0',
          backdropFilter:'blur(40px)',zIndex:200,
          transform:(bottomTab==='monitor'&&showMonitor)?'translateY(0)':'translateY(110%)',
          transition:'transform .3s cubic-bezier(.4,0,.2,1)',
          display:'flex',flexDirection:'column',
          maxHeight:'70vh',
        }}>

        {/* Título del bloque */}
        <div style={{padding:'10px 14px 6px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:10,width:'100%'}}>
            <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)',flexShrink:0}}>{tx.monitorTabLbl}</span>
            <span style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontWeight:300,fontFamily:"var(--font-body)",flex:1,minWidth:0,lineHeight:1.3}}>{tx.wifiHintLbl}</span>
          </div>
        </div>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',
          borderBottom:'1px solid var(--s3)',flexShrink:0}}>
          <button onClick={()=>setShowConectarMesa(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0,cursor:'pointer',textAlign:'left',
              borderRadius:10,padding:mesaConectada||mesaEstado==='conectando'?0:'7px 12px',
              background:mesaConectada||mesaEstado==='conectando'?'none':'rgba(var(--gn-rgb),.1)'}}>
            <span style={{display:'flex',alignItems:'center',flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gn)" strokeWidth="2" strokeLinecap="round">
                <path d="M2 8.5a15.3 15.3 0 0 1 20 0"/>
                <path d="M5.5 12.5a10.3 10.3 0 0 1 13 0"/>
                <path d="M9 16.5a5.2 5.2 0 0 1 6 0"/>
                <circle cx="12" cy="20" r="1" fill="var(--gn)" stroke="none"/>
              </svg>
            </span>
            <div style={{flex:1,fontSize:'var(--fs-xs)',fontWeight:700,color:mesaConectada?'var(--gn)':mesaEstado==='conectando'?'#e0a458':'var(--gn)',
              fontFamily:"var(--font-body)",textTransform:'uppercase',letterSpacing:'1px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
              {mesaConectada?tx.connectedToLbl(mesaNombre):mesaEstado==='conectando'?tx.connectingLbl:tx.tapToConnectLbl}
            </div>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:4,height:26,width:64}}>
            <span style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",flexShrink:0}}>Bus</span>
            <CustomSelect value={monitorBus} onChange={v=>setMonitorBus(Number(v))}
              options={[1,2,3,4].map(b=>({value:b,label:String(b)}))}
              style={{height:26,padding:'0 6px',fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--gn)'}}/>
          </div>
          {!isTablet&&(
            <div style={{display:'inline-flex',height:26,borderRadius:10,overflow:'hidden'}}>
              {['A','B'].map(l=>(
                <button key={l} onClick={()=>setMonitorLayer(l)}
                  style={{padding:'0 10px',height:'100%',cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:700,
                    fontFamily:"var(--font-body)",boxSizing:'border-box',
                    background:monitorLayer===l?'rgba(var(--gn-rgb),.25)':'transparent',
                    color:monitorLayer===l?'var(--gn)':'var(--tx3)'}}>
                  {l}
                </button>
              ))}
            </div>
          )}
          <button onClick={()=>setShowMonitor(false)}
            style={{width:26,height:26,borderRadius:6,background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-emph)',
              display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,
              boxSizing:'border-box',flexShrink:0}}>×</button>
        </div>

        {/* Panel de conexión — marca + IP (v36/v37-ampliación) */}
        {showConectarMesa&&(
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--s3)',
            display:'flex',flexDirection:'column',gap:8,flexShrink:0,background:'var(--s1)'}}>
            <CustomSelect value={mesaMarca} onChange={v=>{setMesaMarca(v);setMesaErrorMsg(null);}}
              disabled={mesaConectada}
              options={MARCAS_MESA.map(m=>({value:m.id,label:`${m.nombre}${m.disponible?'':' — próximamente'}`}))}
              style={{padding:'7px 9px',fontSize:'var(--fs-sm)'}}/>
            <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}>
              {MARCAS_MESA.find(m=>m.id===mesaMarca)?.modelos}
            </div>
            {MARCAS_MESA.find(m=>m.id===mesaMarca)?.puente&&(
              <div style={{fontSize:'var(--fs-hint)',color:'#e0a458',fontFamily:"var(--font-body)",lineHeight:1.5,
                padding:'7px 9px',borderRadius:8,background:'rgba(224,164,88,.08)',}}>
                Esta mesa necesita un puente corriendo en un notebook de la misma red (no se conecta directo). Ingresa la IP de ESE notebook, no la de la mesa.
              </div>
            )}
            <div style={{display:'flex',gap:6}}>
              <input value={mesaIP} onChange={e=>setMesaIP(e.target.value)} disabled={mesaConectada}
                placeholder={MARCAS_MESA.find(m=>m.id===mesaMarca)?.puente?'IP del puente (ej: 192.168.1.50:8080)':'IP de la mesa (ej: 10.10.1.1)'}
                style={{flex:1,padding:'7px 9px',borderRadius:8,background:'#111',color:'var(--tx)',fontSize:'var(--fs-sm)',fontFamily:"var(--font-body)"}}/>
              {mesaConectada?(
                <button onClick={desconectarMesa}
                  style={{padding:'7px 14px',borderRadius:8,background:'rgba(var(--rd-rgb),.15)',
                    color:'var(--rd)',cursor:'pointer',fontSize:'var(--fs-sm)',fontWeight:900,fontFamily:"var(--font-body)"}}>
                  Desconectar
                </button>
              ):(
                <button onClick={conectarMesa} disabled={mesaEstado==='conectando'}
                  style={{padding:'7px 14px',borderRadius:8,background:mesaEstado==='conectando'?'var(--bd)':'var(--ac)',
                    color:mesaEstado==='conectando'?'var(--tx3)':'#000',cursor:mesaEstado==='conectando'?'not-allowed':'pointer',
                    fontSize:'var(--fs-sm)',fontWeight:900,fontFamily:"var(--font-body)"}}>
                  {mesaEstado==='conectando'?tx.connectingLbl:tx.connectBtn}
                </button>
              )}
            </div>
            {mesaErrorMsg&&(
              <div style={{fontSize:'var(--fs-xs)',color:'var(--rd)',fontFamily:"var(--font-body)",lineHeight:1.4}}>{mesaErrorMsg}</div>
            )}
          </div>
        )}

        {/* ── Click y Guía — canales LOCALES, sin ir a la mesa ──────────
            A pedido de Danny: en vez de que Click/Guía viajen por cable
            hacia la mesa y vuelvan por el monitor (consumiendo 2 canales
            reales), cada músico los ajusta acá mismo, en su propio
            celular — mismo trackVols/trackMutes que ya usa el fader de
            Secuencia (literalmente el mismo estado, no una copia), así
            que mover esto es lo mismo que moverlo allá. Solo aparece si
            alguna pista fue marcada como Click o Guía en Secuencia. */}
        {(()=>{
          const tracks=multitracksLocal||seqData.multitracks||[];
          const pistaClick=tracks.map((t,i)=>({...t,i})).find(t=>t.rol==='click');
          const pistaGuia=tracks.map((t,i)=>({...t,i})).find(t=>t.rol==='guia');
          if(!pistaClick&&!pistaGuia) return null;
          return(
            <div style={{padding:'10px 12px',margin:'0 8px 10px',borderRadius:10,
              background:'rgba(200,169,126,.05)'}}>
              <div style={{fontSize:'var(--fs-2xs)',fontWeight:900,color:'var(--ac)',textTransform:'uppercase',
                letterSpacing:'1px',marginBottom:2}}>🎧 Click y Guía — solo en este dispositivo</div>
              <div style={{fontSize:'var(--fs-3xs)',color:'var(--tx3)',marginBottom:8,lineHeight:1.4}}>
                No ocupan canal de la mesa — cada uno los ajusta acá, en su propio dispositivo.
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[pistaClick,pistaGuia].filter(Boolean).map(p=>(
                  <div key={p.i} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--tx)',width:44,flexShrink:0}}>
                      {p.rol==='click'?'Click':'Guía'}
                    </span>
                    <input type="range" min={0} max={100} value={trackVols[p.i]??80}
                      onChange={e=>setTrackVols(v=>{const n=[...v];n[p.i]=Number(e.target.value);return n;})}
                      style={{flex:1}}/>
                    <button onClick={()=>setTrackMutes(m=>{const n=[...m];n[p.i]=!n[p.i];return n;})}
                      style={{padding:'3px 8px',borderRadius:6,cursor:'pointer',flexShrink:0,
                        fontSize:'var(--fs-3xs)',fontWeight:900,fontFamily:"var(--font-body)",
                        background:trackMutes[p.i]?'#8B0000':'var(--s3)',
                        color:trackMutes[p.i]?'#fff':'var(--tx3)'}}>MUTE</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Grid de faders — 8 canales (con selector de capa A/B) en móvil,
            los 16 juntos cuando hay espacio horizontal real (tablet
            horizontal / PC) — pedido explícito de Danny: "cuando está en
            horizontal, los 16 canales tienen que estar en la pantalla". */}
        <div style={{flex:1,display:'flex',gap:2,padding:'6px 8px 8px',overflow:'hidden',minHeight:0}}>
          {Array.from({length:isTablet?16:8},(_,li)=>{
            const ci=isTablet?li:(monitorLayer==='A'?li:li+8);
            const vol=faderVols[ci];
            const muted=faderMutes[ci];
            const dbStr=volToDB(muted?0:vol);
            const vuLit=muted?0:Math.round((vol/100)*12);
            return(
              <div key={ci} style={{
                flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                gap:2,minWidth:0,padding:'4px 2px 4px',borderRadius:6,
                background:muted?'rgba(var(--rd-rgb),.06)':'var(--s1)',
                overflow:'visible',
              }}>
                <div style={{fontSize:'var(--fs-3xs)',fontWeight:700,
                  color:muted?'var(--rd)':vol>90?'var(--rd)':vol>75?'#f59e0b':'var(--tx)',
                  fontFamily:"var(--font-body)",letterSpacing:'.3px',
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
                        fontSize:'var(--fs-3xs)',color:'var(--em)',
                        fontFamily:"var(--font-body)",
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
                          const col=si>=10?'var(--rd)':si>=8?'#f59e0b':'var(--gn)';
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
                        cursor:'grab',
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
                          knob.removeEventListener('pointercancel',up);
                          // Solo actualizar React state al soltar
                          setFaderVols(v=>{const n=[...v];n[ci]=curVol;return n;});
                          // Envía el valor real a la mesa conectada (v36-ampliación)
                          if(mesaConectada){
                            lastLocalFaderWrite.current[ci]=Date.now();
                            mesaDriverRef.current?.setFaderLevel(monitorBus, ci+1, curVol/100);
                          }
                        };
                        knob.addEventListener('pointermove',move,{passive:false});
                        knob.addEventListener('pointerup',up,{once:true});
                        // pointercancel: el navegador puede cancelar el puntero por
                        // conflicto de gestos táctiles (pasa seguido en touch). Sin
                        // este handler, 'up' nunca se dispara, el estado de React
                        // nunca se actualiza con curVol, y en el próximo render por
                        // cualquier otro motivo el knob "salta de vuelta" a su
                        // posición anterior — exactamente el bug reportado.
                        knob.addEventListener('pointercancel',up,{once:true});
                      }}>
                        <div style={{position:'absolute',top:'50%',left:'50%',
                          transform:'translate(-50%,-50%)',
                          width:'60%',height:2,background:'rgba(0,0,0,.4)',borderRadius:1,
                          boxShadow:'0 -5px 0 rgba(0,0,0,.3),0 5px 0 rgba(0,0,0,.3),0 -10px 0 rgba(0,0,0,.15),0 10px 0 rgba(0,0,0,.15)'}}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{fontSize:'var(--fs-3xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",
                  fontWeight:700,flexShrink:0,letterSpacing:'.5px'}}>CH {ci+1}</div>
                <button onClick={e=>{
                  e.stopPropagation();
                  setFaderMutes(m=>{const n=[...m];n[ci]=!n[ci];
                    if(mesaConectada) mesaDriverRef.current?.setMute(monitorBus, ci+1, n[ci]);
                    return n;});
                }} style={{
                  width:'100%',padding:'3px 0',borderRadius:4,cursor:'pointer',
                  flexShrink:0,
                  background:muted?'#8B0000':'var(--s3)',
                  color:muted?'#ff4444':'var(--tx3)',
                  fontSize:'var(--fs-3xs)',fontWeight:900,fontFamily:"var(--font-body)",
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

  const [subiendoReferencia,setSubiendoReferencia]=useState(null); // {pct} | null

  const loadFile=async(file)=>{
    if(refUrl&&refUrl.startsWith('blob:')) URL.revokeObjectURL(refUrl);
    // Muestra el audio de inmediato con blob local (feedback instantáneo,
    // no hace esperar la subida para poder escuchar), y en paralelo sube
    // a Storage para que persista — al terminar, reemplaza la URL blob
    // por la URL real y persistente.
    const blobUrl=URL.createObjectURL(file);
    setRefAudio(file);
    setRefUrl(blobUrl);
    setRefPlaying(false);
    setRefTime(0);
    setRefDuration(0);
    setRefLoopIn(null);
    setRefLoopOut(null);
    setRefLooping(false);
    const esMp3=file.type.includes('mpeg')||file.name.toLowerCase().endsWith('.mp3');
    setToast(esMp3?'Cargando... (MP3 se recomienda convertir a Opus/AAC para menor peso)':'Cargando...');

    if(!firebaseListoGlobal){
      setArchivosDB(prev=>({...prev,[baseName]:{...(prev[baseName]||{secuencia:[]}),
        trackReferencia:{url:blobUrl,nombre:file.name,fecha:new Date(),origen:'subido'}}}));
      setToast('⚠ Firebase no configurado — el track no va a persistir al recargar');
      return;
    }
    if(!(await esperarAuthListo()))return;
    setSubiendoReferencia({pct:0});
    try{
      const accId=accountId||getAccountId(); // prop real (App.jsx: currentUser?.uid||getAccountId()) con fallback solo si no llegó
      const anterior=archivosDB[baseName]?.trackReferencia;
      const {url,path}=await subirAudio(accId,baseName,'referencia',file,(pct)=>setSubiendoReferencia({pct}));
      if(anterior?.path) borrarAudio(anterior.path).catch(()=>{});
      setArchivosDB(prev=>({...prev,[baseName]:{...(prev[baseName]||{secuencia:[]}),
        trackReferencia:{url,path,nombre:file.name,fecha:new Date(),origen:'subido'}}}));
      setToast('✓ Track guardado en la nube');
    }catch(err){
      setToast(`✕ ${err.message||'Error al subir el audio'}`);
    }finally{
      setSubiendoReferencia(null);
    }
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
      setRecordError(tx.deviceNoRecordingSupport);
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
        ensayoNombre:ensayo?.nombre||tx.rehearsalLbl,
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
          background:'rgba(8,8,9,.98)',border:'2px solid var(--gn)',borderBottom:'none',
          borderRadius:'14px 14px 0 0',
          backdropFilter:'blur(40px)',zIndex:110,
          transform:bottomTab==='referencia'?'translateY(0)':'translateY(100%)',
          transition:'transform .3s cubic-bezier(.4,0,.2,1)',
          display:'flex',flexDirection:'column',
          maxHeight:'62vh',
        }}>
          {/* Header */}
          <div style={{padding:'10px 14px 8px',flexShrink:0,borderBottom:'1px solid var(--s3)'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:10,width:'100%'}}>
              <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)',flexShrink:0}}>
                {tx.referenceTabLbl}
              </span>
              <span style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontWeight:300,fontFamily:"var(--font-body)",flex:1,minWidth:0,lineHeight:1.3}}>{tx.referenceSubLbl}</span>
            </div>
            <input ref={refInputRef} type="file" accept="audio/*" style={{display:'none'}}
              onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0]);}}/>
            <div style={{marginTop:4,display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:'1 1 auto',minWidth:0}}>
                <div style={{fontSize:'var(--fs-hint)',color:'#e0a458',fontWeight:400,fontFamily:"var(--font-body)",lineHeight:1.3}}>{tx.micInterfaceHintLbl}</div>
              </div>
            </div>
          </div>

          {/* Sub-tabs Capa 1 (Track) / Capa 2 (Grabaciones) — v36 */}
          <div style={{display:'flex',gap:6,padding:'8px 14px 0',flexShrink:0}}>
            <button onClick={()=>setRefTab('track')}
              style={{flex:1,padding:'7px 0',borderRadius:9,cursor:'pointer',
                fontSize:'var(--fs-xs)',fontWeight:900,fontFamily:"var(--font-body)",letterSpacing:'.5px',
                background:refTab==='track'?'var(--bd)':'transparent',
                color:refTab==='track'?'var(--tx)':'var(--tx3)'}}>
              TRACK
            </button>
            <button onClick={()=>setRefTab('grabaciones')}
              style={{flex:1,padding:'7px 0',borderRadius:9,cursor:'pointer',
                fontSize:'var(--fs-xs)',fontWeight:900,fontFamily:"var(--font-body)",letterSpacing:'.5px',
                background:refTab==='grabaciones'?'var(--bd)':'transparent',
                color:refTab==='grabaciones'?'var(--tx)':'var(--tx3)'}}>
              GRABACIONES · {grabActivas}/3
            </button>
          </div>

          {refTab==='track'?(
            !refUrl?(
              /* Estado vacío */
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:20}}>
                <div style={{width:56,height:56,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                  onClick={()=>refInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--tx3)" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'var(--fs-md)',fontWeight:700,color:'var(--tx2)',fontFamily:"var(--font-body)",marginBottom:4}}>{tx.uploadReferenceAudioLbl}</div>
                  <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontFamily:"var(--font-body)",lineHeight:1.5}}>MP3, AAC, WAV · Toca para seleccionar</div>
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

                {/* Nombre del archivo + botón para cambiarlo */}
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  <span style={{flex:1,fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontFamily:"var(--font-body)",overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{refAudio?.name}</span>
                  <button onClick={()=>refInputRef.current?.click()}
                    style={{padding:'4px 10px',borderRadius:8,background:'var(--s3)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)",flexShrink:0}}>
                    {tx.changeBtn}
                  </button>
                </div>

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
                            : inLoop?'rgba(var(--gn-rgb),.3)':'var(--bd)',
                          transition:'background .1s',
                        }}/>
                      );
                    })}
                  </div>
                  {/* Marcador In */}
                  {inPct!=null&&(
                    <div style={{position:'absolute',top:0,bottom:0,left:`${inPct}%`,width:2,background:'var(--gn)',zIndex:3}}>
                      <div style={{position:'absolute',top:0,left:2,fontSize:'var(--fs-3xs)',color:'var(--gn)',fontWeight:900,fontFamily:"var(--font-body)",background:'rgba(8,8,9,.8)',padding:'1px 3px',borderRadius:3,whiteSpace:'nowrap'}}>IN</div>
                    </div>
                  )}
                  {/* Marcador Out */}
                  {outPct!=null&&(
                    <div style={{position:'absolute',top:0,bottom:0,left:`${outPct}%`,width:2,background:'var(--rd)',zIndex:3}}>
                      <div style={{position:'absolute',top:0,left:2,fontSize:'var(--fs-3xs)',color:'var(--rd)',fontWeight:900,fontFamily:"var(--font-body)",background:'rgba(8,8,9,.8)',padding:'1px 3px',borderRadius:3,whiteSpace:'nowrap'}}>OUT</div>
                    </div>
                  )}
                  {/* Playhead */}
                  <div style={{position:'absolute',top:0,bottom:0,left:`${pct*100}%`,width:2,background:'var(--ac)',zIndex:4,transition:'left .05s'}}/>
                </div>

                {/* Tiempos */}
                <div style={{display:'flex',justifyContent:'space-between',flexShrink:0}}>
                  <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}>{fmt(refTime)}</span>
                  {refLoopIn!=null&&refLoopOut!=null&&(
                    <span style={{fontSize:'var(--fs-xs)',color:'var(--gn)',fontWeight:700,fontFamily:"var(--font-body)"}}>
                      Loop {fmt(refLoopIn)} → {fmt(refLoopOut)}
                    </span>
                  )}
                  <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}>{fmt(refDuration)}</span>
                </div>

                {/* Controles principales */}
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  {/* Retroceder 5s */}
                  <button onClick={()=>{if(audio){audio.currentTime=Math.max(0,audio.currentTime-5);}}}
                    style={{width:34,height:34,borderRadius:10,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
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
                  }} style={{width:48,height:48,borderRadius:'50%',background:'var(--ac)',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px var(--div)'}}>
                    {refPlaying
                      ?<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      :<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    }
                  </button>

                  {/* Adelantar 5s */}
                  <button onClick={()=>{if(audio){audio.currentTime=Math.min(refDuration,audio.currentTime+5);}}}
                    style={{width:34,height:34,borderRadius:10,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 9c-1.85-1.6-4.25-2.6-6.9-2.6A9 9 0 0 0 2.54 15.13l1.92.64A7 7 0 0 1 11.1 11c1.89 0 3.63.76 4.9 2L14 15h6V9l-2 2z"/></svg>
                  </button>

                  <div style={{flex:1}}/>

                  {/* Velocidad */}
                  <div style={{display:'flex',gap:3}}>
                    {SPEEDS.map(s=>(
                      <button key={s} onClick={()=>{setRefSpeed(s);if(audio)audio.playbackRate=s;}}
                        style={{padding:'4px 6px',borderRadius:6,cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:700,
                          fontFamily:"var(--font-body)",
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
                    style={{flex:1,padding:'6px 8px',borderRadius:8,background:refLoopIn!=null?'rgba(var(--gn-rgb),.1)':'var(--s1)',
                      color:refLoopIn!=null?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:900,
                      fontFamily:"var(--font-body)",display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                    <span style={{fontSize:'var(--fs-2xs)',letterSpacing:'.5px'}}>▶ IN</span>
                    {refLoopIn!=null&&<span style={{opacity:.7}}>{fmt(refLoopIn)}</span>}
                  </button>
                  <button onClick={markOut}
                    style={{flex:1,padding:'6px 8px',borderRadius:8,background:refLoopOut!=null?'rgba(var(--rd-rgb),.1)':'var(--s1)',
                      color:refLoopOut!=null?'var(--rd)':'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:900,
                      fontFamily:"var(--font-body)",display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                    <span style={{fontSize:'var(--fs-2xs)',letterSpacing:'.5px'}}>OUT ■</span>
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
                      background:refLooping?'rgba(var(--gn-rgb),.2)':'var(--s1)',
                      color:refLooping?'var(--gn)':'var(--tx3)',
                      cursor:refLoopIn==null||refLoopOut==null?'not-allowed':'pointer',
                      fontSize:'var(--fs-xs)',fontWeight:900,fontFamily:"var(--font-body)",
                      opacity:refLoopIn==null||refLoopOut==null?.4:1,
                      boxShadow:refLooping?'0 0 8px rgba(var(--gn-rgb),.4)':'none',
                      transition:'all .2s'}}>
                    {refLooping?'↻ ON':'↻'}
                  </button>
                  {(refLoopIn!=null||refLoopOut!=null)&&(
                    <button onClick={clearLoop}
                      style={{width:30,borderRadius:8,background:'var(--s1)',
                        color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-emph)',display:'flex',alignItems:'center',justifyContent:'center'}}>
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
              <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",lineHeight:1.5,marginBottom:2}}>
                Grabación en vivo · Opus 32kbps · cualquiera del equipo puede grabar
              </div>
              {recordError&&(
                <div style={{fontSize:'var(--fs-xs)',color:'var(--rd)',fontFamily:"var(--font-body)",padding:'6px 8px',background:'rgba(var(--rd-rgb),.1)',borderRadius:8}}>{recordError}</div>
              )}
              {grabaciones.map((slot,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,
                  background:'var(--s1)',}}>
                  <div style={{width:26,height:26,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                    background:slot?'rgba(var(--gn-rgb),.15)':'var(--s3)',
                    color:slot?'var(--gn)':'var(--tx3)',fontSize:'var(--fs-base)',fontWeight:900,fontFamily:"var(--font-body)"}}>
                    {i+1}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    {slot?(
                      <>
                        <div style={{fontSize:'var(--fs-sm)',fontWeight:700,color:'var(--tx)',fontFamily:"var(--font-body)"}}>{fmtDur(slot.duracionSeg)} · {slot.ensayoNombre}</div>
                        <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}>{fmtFechaCorta(slot.fecha)} · autoborra en 2 sem.</div>
                      </>
                    ):isRecording&&recordSlot===i?(
                      <div style={{fontSize:'var(--fs-sm)',fontWeight:700,color:'var(--rd)',fontFamily:"var(--font-body)"}}>● Grabando · {fmtDur(recordElapsed)}</div>
                    ):(
                      <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontFamily:"var(--font-body)"}}>{tx.emptySlotLbl}</div>
                    )}
                  </div>
                  {slot&&(<audio src={slot.url} controls style={{height:26,maxWidth:90}}/>)}
                  {isRecording&&recordSlot===i?(
                    <button onClick={detenerGrabacion}
                      style={{padding:'6px 10px',borderRadius:8,cursor:'pointer',
                        background:'var(--rd)',color:'#000',fontSize:'var(--fs-xs)',fontWeight:900,fontFamily:"var(--font-body)",flexShrink:0}}>
                      ■ Detener
                    </button>
                  ):(
                    <button disabled={isRecording} onClick={()=>iniciarGrabacion(i)}
                      style={{padding:'6px 10px',borderRadius:8,cursor:isRecording?'not-allowed':'pointer',
                        background:'var(--s3)',color:'var(--tx2)',fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)",
                        flexShrink:0,opacity:isRecording?.4:1}}>
                      {slot?tx.replaceBtn:tx.recordBtn}
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
          <div style={{fontSize:'var(--fs-md)',fontWeight:900,color:'var(--tx)',fontFamily:"var(--font-body)",textTransform:'uppercase',letterSpacing:'1px'}}>
            ¿Dónde guardamos la grabación? · {fmtDur(pendingRecording.duracionSeg)}
          </div>

          <button onClick={guardarEnCancion}
            style={{textAlign:'left',padding:'12px 14px',borderRadius:12,background:'rgba(var(--gn-rgb),.08)',cursor:'pointer'}}>
            <div style={{fontSize:'var(--fs-base)',fontWeight:900,color:'var(--gn)',fontFamily:"var(--font-body)"}}>En la Canción</div>
            <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginTop:2,lineHeight:1.4}}>
              Queda permanente en la carpeta de esta canción.
            </div>
          </button>

          <div style={{padding:'12px 14px',borderRadius:12,background:'var(--s1)'}}>
            <div style={{fontSize:'var(--fs-base)',fontWeight:900,color:'var(--tx)',fontFamily:"var(--font-body)"}}>En un Ensayo</div>
            <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginTop:2,marginBottom:8,lineHeight:1.4}}>
              Se autoborra 2 semanas después de la fecha del evento.
            </div>
            {ensayosDisponibles.length===0?(
              <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",padding:'8px 0',fontStyle:'italic'}}>
                No hay ensayos creados todavía — crea uno desde Backstage → Crear ensayo.
              </div>
            ):(
              <CustomSelect value={selectedEnsayoId||''} onChange={v=>setSelectedEnsayoId(v||null)}
                placeholder="Elegir ensayo…"
                options={ensayosDisponibles.map(en=>({value:en.id,label:`${en.nombre}${en.setlistNombre?' · '+en.setlistNombre:''}`}))}
                style={{width:'100%',padding:'8px 10px',fontSize:'var(--fs-sm)',marginBottom:8}}/>
            )}
            <button disabled={!selectedEnsayoId} onClick={guardarEnEnsayo}
              style={{width:'100%',padding:'9px 0',borderRadius:8,cursor:selectedEnsayoId?'pointer':'not-allowed',
                background:selectedEnsayoId?'var(--ac)':'var(--bd)',color:selectedEnsayoId?'#000':'var(--tx3)',
                fontSize:'var(--fs-xs)',fontWeight:900,fontFamily:"var(--font-body)"}}>
              Guardar en este ensayo
            </button>
          </div>

          <button onClick={descartarPending}
            style={{padding:'8px 0',borderRadius:8,background:'transparent',color:'var(--tx3)',
              cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)"}}>
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
      const trackH=140; // fijo, mismo valor que MonitorPanel — mismo alto en ambos. Subido varias veces a pedido de Danny (95→105→130→140).
      // Calcular total de compases para proporciones del mapa
      const guias=seqData?.guias;
      const totalComp=guias?guias.reduce((s,g)=>s+(g.compases||4),0):0;

      // Seek táctil en waveform
      const seekOnEl=(e,el)=>{
        const r=el.getBoundingClientRect();
        const p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
        setSeqPos(p);
        // Si hay multitracks reales cargados, mover el playhead también
        // mueve la posición real de reproducción de todas las pistas —
        // antes el waveform era puramente decorativo, sin audio detrás.
        const primeraPista=multitrackAudioRefs.current.find(Boolean);
        if(primeraPista&&primeraPista.duration){
          seekMultitracks(p*primeraPista.duration);
        }
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
        background:'rgba(8,8,9,.98)',border:'2px solid var(--gn)',borderBottom:'none',
        borderRadius:'14px 14px 0 0',
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
          <div style={{display:'flex',alignItems:'flex-start',gap:10,width:'100%'}}>
            <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)',flexShrink:0}}>{tx.sequenceTabLbl}</span>
            <span style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontWeight:300,fontFamily:"var(--font-body)",flex:1,minWidth:0,lineHeight:1.3}}>{tx.sequenceSubLbl}</span>
          </div>
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
                  style={{width:`${pct}%`,cursor:'pointer',padding:0,
                    background:isActive?`${g.color}22`:'transparent',
                    borderBottom:isActive?`2px solid ${g.color}`:'2px solid transparent',
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
                    transition:'all .15s'}}>
                  <span style={{fontSize:'var(--fs-2xs)',fontWeight:900,color:isActive?g.color:`${g.color}cc`,
                    fontFamily:"var(--font-body)",textTransform:'uppercase',lineHeight:1}}>{isTablet?g.label:abrevMapaSecuencia(g.label)}</span>
                  <span style={{fontSize:'var(--fs-3xs)',color:'var(--div)',fontWeight:700}}>{g.compases||4}c</span>
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
            {/* Barras waveform — real (decodificado del audio) si ya se calculó, si no el patrón decorativo mientras carga */}
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',gap:1,padding:'4px 0'}}>
              {(waveformReal||WAVE_DATA).map((h,i)=>{
                const total=(waveformReal||WAVE_DATA).length;
                const pr=i/total;
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
            {/* Playhead — línea de avance en tiempo real, ya existente;
                se mueve con seqPos, que ahora también sigue el tiempo real
                de reproducción de los multitracks (antes solo cambiaba con
                un seek manual, ver useEffect de sincronización más arriba). */}
            <div style={{position:'absolute',top:0,bottom:0,left:`${seqPos*100}%`,
              width:2,background:'#fff',zIndex:3,boxShadow:'0 0 5px rgba(255,255,255,.8)'}}/>
          </div>
          {/* Tiempo */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
            <span style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)'}}>{fmt(seqPos*192)}</span>
            <span style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)'}}>3:12</span>
          </div>
        </div>

        {/* ── BARRA: Controles de transporte ──
            Se quitaron BPM, TAP y Cifra de Secuencia (pedido final de
            Danny): ninguno debe tener presencia ni influencia acá. Los
            tres viven únicamente en el dropdown del metrónomo, en la
            barra superior (AnnoBar), como control independiente del
            tempo real de las pistas grabadas. */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,
          margin:'8px 14px',padding:'8px 12px',
          background:'var(--s1)',borderRadius:12,
          flexShrink:0}}>

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
          }} style={{width:32,height:32,borderRadius:8,background:'var(--s1)',color:'var(--tx)',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2.5"/>
            </svg>
          </button>

          {/* Play / Stop — controla SOLO las pistas de Secuencia. El
              metrónomo (botón de arriba, en la barra principal) es un
              control aparte, con su propio botón — antes este mismo botón
              disparaba ambos juntos, y sonaban superpuestos sin que el
              usuario lo pidiera. Cuadrado redondeado, no circular. */}
          <button onClick={()=>{ if(multitrackAudioRefs.current.some(Boolean)) toggleMultitrackPlay(); }}
            style={{width:52,height:44,borderRadius:14,flexShrink:0,
              marginLeft:6,
              background:multitrackPlaying?'var(--rd)':'var(--gn)',color:'#000',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',
              boxShadow:multitrackPlaying?'0 0 16px rgba(var(--rd-rgb),.5)':'0 0 16px rgba(var(--gn-rgb),.3)'}}>
            {multitrackPlaying
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
          }} style={{width:32,height:32,borderRadius:8,background:'var(--s1)',color:'var(--tx)',cursor:'pointer',
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
        {/* ── Multitracks con faders — tope de MAX_MULTITRACKS pistas, reproducción real sincronizada ── */}
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',fontFamily:"var(--font-body)"}}>{tx.multitracksTitleLbl}</div>
              <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontWeight:300,fontFamily:"var(--font-body)",marginTop:2,opacity:.7}}>{multitracksLocal?`${multitracksLocal.length} pista${multitracksLocal.length===1?'':'s'} cargada${multitracksLocal.length===1?'':'s'} — el ▶ de arriba las reproduce junto al click`:tx.multitracksSubLbl}</div>
            </div>
            <button onClick={()=>multitrackInputRef.current?.click()} disabled={!!subiendoMultitracks}
              style={{padding:'6px 10px',borderRadius:8,background:'rgba(255,255,255,.07)',color:'var(--tx2)',cursor:subiendoMultitracks?'default':'pointer',fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)",flexShrink:0,opacity:subiendoMultitracks?.6:1}}>
              {subiendoMultitracks?`Subiendo ${subiendoMultitracks.pct}%`:(multitracksLocal?'Cambiar':`Cargar (máx. ${MAX_MULTITRACKS})`)}
            </button>
            <input ref={multitrackInputRef} type="file" accept="audio/*" multiple style={{display:'none'}}
              onChange={e=>{ console.log('[SetSync] input onChange, files:',e.target.files?.length); if(e.target.files?.length) elegirMultitracksLocal(e.target.files); }}/>
          </div>
          {/* Elementos <audio> reales viven a nivel de SongView, no acá —
              ver comentario junto a su declaración: deben estar montados
              siempre, sin importar la pestaña activa, para que el
              transporte maestro funcione desde cualquier pantalla. */}
          {(multitracksLocal||seqData?.multitracks)?(
            <div style={{display:'flex',gap:2,overflowX:'auto',paddingBottom:4}}>
              {(multitracksLocal||seqData.multitracks).slice(0,MAX_MULTITRACKS).map((tr,i)=>{
                const vol = trackVols[i]??80;
                const muted = trackMutes[i]??false;
                const esReal=!!multitracksLocal;
                // Indicador de señal — mismo cálculo cosmético que Monitoreo
                // (se deriva del propio fader, no es análisis de audio real;
                // Monitoreo tampoco lo hace, ver vuLit ahí). Agregado a
                // pedido de Danny para que ambos paneles se vean iguales.
                const vuLit=muted?0:Math.round((vol/100)*12);
                return(
                  <div key={i} style={{
                    flex:'0 0 74px',display:'flex',flexDirection:'column',alignItems:'center',
                    gap:2,padding:'4px 2px',borderRadius:6,
                    background:muted?'rgba(var(--rd-rgb),.06)':'var(--s1)',
                    overflow:'visible'}}>
                    {/* Lectura de dB — mismo estilo/posición que Monitoreo,
                        a pedido de Danny ("mismo estilo, el de Monitoreo,
                        que es el más potente"). */}
                    <div style={{fontSize:'var(--fs-3xs)',fontWeight:700,
                      color:muted?'var(--rd)':vol>90?'var(--rd)':vol>75?'#f59e0b':'var(--tx)',
                      fontFamily:"var(--font-body)",letterSpacing:'.3px',
                      flexShrink:0,textAlign:'center'}}>
                      {volToDB(muted?0:vol)}
                    </div>
                    {/* Track + Knob — mismo trackH que Monitoreo (calculado
                        dinámicamente arriba del componente), mismo ancho de
                        riel (48px), misma escala de dB a la izquierda, y
                        mismo patrón de drag ya probado en dispositivo real
                        (ver ZONA BLINDADA en MonitorPanel): rect capturado
                        una sola vez al iniciar, movimiento directo en el
                        DOM sin setState hasta soltar. */}
                    <div style={{flex:1,display:'flex',alignItems:'stretch',gap:2,
                      width:'100%',overflow:'visible',justifyContent:'center'}}>
                      {/* Escala dB — igual que Monitoreo */}
                      <div style={{position:'relative',width:10,flexShrink:0,pointerEvents:'none'}}>
                        {DB_MARKS.map(({db,pct})=>(
                          <div key={db} style={{
                            position:'absolute',right:0,bottom:`${pct}%`,
                            fontSize:'var(--fs-3xs)',color:'var(--em)',
                            fontFamily:"var(--font-body)",
                            lineHeight:1,transform:'translateY(50%)',textAlign:'right',
                          }}>{db>0?'+'+db:db}</div>
                        ))}
                      </div>
                      <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'visible',flex:1}}>
                      <div style={{position:'relative',width:48,height:trackH,borderRadius:2,touchAction:'none',overflow:'visible',cursor:'ns-resize'}}>
                        <div style={{position:'absolute',top:0,bottom:0,left:'50%',transform:'translateX(-50%)',width:5,
                          background:'var(--bd)',borderRadius:3,pointerEvents:'none'}}/>
                        {/* Indicador de señal — mismo markup que el VU meter de Monitoreo */}
                        <div style={{
                          position:'absolute',top:3,bottom:3,right:3,width:4,
                          display:'flex',flexDirection:'column-reverse',gap:1,
                          zIndex:1,pointerEvents:'none',
                        }}>
                          {Array.from({length:12},(_,si)=>{
                            const lit=si<vuLit;
                            const col=si>=10?'var(--rd)':si>=8?'#f59e0b':'var(--gn)';
                            return(
                              <div key={si} style={{
                                flex:1,borderRadius:.5,
                                background:lit?col:'var(--s3)',
                                boxShadow:lit&&si>=8?`0 0 3px ${col}`:'none',
                              }}/>
                            );
                          })}
                        </div>
                        <div style={{
                          position:'absolute',left:'50%',transform:'translateX(-50%)',
                          width:44,height:30,borderRadius:6,zIndex:2,
                          bottom:`calc(${vol}% - 15px)`,
                          background:'linear-gradient(180deg,#e0e0e0 0%,#cecece 15%,#b5b5b5 45%,#c2c2c2 55%,#d5d5d5 85%,#dfdfdf 100%)',
                          boxShadow:'0 5px 15px rgba(0,0,0,.9),0 2px 0 rgba(255,255,255,.5) inset,0 -2px 0 rgba(0,0,0,.4) inset',
                          cursor:'grab',
                          touchAction:'none',userSelect:'none',WebkitUserSelect:'none',
                        }}
                        onPointerDown={e=>{
                          e.preventDefault();
                          e.stopPropagation();
                          const knob=e.currentTarget;
                          const track=knob.parentElement;
                          knob.setPointerCapture(e.pointerId);
                          const r=track.getBoundingClientRect();
                          const trackHloc=r.height;
                          const trackTop=r.top;
                          const calcPct=ev=>Math.round((1-Math.max(0,Math.min(1,(ev.clientY-trackTop)/trackHloc)))*100);
                          let curVol=calcPct(e);
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
                            knob.removeEventListener('pointercancel',up);
                            setTrackVols(v=>{const n=[...v];n[i]=curVol;return n;});
                          };
                          knob.addEventListener('pointermove',move,{passive:false});
                          knob.addEventListener('pointerup',up,{once:true});
                          knob.addEventListener('pointercancel',up,{once:true});
                        }}
                        onTouchStart={e=>e.stopPropagation()}
                        >
                          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                            width:'60%',height:2,background:'rgba(0,0,0,.4)',borderRadius:1,
                            boxShadow:'0 -5px 0 rgba(0,0,0,.3),0 5px 0 rgba(0,0,0,.3),0 -10px 0 rgba(0,0,0,.15),0 10px 0 rgba(0,0,0,.15)'}}/>
                        </div>
                      </div>
                    </div>
                    </div>
                    {/* Nombre de la pista — estándar Ch1, Ch2... a pedido de
                        Danny (antes mostraba tr.label, el nombre real del
                        archivo cargado — "nombres de fantasía" que no quería). */}
                    <div style={{display:'flex',alignItems:'center',gap:3,width:'100%',justifyContent:'center',flexShrink:0}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:muted?'rgba(var(--rd-rgb),.5)':tr.color,flexShrink:0}}/>
                      <div style={{fontSize:'var(--fs-3xs)',color:muted?'var(--rd)':'var(--tx3)',
                        fontFamily:"var(--font-body)",fontWeight:700,letterSpacing:'.5px',overflow:'hidden',
                        whiteSpace:'nowrap',textOverflow:'ellipsis',maxWidth:52,textAlign:'center'}}>Ch{i+1}</div>
                    </div>
                    {/* Marcar como Click / Guía — habilita el fader local
                        de Monitoreo para esta pista (sin usar canal real
                        de la mesa). Solo si son pistas reales (subidas),
                        no en el set de demo. */}
                    {esReal&&(
                      <div style={{display:'flex',gap:3,width:'100%',flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();marcarRolPista(i,'click');}}
                          title="Marcar como Click"
                          style={{flex:1,padding:'2px 0',borderRadius:4,cursor:'pointer',
                            fontSize:'var(--fs-3xs)',fontWeight:900,fontFamily:"var(--font-body)",
                            background:tr.rol==='click'?'var(--ac)':'var(--s3)',
                            color:tr.rol==='click'?'#000':'var(--tx3)'}}>CLICK</button>
                        <button onClick={e=>{e.stopPropagation();marcarRolPista(i,'guia');}}
                          title="Marcar como Guía"
                          style={{flex:1,padding:'2px 0',borderRadius:4,cursor:'pointer',
                            fontSize:'var(--fs-3xs)',fontWeight:900,fontFamily:"var(--font-body)",
                            background:tr.rol==='guia'?'var(--ac)':'var(--s3)',
                            color:tr.rol==='guia'?'#000':'var(--tx3)'}}>GUÍA</button>
                      </div>
                    )}
                    {/* Mute — mismo tamaño que el de Monitoreo */}
                    <button onClick={e=>{e.stopPropagation();setTrackMutes(m=>{const n=[...m];n[i]=!n[i];return n;})}}
                      style={{width:'100%',padding:'3px 0',borderRadius:4,cursor:'pointer',flexShrink:0,
                        background:muted?'#8B0000':'var(--s3)',
                        color:muted?'#fff':'var(--tx3)',fontSize:'var(--fs-3xs)',fontWeight:900,
                        fontFamily:"var(--font-body)"}}>
                      MUTE
                    </button>
                    {/* Cargar/Borrar — angostas, apiladas debajo del Mute */}
                    {esReal&&(
                      <div style={{display:'flex',flexDirection:'column',gap:2,width:'100%',flexShrink:0}}>
                        <input type="file" accept="audio/*" style={{display:'none'}} id={`canal-file-${i}`}
                          onChange={e=>{ if(e.target.files?.[0])cargarUnCanal(i,e.target.files[0]); e.target.value=''; }}/>
                        <label htmlFor={`canal-file-${i}`}
                          style={{fontSize:'var(--fs-3xs)',fontWeight:700,padding:'2px 0',borderRadius:4,textAlign:'center',
                            background:'rgba(255,255,255,.05)',
                            color:'var(--tx3)',cursor:'pointer',fontFamily:"var(--font-body)"}}>
                          Cargar
                        </label>
                        <button onClick={()=>borrarUnCanal(i)}
                          style={{fontSize:'var(--fs-3xs)',fontWeight:700,padding:'2px 0',borderRadius:4,
                            background:'rgba(var(--rd-rgb),.08)',
                            color:'var(--rd)',cursor:'pointer',fontFamily:"var(--font-body)"}}>
                          Borrar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ):(
            <div style={{padding:'16px',borderRadius:12,textAlign:'center'}}>
              <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontFamily:"var(--font-body)"}}>{tx.noTracksForSongLbl}</div>
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
        <button onClick={()=>setIdx(i=>Math.max(i-1,0))}
          style={{position:'fixed',left:12,bottom:72,zIndex:20,display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:100,background:'rgba(10,10,20,.88)',backdropFilter:'blur(20px)',color:'var(--tx2)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          {tx.previous}
        </button>
      )}
      <button onClick={()=>{if(idx===songs.length-1)onClose();else setIdx(i=>Math.min(i+1,songs.length-1));}}
        style={{position:'fixed',right:12,bottom:72,zIndex:20,display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:100,background:'var(--bd)',backdropFilter:'blur(20px)',color:'var(--tx)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
        {idx===songs.length-1?tx.done:tx.next}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </>
  );

  // ── Layout tablet ≥768px — sin sidebar de canciones (pantalla completa)──
  if(isTablet){
    return(
      <div className="sv" style={{background:svBg,position:'fixed',inset:0,zIndex:100}}>
        {showSavePopup&&PopupGuardar()}
                {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
        <div style={{display:'flex',flexDirection:isTablet?'row':'column',alignItems:isTablet?'center':'stretch'}}>
          <div className="sv-hdr" style={{background:svHdrBg,borderBottom:isTablet?'none':`1px solid ${svBd}`,flex:isTablet?'0 1 auto':undefined,minWidth:0}}>
            <div className="sv-back" onClick={()=>{if(editMode&&editedSongs[song?.name]){setShowSavePopup(true);}else onClose();}}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-title2)',color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
              <div style={{fontSize:'var(--fs-2xs)',color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
                {song.autor||song.artista||'—'}
                {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
                {song.asignaciones&&song.asignaciones.length>0&&song.asignaciones.map((a,ai)=>(<span key={ai} style={{color:'var(--ac)',marginLeft:6,background:'rgba(200,169,126,.15)',padding:'2px 7px',borderRadius:100}}>{a.persona?`${a.variacion} → ${a.persona}`:a.variacion}</span>))}
              </div>
            </div>
            <button onClick={()=>setShowCarpeta(true)} title="Ver carpeta de esta canción"
              style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,
                background:'none',cursor:'pointer',padding:'0 4px',flexShrink:0}}>
              <div style={{width:26,height:26,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
                background:'rgba(200,169,126,.12)'}}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <span style={{fontSize:'var(--fs-2xs)',fontWeight:700,color:'var(--ac)'}}>
                {1+(variacionesDB[baseName]||[]).length+(carpetaActual.secuencia||[]).length+(carpetaActual.trackReferencia?1:0)}
              </span>
            </button>
            <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
              {songs.map((_,i)=>(<div key={i} style={{width:i===idx?14:6,height:4,borderRadius:2,background:i===idx?'var(--ac)':'var(--div)',transition:'all .3s'}}/>))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
              <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontWeight:700}}>{idx+1}/{songs.length}</div>
            </div>
          </div>
          {/* AnnoBar (tono, notación, Solo letra, Editar) — en tablet comparte fila con el título en vez de quedar debajo */}
          <div style={{flex:isTablet?'1 1 auto':undefined,minWidth:0,borderBottom:isTablet?`1px solid ${svBd}`:'none'}}>{AnnoBar()}</div>
        </div>
        {ContentArea()}
          {MonitorPanel()}
        {ReferenciaPanel()}
        {SecuenciaPanel()}
        {/* Elementos <audio> reales de multitracks — siempre montados, sin
            importar qué pestaña esté activa (letra, Referencia, Monitor,
            Secuencia). Bug real corregido: antes vivían dentro de
            SecuenciaPanel, que solo se monta cuando bottomTab==='secuencia'
            — así que tocar play desde cualquier otra pantalla no encontraba
            ningún <audio> real (multitrackAudioRefs.current vacío) y el
            transporte maestro caía silenciosamente al comportamiento de
            "solo click", sin reproducir las pistas. */}
        {multitracksLocal?.map((tr,i)=>(
          <audio key={tr.url} ref={el=>{multitrackAudioRefs.current[i]=el;}} src={tr.url} preload="auto"
            onEnded={()=>setMultitrackPlaying(false)} style={{display:'none'}}/>
        ))}
        {CarpetaModal()}
        {/* ── Modal de elección de formato al cargar multitracks ──────────
            Se abre apenas el usuario elige archivos, antes de subir nada.
            Muestra el tamaño real de cada archivo y una estimación de a
            cuánto quedaría en MP3 vs Opus, más el tiempo aproximado que
            tarda cada conversión — MP3 es prácticamente instantáneo
            (codificación offline), Opus tarda lo que dura el audio (el
            navegador solo expone su encoder Opus vía grabación en tiempo
            real, no hay atajo). "Original" sube el WAV tal cual, sin
            convertir — más pesado y lento de subir, pero sin ningún
            procesamiento de por medio. */}
        {modalConversion&&createPortal((()=>{
          const totalOriginalMB=modalConversion.estimaciones.reduce((s,e)=>s+e.pesoOriginalMB,0);
          const totalMp3MB=modalConversion.estimaciones.reduce((s,e)=>s+e.pesoEstimadoMB,0);
          const duracionMaxSeg=Math.max(...modalConversion.estimaciones.map(e=>e.duracionSeg));
          const fmtSeg=(s)=>s<60?`~${Math.round(s)}s`:`~${Math.round(s/60)} min`;
          return(
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:998,
              display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
              onClick={()=>setModalConversion(null)}>
              <div onClick={e=>e.stopPropagation()} style={{background:svBg,borderRadius:18,
                padding:20,maxWidth:380,width:'100%',maxHeight:'85vh',overflowY:'auto'}}>
                <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',color:svTx,marginBottom:4}}>
                  {modalConversion.archivos.length} pista{modalConversion.archivos.length===1?'':'s'} elegida{modalConversion.archivos.length===1?'':'s'}
                </div>
                <div style={{fontSize:'var(--fs-base)',color:'var(--tx3)',marginBottom:16,lineHeight:1.5}}>
                  Elegí en qué formato subirlas. {modalConversion.archivos.length>1?'La conversión aplica a todas.':''}
                </div>

                {/* Original */}
                <button onClick={()=>procesarYSubirMultitracks(modalConversion.archivos,'original')}
                  style={{width:'100%',textAlign:'left',padding:14,borderRadius:12,marginBottom:8,cursor:'pointer',
                    background:'var(--s1)',color:svTx}}>
                  <div style={{fontSize:'var(--fs-lg)',fontWeight:700,marginBottom:3}}>Original (sin convertir)</div>
                  <div style={{fontSize:'var(--fs-base)',color:'var(--tx3)'}}>{totalOriginalMB.toFixed(1)} MB total · sube tal cual, sin espera de conversión</div>
                </button>

                {/* MP3 */}
                <button onClick={()=>procesarYSubirMultitracks(modalConversion.archivos,'mp3')}
                  style={{width:'100%',textAlign:'left',padding:14,borderRadius:12,marginBottom:8,cursor:'pointer',
                    background:'rgba(var(--gn-rgb),.08)',color:svTx}}>
                  <div style={{fontSize:'var(--fs-lg)',fontWeight:700,marginBottom:3,color:'var(--gn)'}}>MP3 — recomendado</div>
                  <div style={{fontSize:'var(--fs-base)',color:'var(--tx3)'}}>~{totalMp3MB.toFixed(1)} MB total ({Math.round((1-totalMp3MB/totalOriginalMB)*100)}% más liviano) · conversión casi instantánea</div>
                </button>

                {/* Opus */}
                <button onClick={()=>procesarYSubirMultitracks(modalConversion.archivos,'opus')}
                  style={{width:'100%',textAlign:'left',padding:14,borderRadius:12,marginBottom:14,cursor:'pointer',
                    background:'var(--s1)',color:svTx}}>
                  <div style={{fontSize:'var(--fs-lg)',fontWeight:700,marginBottom:3}}>Opus — mejor calidad</div>
                  <div style={{fontSize:'var(--fs-base)',color:'var(--tx3)'}}>~{totalMp3MB.toFixed(1)} MB total, algo mejor calidad que MP3 al mismo peso · conversión tarda {fmtSeg(duracionMaxSeg)} (dura lo mismo que el audio)</div>
                </button>

                <button onClick={()=>setModalConversion(null)}
                  style={{width:'100%',padding:11,borderRadius:10,background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-md)'}}>
                  Cancelar
                </button>
              </div>
            </div>
          );
        })(), document.body)}
        {/* Overlay de progreso mientras convierte — también con portal, por
            el mismo motivo: sin esto quedaba atrapado detrás del panel de
            Secuencia (overflow:hidden + z-index bajo), invisible aunque el
            código sí lo montara. */}
        {convirtiendo&&createPortal(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:999,
            display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <div style={{background:svBg,borderRadius:18,padding:24,maxWidth:300,width:'100%',textAlign:'center'}}>
              <div style={{fontSize:'var(--fs-lg)',color:svTx,marginBottom:10}}>
                Convirtiendo a {convirtiendo.formato.toUpperCase()}… ({convirtiendo.archivoActual}/{convirtiendo.totalArchivos})
              </div>
              <div style={{width:'100%',height:6,borderRadius:3,background:'var(--s1)',overflow:'hidden'}}>
                <div style={{width:`${convirtiendo.pct}%`,height:'100%',background:'var(--gn)',transition:'width .2s'}}/>
              </div>
              <div style={{fontSize:'var(--fs-base)',color:'var(--tx3)',marginTop:8}}>{convirtiendo.pct}%</div>
            </div>
          </div>,
          document.body
        )}
        {/* ── Invitación a Modo En Vivo — aparece a cualquiera del equipo
            (que no sea el líder) apenas hay una sesión llamando a la que
            todavía no respondió. */}
        {modoVivo.necesitoResponder&&createPortal(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:999,
            display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <div style={{background:svBg,borderRadius:18,padding:24,maxWidth:320,width:'100%',textAlign:'center'}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'var(--rd)',
                boxShadow:'0 0 10px var(--rd)',margin:'0 auto 14px'}}/>
              <div style={{fontSize:'var(--fs-xl)',fontFamily:"var(--font-display)",color:svTx,marginBottom:8}}>
                Modo En Vivo
              </div>
              <div style={{fontSize:'var(--fs-md)',color:'var(--tx2)',lineHeight:1.6,marginBottom:20}}>
                <strong style={{color:svTx}}>{modoVivo.sesion?.liderNombre||'El líder'}</strong> te está llamando a sumarse — vas a escuchar y ver lo que él controle (play, grabación, anotaciones).
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={modoVivo.rechazar}
                  style={{flex:1,padding:'11px',borderRadius:10,background:'var(--s1)',color:'var(--tx2)',cursor:'pointer',fontWeight:700,
                    fontFamily:"'Outfit',sans-serif",fontSize:'var(--fs-base)'}}>
                  Rechazar
                </button>
                <button onClick={modoVivo.aceptar}
                  style={{flex:2,padding:'11px',borderRadius:10,background:'var(--gn)',color:'#000',cursor:'pointer',fontWeight:900,
                    fontFamily:"'Outfit',sans-serif",fontSize:'var(--fs-base)'}}>
                  Aceptar y sumarme
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        {BottomTabBar()}
      </div>
    );
  }

  // ── Layout mobile <768px ──────────────────────────────────────────────────
  return(
    <div className={`sv${sidebarVisible?' sv-with-sidebar':''}${sidebarCollapsed?' sv-sb-col':''}`} style={{background:svBg,position:'fixed',inset:0,zIndex:100}}>
      {showSavePopup&&PopupGuardar()}
            {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div className="sv-hdr" style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`}}>
        <div className="sv-back" onClick={()=>{if(editMode&&editedSongs[song?.name]){setShowSavePopup(true);}else onClose();}}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-title2)',color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:'var(--fs-2xs)',color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
            {song.autor||song.artista||'—'}
            {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
            {song.asignaciones&&song.asignaciones.length>0&&song.asignaciones.map((a,ai)=>(<span key={ai} style={{color:'var(--ac)',marginLeft:6,background:'rgba(200,169,126,.15)',padding:'2px 7px',borderRadius:100}}>{a.persona?`${a.variacion} → ${a.persona}`:a.variacion}</span>))}
          </div>
        </div>
        <button onClick={()=>setShowCarpeta(true)} title="Ver carpeta de esta canción"
          style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,
            background:'none',cursor:'pointer',padding:'0 4px',flexShrink:0}}>
          <div style={{width:26,height:26,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(200,169,126,.12)'}}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span style={{fontSize:'var(--fs-2xs)',fontWeight:700,color:'var(--ac)'}}>
            {1+(variacionesDB[baseName]||[]).length+(carpetaActual.secuencia||[]).length+(carpetaActual.trackReferencia?1:0)}
          </span>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <div style={{fontSize:'calc(var(--fs-subtitle) - 1px)',color:'var(--tx2)',fontWeight:700}}>{idx+1}/{songs.length}</div>
        </div>
      </div>
      {AnnoBar()}
      {ContentArea()}
        {MonitorPanel()}
        {ReferenciaPanel()}
        {SecuenciaPanel()}
        {CarpetaModal()}
      {BottomTabBar()}
    </div>
  );
}
