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
export function SongView({songs,startIdx,onClose,theme="dark",isAdmin=false,onSaveChords,contentDB={},permisos=null,lang='es',sidebarVisible=false,sidebarCollapsed=false}){
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

  // ── Estado de conexión de la mesa (demo: sin conexión) ────────────────────
  const [mesaConectada] = useState(false);
  const [mesaNombre] = useState('Behringer X32');
  const [wifiStrength] = useState(3); // 0-4
  const [monitorLayer,setMonitorLayer]=useState('A');

  // Chip de estado de monitoreo — aparece en sidebar (desktop) o en tab (mobile)
  const MonitorStatusChip=({compact=false})=>{
    const bars=[0,1,2,3];
    return(
      <div style={{
        display:'flex',alignItems:'center',gap:compact?6:8,
        padding:compact?'5px 8px':'8px 10px',
        borderRadius:compact?8:10,
        background:mesaConectada?'rgba(48,192,183,.1)':'rgba(255,255,255,.04)',
        border:'1px solid '+(mesaConectada?'rgba(48,192,183,.25)':'rgba(255,255,255,.08)'),
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
                ?'var(--gn)':'rgba(255,255,255,.15)',
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

  const getSongContent=(song)=>editedSongs[song.name]||contentDB[song.name]||null;

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
                style={{width:'100%',padding:'7px 10px',marginBottom:3,border:'none',borderRadius:8,background:isOn?'rgba(200,169,126,.15)':'rgba(255,255,255,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all .15s'}}>
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
      <div onClick={e=>e.stopPropagation()} style={{background:'#111113',border:'1px solid rgba(255,255,255,.12)',borderRadius:20,padding:'22px 20px',maxWidth:300,width:'85%'}}>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:15,color:'var(--tx)',marginBottom:16}}>Velocidad de Auto Scroll</div>
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
          <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,border:showAnnoBar?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:showAnnoBar?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
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
            background:(tpOff!==0||capo>0)?'rgba(200,169,126,.12)':'rgba(255,255,255,.04)',
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
                {tpOff!==0&&<button onClick={()=>{setTpOff(0);setToast({text:`♩ ${song.key}`,sub:tx.original});}} style={{width:'100%',padding:'6px',borderRadius:8,border:'1px solid var(--bd)',background:'rgba(255,255,255,.05)',color:'var(--tx3)',cursor:'pointer',fontSize:10,fontWeight:700,fontFamily:"'Outfit',sans-serif",marginBottom:10}}>Restaurar original</button>}
                {/* Capo */}
                <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Capo</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:14}}>
                  {[0,1,2,3,4,5,6,7].map(c=>{
                    const notaSuena=c===0?curKey:tpKey(curKey,-c);
                    const isOn=capo===c;
                    return(
                      <button key={c} onClick={()=>{setCapo(c);setToast(c===0?{text:tx.noCapo,sub:tx.original}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                        style={{padding:'6px 4px',borderRadius:8,border:isOn?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',
                          background:isOn?'rgba(200,169,126,.15)':'rgba(255,255,255,.04)',
                          cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,transition:'all .15s'}}>
                        <span style={{fontSize:12,fontWeight:900,color:isOn?'var(--ac)':'var(--tx)',fontFamily:"'Outfit',sans-serif"}}>{c===0?'—':c}</span>
                        <span style={{fontSize:8,color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'Outfit',sans-serif",fontWeight:700}}>{notaSuena}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Notación */}
                <div style={{borderTop:'1px solid rgba(255,255,255,.08)',paddingTop:10}}>
                  <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Notación</div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {['americano','latino','grados'].map(opt=>{
                      const isOn=notacion===opt;
                      return(
                        <button key={opt} onClick={()=>setNotacion(opt)}
                          style={{padding:'7px 10px',border:'none',borderRadius:8,
                            background:isOn?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',
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
          <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:!showChords?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:!showChords?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
            {showChords?tx.lyricsOnly:tx.withChords}
          </button>
        )}
        {perm.autoScroll&&(
          <button onClick={()=>{const next=!autoScroll;setAutoScroll(next);resetScroll();if(next&&!isTablet)setShowSpeedPopup(true);}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:autoScroll?'1px solid rgba(94,206,160,.5)':'1px solid var(--bd)',background:autoScroll?'rgba(94,206,160,.15)':'rgba(255,255,255,.04)',color:autoScroll?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0,transition:'all .2s'}}>
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
            <button key={t} onClick={()=>setTool(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,border:tool===t?'1px solid var(--bd)':'1px solid transparent',background:tool===t?'rgba(255,255,255,.09)':'transparent',color:tool===t?'var(--tx)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>{l}</button>
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
      <div style={{background:'#111113',border:'1px solid rgba(255,255,255,.12)',borderRadius:20,padding:'24px',maxWidth:300,width:'90%'}}>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:17,color:'var(--tx)',marginBottom:8}}>Guardar cambios</div>
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
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.6)',backdropFilter:'blur(8px)'}} onClick={()=>setShowModePopup(false)}>
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
      {/* Contenedor de letra — flex:1 relativo para canvas+scroll */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',width:'100%',height:'100%',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
          onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
          onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
        />
        <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 10px 112px 10px',display:'flex',alignItems:'flex-start',justifyContent:'flex-start'}}>
          {song.docId
            ?<iframe src={`https://docs.google.com/document/d/${song.docId}/preview`} allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none',zIndex:1}}/>
            :<div style={{width:'100%'}}>{renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,steps)=>handleDragChord(li,ci,steps),notacion,curKey)}</div>
          }
        </div>
      </div>
    </div>
  );


  // ── Monitor panel — estado centralizado en SongView ─────────────────────
  const FADER_NAMES=['Kick','Snare','Hi-Hat','Bass','Gtr 1','Gtr 2','Keys','Voz 1','Voz 2','Voz 3','Coros','Coros 2','Pad','Fx','Aux L','Aux R'];
  const [faderVols,setFaderVols]=useState(()=>FADER_NAMES.map(()=>75));
  const [trackVols,setTrackVols]=useState(()=>Array(20).fill(80));
  const [trackMutes,setTrackMutes]=useState(()=>Array(20).fill(false));
  const [seqLayer,setSeqLayer]=useState('A'); // 'A' primeros 8, 'B' segundos 8
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
  const [faderMutes,setFaderMutes]=useState(()=>FADER_NAMES.map(()=>false));

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
        background:'rgba(8,8,9,.97)',borderTop:'1px solid rgba(255,255,255,.1)',
        backdropFilter:'blur(20px)',zIndex:55,
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
            background:canPrev?'rgba(255,255,255,.1)':'transparent',
            border:canPrev?'1px solid rgba(255,255,255,.2)':'1px solid transparent',
            transition:'all .2s',
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={canPrev?'var(--tx)':'rgba(255,255,255,.15)'} strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',
              fontFamily:"'Lexend Giga',sans-serif",color:canPrev?'var(--tx)':'rgba(255,255,255,.15)'}}>Ant</span>
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
  const CIFRAS = ['4/4','3/4','6/8','2/4','5/4','12/8'];
  const defaultBpm = SECUENCIA_DATA[song?.name]?.click.bpm || song?.bpm || 120;
  const defaultCifra = SECUENCIA_DATA[song?.name]?.click.compas || '4/4';
  const [seqBpm, setSeqBpm] = useState(defaultBpm);
  const [seqCifra, setSeqCifra] = useState(defaultCifra);
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
    const guias = seqData?.guias;
    if(!guias||!guias.length) return null;
    const totalComp = guias.reduce((s,g)=>s+(g.compases||4),0);
    const narrow = window.innerWidth < 400;
    return(
      <div style={{
        flexShrink:0,
        background:'rgba(8,8,9,.96)',borderBottom:'1px solid rgba(255,255,255,.07)',
        display:'flex',alignItems:'stretch',
        overflowX:'auto',scrollbarWidth:'none',
        WebkitOverflowScrolling:'touch',
        minHeight:32,zIndex:5,
      }}>
        {guias.map((g,i)=>{
          const isActive = mapaSectionIdx===i;
          const pct = Math.max(7, Math.round((g.compases/totalComp)*100));
          return(
            <button key={i}
              onClick={()=>{
                setMapaSectionIdx(i);
                const el=document.getElementById('section-'+i);
                const cont=wrapRef.current;
                if(el&&cont){const elTop=el.getBoundingClientRect().top;const cTop=cont.getBoundingClientRect().top;cont.scrollBy({top:elTop-cTop-12,behavior:'smooth'});}
                const compasInicio = guias.slice(0,i).reduce((s,g)=>s+(g.compases||4),0);
                const msPerCompas = (60000/(seqBpm||120))*4;
                window.dispatchEvent(new CustomEvent('setsync-mapa-seek',{
                  detail:{sectionIdx:i,compasInicio,msInicio:compasInicio*msPerCompas}
                }));
              }}
              style={{
                flexShrink:0,
                width:pct+'%',minWidth:narrow?36:52,
                border:'none',
                background:'transparent',
                borderBottom:isActive?'2px solid '+g.color:'2px solid transparent',
                padding:'4px 3px 2px',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
                cursor:'pointer',transition:'all .15s',
              }}>
              {/* Chip de color — mismo estilo que los de Secuencia */}
              <div style={{
                width:'calc(100% - 4px)',
                minHeight:20,
                borderRadius:5,
                background:isActive?g.color+'33':g.color+'14',
                border:'1px solid '+(isActive?g.color+'88':g.color+'33'),
                display:'flex',alignItems:'center',justifyContent:'center',
                padding:'2px 4px',
              }}>
                <span style={{
                  fontSize:narrow?6:8,fontWeight:900,
                  color:isActive?g.color:g.color+'99',
                  fontFamily:"'Lexend Giga',sans-serif",
                  textTransform:'uppercase',letterSpacing:'.3px',
                  whiteSpace:'nowrap',lineHeight:1.1,textAlign:'center',
                }}>{abrevLabel(g.label,narrow)}</span>
              </div>
              <span style={{
                fontSize:5,color:isActive?g.color:'rgba(255,255,255,.25)',
                fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,lineHeight:1,
              }}>{g.compases}c</span>
            </button>
          );
        })}
      </div>
    );
  };

  const ClickPanel=()=>(
    <div>
      <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10,fontFamily:"'Lexend Giga',sans-serif"}}>Click · Metrónomo</div>
      <div style={{borderRadius:14,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',padding:'12px 14px',display:'flex',flexDirection:'column',gap:12}}>        {/* Fila 1: BPM + Play */}
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
              border:'1px solid rgba(255,255,255,.12)',
              background:'rgba(255,255,255,.07)',
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
  const ReferenciaPanel=()=>{
    const audio=refPlayerRef.current;
    const pct=refDuration>0?refTime/refDuration:0;

    // Helper: segundos → mm:ss
    const fmt=s=>isNaN(s)?'0:00':`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

    // Iniciar audio desde File
    const loadFile=file=>{
      if(refUrl) URL.revokeObjectURL(refUrl);
      const url=URL.createObjectURL(file);
      setRefUrl(url);setRefAudio(file);setRefTime(0);
      setRefLoopIn(null);setRefLoopOut(null);setRefLooping(false);
      setRefPlaying(false);
      if(audio){audio.src=url;audio.load();}
    };

    // Seek al tocar el waveform/progress
    const seekTo=(e,el)=>{
      const r=el.getBoundingClientRect();
      const ratio=(e.clientX-r.left)/r.width;
      const t=ratio*refDuration;
      if(audio){audio.currentTime=t;}
      setRefTime(t);
    };

    // Marcar loop in/out
    const markIn=()=>{setRefLoopIn(refTime);};
    const markOut=()=>{setRefLoopOut(refTime);};
    const clearLoop=()=>{setRefLoopIn(null);setRefLoopOut(null);setRefLooping(false);};

    const inPct=refLoopIn!=null&&refDuration>0?refLoopIn/refDuration*100:null;
    const outPct=refLoopOut!=null&&refDuration>0?refLoopOut/refDuration*100:null;

    const SPEEDS=[0.5,0.75,1,1.25,1.5];

    return(
      <div style={{
        position:'fixed',bottom:54,left:0,right:0,
        background:'rgba(8,8,9,.98)',borderTop:'1px solid rgba(255,255,255,.08)',
        backdropFilter:'blur(40px)',zIndex:50,
        transform:bottomTab==='referencia'?'translateY(0)':'translateY(100%)',
        transition:'transform .3s cubic-bezier(.4,0,.2,1)',
        display:'flex',flexDirection:'column',
        maxHeight:'55vh',
      }}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px 8px',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="1.8">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <span style={{flex:1,fontSize:10,fontWeight:900,color:'var(--tx)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif"}}>
            Referencia
          </span>
          {refAudio&&<span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",maxWidth:160,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{refAudio.name}</span>}
          {/* Subir audio */}
          <button onClick={()=>refInputRef.current?.click()}
            style={{padding:'4px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.07)',color:'var(--tx2)',cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
            {refAudio?'Cambiar':'Subir audio'}
          </button>
          <input ref={refInputRef} type="file" accept="audio/*" style={{display:'none'}}
            onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0]);}}/>
        </div>

        {!refUrl?(
          /* Estado vacío */
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:20}}>
            <div style={{width:56,height:56,borderRadius:'50%',border:'2px dashed rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
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
        ):(
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
            <div style={{position:'relative',height:48,borderRadius:10,background:'rgba(255,255,255,.05)',overflow:'hidden',cursor:'pointer',flexShrink:0}}
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
                        : inLoop?'rgba(48,192,183,.3)':'rgba(255,255,255,.12)',
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
                style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
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
              }} style={{width:48,height:48,borderRadius:'50%',border:'none',background:'var(--ac)',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px rgba(255,255,255,.2)'}}>
                {refPlaying
                  ?<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  :<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                }
              </button>

              {/* Adelantar 5s */}
              <button onClick={()=>{if(audio){audio.currentTime=Math.min(refDuration,audio.currentTime+5);}}}
                style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 9c-1.85-1.6-4.25-2.6-6.9-2.6A9 9 0 0 0 2.54 15.13l1.92.64A7 7 0 0 1 11.1 11c1.89 0 3.63.76 4.9 2L14 15h6V9l-2 2z"/></svg>
              </button>

              <div style={{flex:1}}/>

              {/* Velocidad */}
              <div style={{display:'flex',gap:3}}>
                {SPEEDS.map(s=>(
                  <button key={s} onClick={()=>{setRefSpeed(s);if(audio)audio.playbackRate=s;}}
                    style={{padding:'4px 6px',borderRadius:6,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,
                      fontFamily:"'Lexend Giga',sans-serif",
                      background:refSpeed===s?'rgba(200,169,126,.25)':'rgba(255,255,255,.06)',
                      color:refSpeed===s?'var(--ac)':'var(--tx3)'}}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Loop controls */}
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <button onClick={markIn}
                style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${refLoopIn!=null?'rgba(48,192,183,.4)':'rgba(255,255,255,.1)'}`,
                  background:refLoopIn!=null?'rgba(48,192,183,.1)':'rgba(255,255,255,.05)',
                  color:refLoopIn!=null?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:9,fontWeight:900,
                  fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                <span style={{fontSize:8,letterSpacing:'.5px'}}>▶ IN</span>
                {refLoopIn!=null&&<span style={{opacity:.7}}>{fmt(refLoopIn)}</span>}
              </button>
              <button onClick={markOut}
                style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${refLoopOut!=null?'rgba(253,128,131,.4)':'rgba(255,255,255,.1)'}`,
                  background:refLoopOut!=null?'rgba(253,128,131,.1)':'rgba(255,255,255,.05)',
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
                  border:`1px solid ${refLooping?'var(--gn)':'rgba(255,255,255,.1)'}`,
                  background:refLooping?'rgba(48,192,183,.2)':'rgba(255,255,255,.05)',
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
                  style={{width:30,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',
                    color:'var(--tx3)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Panel de Secuencia ────────────────────────────────────────────────────
  // Waveform simulado — 80 barras de altura variable
  const WAVE_DATA=Array.from({length:80},(_,i)=>
    Math.abs(Math.sin(i*.31)*.45+Math.sin(i*.13)*.3+Math.sin(i*.07)*.15+.1)
  );

  const SecuenciaPanel=()=>{
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

    return(
    <div style={{
      position:'fixed',bottom:54,left:0,right:0,
      background:'rgba(8,8,9,.98)',borderTop:'1px solid rgba(255,255,255,.1)',
      backdropFilter:'blur(40px)',zIndex:50,
      maxHeight:'72vh',
      transform:bottomTab==='secuencia'?'translateY(0)':'translateY(100%)',
      transition:'transform .3s cubic-bezier(.4,0,.2,1)',
      display:'flex',flexDirection:'column',
      overflow:'hidden',
    }}>

      {/* Área scrollable: mapa + waveform + controles + BPM */}
      <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none',minHeight:0}}>
      {/* ── MAPA DE ESTRUCTURA — integrado en el panel ── */}
      {guias&&guias.length>0&&(
        <div style={{display:'flex',height:34,borderBottom:'1px solid rgba(255,255,255,.06)',flexShrink:0}}>
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
                <span style={{fontSize:8,fontWeight:900,color:isActive?g.color:`${g.color}66`,
                  fontFamily:"'Lexend Giga',sans-serif",textTransform:'uppercase',lineHeight:1}}>{g.label}</span>
                <span style={{fontSize:5,color:'rgba(255,255,255,.2)',fontWeight:700}}>{g.compases||4}c</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── WAVEFORM GENERAL + SEEK ── */}
      <div style={{padding:'10px 14px 0',flexShrink:0}}>
        <div
          style={{height:44,position:'relative',cursor:'pointer',borderRadius:8,
            background:'rgba(255,255,255,.03)',overflow:'hidden',touchAction:'none'}}
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
              let sc='rgba(255,255,255,.09)';
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
                    : (played?sc+'99':'rgba(255,255,255,.09)'),
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
        background:'rgba(255,255,255,.04)',borderRadius:12,
        border:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>

        {/* − BPM + */}
        <button
          style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
            background:'rgba(255,255,255,.06)',color:'var(--tx)',cursor:'pointer',fontSize:17,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,touchAction:'none'}}
          onPointerDown={e=>{
            e.preventDefault();
            const btn=e.currentTarget;
            const fire=()=>{const v=Math.max(40,seqBpm-1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}};
            fire();
            btn._t=setTimeout(()=>{btn._iv=setInterval(fire,80);},400);
          }}
          onPointerUp={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}
          onPointerLeave={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}>−</button>

        <div style={{textAlign:'center',padding:'0 6px'}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:22,
            color:clickActivo?'var(--gn)':'var(--ac)',lineHeight:1}}>{seqBpm}</div>
          <div style={{fontSize:7,color:'var(--tx3)',fontWeight:700,letterSpacing:1}}>BPM</div>
        </div>

        <button
          style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
            background:'rgba(255,255,255,.06)',color:'var(--tx)',cursor:'pointer',fontSize:17,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,touchAction:'none'}}
          onPointerDown={e=>{
            e.preventDefault();
            const btn=e.currentTarget;
            const fire=()=>{const v=Math.min(300,seqBpm+1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}};
            fire();
            btn._t=setTimeout(()=>{btn._iv=setInterval(fire,80);},400);
          }}
          onPointerUp={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}
          onPointerLeave={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}>+</button>

        {/* Divisor */}
        <div style={{width:1,height:26,background:'rgba(255,255,255,.1)',margin:'0 10px',flexShrink:0}}/>

        {/* Cifra — sin label */}
        <div style={{position:'relative',flexShrink:0}}>
          <select value={seqCifra}
            onChange={e=>{const c=e.target.value;setSeqCifra(c);if(clickActivo){stopClick();startClick(seqBpm,c);}}}
            style={{padding:'5px 20px 5px 8px',borderRadius:8,
              border:'1px solid rgba(255,255,255,.12)',
              background:'rgba(255,255,255,.07)',color:'var(--ac)',
              fontSize:14,fontWeight:700,
              fontFamily:"'Special Gothic Expanded One',sans-serif",
              outline:'none',WebkitAppearance:'none',appearance:'none',
              cursor:'pointer',minWidth:52}}>
            {CIFRAS.map(c=><option key={c} value={c} style={{background:'#0a0a0a'}}>{c}</option>)}
          </select>
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"
            style={{position:'absolute',right:5,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Divisor */}
        <div style={{width:1,height:26,background:'rgba(255,255,255,.1)',margin:'0 10px',flexShrink:0}}/>

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
        }} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
          background:'rgba(255,255,255,.05)',color:'var(--tx)',cursor:'pointer',
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
        }} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
          background:'rgba(255,255,255,.05)',color:'var(--tx)',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:6}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="5 4 15 12 5 20 5 4"/>
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5"/>
          </svg>
        </button>
      </div>

      </div>{/* fin área scrollable */}
      {/* ── Multitracks FUERA del scroll para touch libre ── */}
      <div style={{flexShrink:0,padding:'0 12px 10px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
      {/* ── Multitracks con faders (8+8) ── */}
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif",flex:1}}>Multitracks</div>
          {/* Selector Capa A/B */}
          <div style={{display:'inline-flex',borderRadius:16,border:'1px solid var(--bd)',overflow:'hidden'}}>
            {['A','B'].map(l=>(
              <button key={l} onClick={()=>setSeqLayer(l)}
                style={{padding:'3px 12px',border:'none',cursor:'pointer',fontSize:8,fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif",
                  background:seqLayer===l?'rgba(255,255,255,.12)':'transparent',
                  color:seqLayer===l?'var(--tx)':'var(--tx3)'}}>
                {l} <span style={{opacity:.5}}>{l==='A'?'1–8':'9–16'}</span>
              </button>
            ))}
          </div>
        </div>
        {seqData?.multitracks?(
          <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:5}}>
            {(seqLayer==='A'?seqData.multitracks.slice(0,8):seqData.multitracks.slice(8,16)).map((tr,li)=>{
              const i = seqLayer==='A'?li:li+8;
              const vol = trackVols[i]??80;
              const muted = trackMutes[i]??false;
              return(
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                  padding:'6px 3px 5px',borderRadius:10,overflow:'visible',
                  background:muted?'rgba(253,128,131,.08)':'rgba(255,255,255,.04)',
                  border:`1px solid ${muted?'rgba(253,128,131,.3)':'rgba(255,255,255,.07)'}`}}>
                  {/* Dot color */}
                  <div style={{width:5,height:5,borderRadius:'50%',background:muted?'rgba(253,128,131,.5)':tr.color,flexShrink:0}}/>
                  {/* Label */}
                  <div style={{fontSize:6,fontWeight:700,color:muted?'var(--tx3)':'var(--tx3)',
                    fontFamily:"'Lexend Giga',sans-serif",textAlign:'center',
                    width:'100%',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',
                    padding:'0 2px',flexShrink:0}}>{tr.label}</div>
                  {/* Fader Secuencia */}
                  <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'2px 0',overflow:'visible'}}>
                    <div className="fader-track"
                      style={{height:72}}>
                      <div className="fader-knob"
                        style={{bottom:`calc(${vol}% - 11px)`}}
                        onPointerDown={e=>{
                          e.preventDefault();
                          e.stopPropagation();
                          const knob=e.currentTarget;
                          const track=knob.parentElement;
                          knob.setPointerCapture(e.pointerId);
                          // Capturar rect UNA VEZ — no recalcular en cada move
                          const r=track.getBoundingClientRect();
                          const calc=ev=>Math.round((1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height)))*100);
                          setTrackVols(v=>{const n=[...v];n[i]=calc(e);return n;});
                          const move=ev=>{
                            ev.preventDefault();
                            setTrackVols(v=>{const n=[...v];n[i]=calc(ev);return n;});
                          };
                          const up=ev=>{
                            knob.releasePointerCapture(ev.pointerId);
                            knob.removeEventListener('pointermove',move);
                            knob.removeEventListener('pointerup',up);
                          };
                          knob.addEventListener('pointermove',move,{passive:false});
                          knob.addEventListener('pointerup',up,{once:true});
                        }}
                        onTouchStart={e=>e.stopPropagation()}
                      >{/* knob */}</div>
                    </div>
                  </div>
                  {/* Valor */}
                  <div style={{fontSize:7,fontWeight:700,color:muted?'var(--rd)':'var(--tx3)',
                    fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>{vol}</div>
                  {/* Mute */}
                  <button onClick={e=>{e.stopPropagation();setTrackMutes(m=>{const n=[...m];n[i]=!n[i];return n;})}}
                    style={{fontSize:6,fontWeight:900,padding:'2px 4px',borderRadius:4,border:'none',
                      cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0,
                      background:muted?'var(--rd)':'rgba(255,255,255,.08)',
                      color:muted?'#fff':'var(--tx3)'}}>
                    {muted?'MUTE':'M'}
                  </button>
                </div>
              );
            })}
          </div>
        ):(
          <div style={{padding:'16px',borderRadius:12,border:'1px dashed rgba(255,255,255,.1)',textAlign:'center'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Sin pistas para esta canción.</div>
          </div>
        )}
      </div>
      </div>
    </div>
    );
  };

  const MonitorPanel=()=>{
    const w=window.innerWidth,h=window.innerHeight;
    const isTabletH=w>=768&&w>h;
    const isMob=w<768;
    // Siempre 2 filas × 8 columnas — faders lo suficientemente grandes para deslizar con el dedo
    const panelH=isMob?'58vh':'50vh';
    const cols=8;
    const rows=2;
    const grid=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,cc)=>r*cols+cc).filter(i=>i<16));

    return(
      <div style={{position:'fixed',bottom:52,left:0,right:0,height:panelH,
        background:'rgba(4,4,16,.97)',borderTop:'2px solid rgba(48,192,183,.4)',
        backdropFilter:'blur(40px)',zIndex:50,
        transform:(bottomTab==='monitor'&&showMonitor)?'translateY(0)':'translateY(100%)',
        transition:'transform .3s cubic-bezier(.4,0,.2,1)',
        display:'flex',flexDirection:'column'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',
          borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={mesaConectada?'var(--gn)':'var(--tx3)'} strokeWidth="2">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <div>
              <div style={{fontSize:10,fontWeight:900,color:mesaConectada?'var(--gn)':'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",textTransform:'uppercase',letterSpacing:'1px',lineHeight:1}}>
                {mesaConectada?'Conectado':'Monitoreo'}
              </div>
              <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginTop:1}}>
                {mesaConectada?mesaNombre:'Sin conexión · modo demo'}
              </div>
            </div>
            {/* WiFi bars */}
            <div style={{display:'flex',alignItems:'flex-end',gap:1.5,marginLeft:4}}>
              {[0,1,2,3].map(b=>(
                <div key={b} style={{width:3,height:4+b*3,borderRadius:1,
                  background:mesaConectada&&b<=wifiStrength?'var(--gn)':'rgba(255,255,255,.15)'}}/>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Bus</span>
            {[1,2,3,4].map(b=>(
              <button key={b} onClick={()=>setMonitorBus(b)}
                style={{width:22,height:22,borderRadius:6,border:'none',cursor:'pointer',
                  background:monitorBus===b?'var(--gn)':'rgba(255,255,255,.08)',
                  color:monitorBus===b?'#000':'var(--tx3)',fontSize:9,fontWeight:900}}>
                {b}
              </button>
            ))}
            <button onClick={()=>setShowMonitor(false)}
              style={{width:22,height:22,borderRadius:6,border:'1px solid rgba(255,255,255,.15)',
                background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:16,
                display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
          </div>
        </div>
        {/* Selector capa A/B */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'5px 12px 4px',flexShrink:0}}>
          <div style={{fontSize:8,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif"}}>
            Monitor personal
          </div>
          <div style={{display:'inline-flex',borderRadius:16,border:'1px solid rgba(255,255,255,.1)',overflow:'hidden'}}>
            {['A','B'].map(l=>(
              <button key={l} onClick={()=>setMonitorLayer(l)}
                style={{padding:'3px 12px',border:'none',cursor:'pointer',fontSize:8,fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif",
                  background:monitorLayer===l?'rgba(48,192,183,.2)':'transparent',
                  color:monitorLayer===l?'var(--gn)':'var(--tx3)'}}>
                {l} <span style={{opacity:.5}}>{l==='A'?'1–8':'9–16'}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Fader grid — 8 canales por capa */}
        <div style={{flex:1,padding:'4px 10px 8px',display:'flex',gap:4,overflow:'hidden'}}>
          {Array.from({length:8},(_,li)=>{
            const ci=monitorLayer==='A'?li:li+8;
            const trackH=Math.max(50, (window.innerHeight*0.28)-20); // más bajo para dejar aire
            return(
              <div key={ci} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                padding:'5px 2px 4px',borderRadius:8,overflow:'visible',
                background:faderMutes[ci]?'rgba(253,128,131,.08)':'rgba(255,255,255,.04)',
                border:`1px solid ${faderMutes[ci]?'rgba(253,128,131,.3)':'rgba(255,255,255,.07)'}`,
                minWidth:0}}>
                <div style={{fontSize:6,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                  textAlign:'center',overflow:'hidden',whiteSpace:'nowrap',
                  width:'100%',textOverflow:'ellipsis',fontFamily:"'Lexend Giga',sans-serif",padding:'0 2px',flexShrink:0}}>
                  {FADER_NAMES[ci]}
                </div>
                {/* Fader + VU meter */}
                <div style={{flex:1,display:'flex',alignItems:'center',
                  justifyContent:'center',gap:4,padding:'4px 0',overflow:'visible'}}>
                  {/* VU meter LED — 12 segmentos verde/amarillo/rojo */}
                  <div style={{display:'flex',flexDirection:'column-reverse',gap:2,height:trackH,justifyContent:'flex-start',flexShrink:0}}>
                    {Array.from({length:12},(_,li)=>{
                      const threshold=(li/11)*100;
                      const lit=!faderMutes[ci]&&(faderVols[ci]>threshold);
                      const col=li>=10?'#FD8083':li>=8?'#f59e0b':'#30C0B7';
                      return(
                        <div key={li} style={{
                          width:4,flexShrink:0,
                          height:Math.floor((trackH-22)/12),
                          borderRadius:1,
                          background:lit?col:'rgba(255,255,255,.08)',
                          boxShadow:lit?`0 0 3px ${col}`:'none',
                          transition:'background .06s',
                        }}/>
                      );
                    })}
                  </div>
                  <div className="fader-track"
                    style={{height:trackH}}>
                    <div className="fader-knob"
                      style={{bottom:`calc(${faderVols[ci]}% - 14px)`}}
                      onPointerDown={e=>{
                        e.preventDefault();e.stopPropagation();
                        const knob=e.currentTarget;
                        const track=knob.parentElement;
                        knob.setPointerCapture(e.pointerId);
                        // Capturar rect UNA VEZ — no recalcular en cada move
                        const r=track.getBoundingClientRect();
                        const calc=ev=>Math.round((1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height)))*100);
                        setFaderVols(v=>{const n=[...v];n[ci]=calc(e);return n;});
                        const move=ev=>{ev.preventDefault();setFaderVols(v=>{const n=[...v];n[ci]=calc(ev);return n;});};
                        const up=ev=>{knob.releasePointerCapture(ev.pointerId);knob.removeEventListener('pointermove',move);knob.removeEventListener('pointerup',up);};
                        knob.addEventListener('pointermove',move,{passive:false});
                        knob.addEventListener('pointerup',up,{once:true});
                      }}
                      onTouchStart={e=>e.stopPropagation()}
                    >{/* knob */}</div>
                  </div>
                </div>
                <div style={{fontSize:7,fontWeight:700,color:faderMutes[ci]?'var(--rd)':'var(--tx3)',
                  fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>{faderVols[ci]}</div>
                <button onClick={e=>{e.stopPropagation();setFaderMutes(m=>{const n=[...m];n[ci]=!n[ci];return n;})}}
                  style={{fontSize:6,fontWeight:900,padding:'2px 5px',borderRadius:4,border:'none',
                    cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0,
                    background:faderMutes[ci]?'var(--rd)':'rgba(255,255,255,.08)',
                    color:faderMutes[ci]?'#fff':'var(--tx3)'}}>
                  {faderMutes[ci]?'MUTE':'M'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
        style={{position:'fixed',right:12,bottom:72,zIndex:20,display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.12)',backdropFilter:'blur(20px)',color:'var(--tx)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
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
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
            <div style={{fontSize:10,color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
              {curKey} · {song.bpm} BPM
              {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
            {songs.map((_,i)=>(<div key={i} style={{width:i===idx?14:6,height:4,borderRadius:2,background:i===idx?'var(--ac)':'rgba(255,255,255,.25)',transition:'all .3s'}}/>))}
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
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:10,color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
            {curKey} · {song.bpm} BPM
            {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
          </div>
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
      <BottomTabBar/>
    </div>
  );
}
