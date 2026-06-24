import { t as getT } from '../i18n';
// SongView: visor de canción con transposición, capo, anotaciones,
// vista bloques/lineal, Nashville, panel Estructura con drag touch.
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { tpKey } from '../utils/music';
import { Toast } from './common';
import { renderSongContent, CHORD_RE } from './songview/vistaLineal';
import { VistaBloques } from './songview/VistaBloques';
import { useMapaCancion } from './songview/useMapaCancion';
import { useAnotaciones } from './songview/useAnotaciones';
import { useAutoScroll, RANGO_SCROLL } from './songview/useAutoScroll';
import { PanelEstructura } from './songview/PanelEstructura';

const POPUP_SEEN_KEY = 'ss_bloques_popup_seen';

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
  const [viewMode,setViewMode]=useState('lineal');
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
        {perm.modoNashville&&(
          <div style={{position:'relative',flexShrink:0}}>
            <button ref={notacionBtnRef} onClick={()=>{
                if(!notacionOpen){
                  const r=notacionBtnRef.current.getBoundingClientRect();
                  setNotacionPos({top:r.bottom+6,right:window.innerWidth-r.right});
                }
                setNotacionOpen(o=>!o);
              }} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:notacion!=='americano'?'1px solid rgba(167,139,250,.5)':'1px solid var(--bd)',background:notacion!=='americano'?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',color:notacion!=='americano'?'#a78bfa':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",transition:'all .2s'}}>
              {NOTACION_LABELS[notacion]}
              <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:notacionOpen?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {notacionOpen&&notacionPos&&createPortal(
              <>
                {/* Capa invisible para cerrar el dropdown al tocar fuera */}
                <div onClick={()=>setNotacionOpen(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
                <div style={{position:'fixed',top:notacionPos.top,right:notacionPos.right,background:isLight?'rgba(240,234,222,.97)':'rgba(10,10,20,.97)',border:`2px solid ${svBd}`,borderRadius:14,padding:8,zIndex:999,minWidth:150,boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
                  <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8,padding:'0 4px'}}>
                    {lang==='en'?'Show notes as:':'Notas en:'}
                  </div>
                  {['americano','latino','grados'].map(opt=>{
                    const isOn=notacion===opt;
                    return(
                      <button key={opt} onClick={()=>{setNotacion(opt);setNotacionOpen(false);}}
                        style={{width:'100%',padding:'7px 10px',marginBottom:3,border:'none',borderRadius:8,background:isOn?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'all .15s'}}>
                        {isOn?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#a78bfa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:10,flexShrink:0}}/>}
                        <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:13,color:isOn?'#a78bfa':'var(--tx)',lineHeight:1}}>{NOTACION_LABELS[opt]}</span>
                      </button>
                    );
                  })}
                </div>
              </>,
              document.body
            )}
          </div>
        )}
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

  // ── ContentArea — Estructura y Tono en misma columna derecha ─────────────
  const ContentArea=()=>(
    <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      {viewMode==='bloques'
        ?<VistaBloques secuencia={getBloquesCancion()} tpOff={tpOff} showChords={showChords} notacion={notacion} curKey={curKey}/>
        :<>
          {/* Mapa Maestro horizontal — encima del contenido, sticky */}
          <MapaMaestro/>
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
        </>
      }
      {/* PanelTono — esquina superior derecha, mapa ahora es horizontal */}
      <div style={{position:'absolute',right:6,top:6,zIndex:4,pointerEvents:'none'}}>
        <div style={{pointerEvents:'all',width:64}}>
          <PanelTono/>
        </div>
      </div>
    </div>
  );


  // ── Monitor panel — estado centralizado en SongView ─────────────────────
  const FADER_NAMES=['Kick','Snare','Hi-Hat','Bass','Gtr 1','Gtr 2','Keys','Voz 1','Voz 2','Voz 3','Coros','Coros 2','Pad','Fx','Aux L','Aux R'];
  const [faderVols,setFaderVols]=useState(()=>FADER_NAMES.map(()=>75));
  const [faderMutes,setFaderMutes]=useState(()=>FADER_NAMES.map(()=>false));

  // ── Barra de pestañas inferior (Letra / Monitor / Secuencia) + Nav ──────
  const BottomTabBar=()=>{
    const canPrev = idx > 0;
    const isLast  = idx === songs.length - 1;

    // Icono Monitor: headphone SVG del logo + barras WiFi coloreadas al conectar
    const IconMonitor=({active})=>{
      const baseCol = mesaConectada ? 'var(--gn)' : active ? 'var(--ac)' : 'var(--tx3)';
      // Barras WiFi: 4 arcos de radio creciente, verdes cuando conectado
      const bars = [
        {r:3.5, sw:1.4},
        {r:6,   sw:1.6},
        {r:8.5, sw:1.8},
      ];
      return(
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
          {/* Auricular — headphone path del logo adaptado a 24x24 */}
          <path d="M12 4a8 8 0 0 0-8 8v4a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H6v-0.1A6 6 0 0 1 18 14v0h-1a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-4a8 8 0 0 0-8-8z"
            fill={baseCol} opacity="0.9"/>
          {/* Barras WiFi encima — salen del top del arco */}
          {mesaConectada&&bars.map((b,i)=>(
            <circle key={i} cx="12" cy="12" r={b.r}
              stroke="var(--gn)" strokeWidth={b.sw}
              fill="none" opacity={0.25+i*0.25}
              strokeDasharray={`${Math.PI*b.r*0.55} ${Math.PI*b.r*1.45}`}
              strokeDashoffset={Math.PI*b.r*0.72}
              strokeLinecap="round"
            />
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
      {id:null,      label:'Letra',    renderIcon:(a)=>(<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={a?'var(--ac)':'var(--tx3)'} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>)},
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
          style={{width:50,border:'none',background:'transparent',flexShrink:0,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
            color:canPrev?'var(--tx2)':'rgba(255,255,255,.15)',cursor:canPrev?'pointer':'default',
            borderTop:'2px solid transparent'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:7,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',fontFamily:"'Lexend Giga',sans-serif"}}>Ant</span>
        </button>

        {/* Tabs */}
        {tabs.map(tab=>{
          const isOn = bottomTab===tab.id;
          return(
            <button key={String(tab.id)} onClick={()=>{
              if(tab.id==='monitor') setShowMonitor(v=>!v);
              setBottomTab(isOn?null:tab.id);
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
          style={{width:50,border:'none',background:'transparent',flexShrink:0,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
            color:'var(--tx)',cursor:'pointer',borderTop:'2px solid transparent'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{fontSize:7,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',fontFamily:"'Lexend Giga',sans-serif"}}>{isLast?'Fin':'Sig'}</span>
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
  const startClick = (bpm) => {
    if(clickIntervalRef.current) clearInterval(clickIntervalRef.current);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    let beat = 0;
    const playBeat = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      // Downbeat: higher pitch + more volume; upbeats: lower
      osc.frequency.value = beat % 4 === 0 ? 1400 : 900;
      gain.gain.setValueAtTime(beat % 4 === 0 ? 0.5 : 0.25, now);
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
        minHeight:38,zIndex:5,
      }}>
        {guias.map((g,i)=>{
          const isActive = mapaSectionIdx===i;
          const pct = Math.max(7, Math.round((g.compases/totalComp)*100));
          return(
            <button key={i}
              onClick={()=>{
                setMapaSectionIdx(i);
                const el=document.getElementById('section-'+i);
                if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
                const compasInicio = guias.slice(0,i).reduce((s,g)=>s+(g.compases||4),0);
                const msPerCompas = (60000/(seqBpm||120))*4;
                window.dispatchEvent(new CustomEvent('setsync-mapa-seek',{
                  detail:{sectionIdx:i,compasInicio,msInicio:compasInicio*msPerCompas}
                }));
              }}
              style={{
                flexShrink:0,
                width:pct+'%',minWidth:narrow?32:48,
                border:'none',
                background:isActive?g.color+'18':'transparent',
                borderBottom:isActive?'2px solid '+g.color:'2px solid transparent',
                padding:'3px 4px 1px',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
                cursor:'pointer',transition:'all .15s',
              }}>
              <span style={{
                fontSize:narrow?7:9,fontWeight:700,
                color:isActive?g.color:'var(--tx3)',
                fontFamily:"'Lexend Giga',sans-serif",
                textTransform:'uppercase',letterSpacing:'.3px',
                whiteSpace:'nowrap',lineHeight:1.2,
              }}>{abrevLabel(g.label,narrow)}</span>
              <span style={{
                fontSize:6,color:isActive?g.color+'99':'rgba(255,255,255,.18)',
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
        {/* Fila 2: Cifra */}
        <div>
          <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,marginBottom:6}}>CIFRA</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5}}>
            {CIFRAS.map(c=>(
              <button key={c} onClick={()=>setSeqCifra(c)}
                style={{padding:'6px 2px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                  fontFamily:"'Outfit',sans-serif",
                  background:seqCifra===c?'var(--ac)':'rgba(255,255,255,.07)',
                  color:seqCifra===c?'#000':'var(--tx3)',transition:'all .15s',textAlign:'center'}}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Panel de Secuencia ────────────────────────────────────────────────────
  const SecuenciaPanel=()=>(
    <div style={{
      position:'fixed',bottom:52,left:0,right:0,
      background:'rgba(8,8,9,.98)',borderTop:'1px solid rgba(255,255,255,.1)',
      backdropFilter:'blur(40px)',zIndex:50,
      maxHeight:'60vh',overflowY:'auto',scrollbarWidth:'none',
      transform:bottomTab==='secuencia'?'translateY(0)':'translateY(100%)',
      transition:'transform .3s cubic-bezier(.4,0,.2,1)',
      padding:'14px 14px 24px',
      display:'flex',flexDirection:'column',gap:14,
    }}>

      {/* ── Click / Metrónomo con BPM y cifra editables ── */}
      <ClickPanel/>


      {/* ── Multitracks ── */}
      <div>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10,fontFamily:"'Lexend Giga',sans-serif"}}>Multitracks</div>
        {seqData?.multitracks?(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {seqData.multitracks.map((tr,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:tr.color,flexShrink:0}}/>
                <span style={{fontSize:11,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,flex:1}}>{tr.label}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
            ))}
          </div>
        ):(
          <div style={{padding:'20px',borderRadius:12,border:'1px dashed rgba(255,255,255,.1)',textAlign:'center'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.7}}>
              Sin pistas para esta canción.<br/>
              <span style={{color:'var(--ac)',cursor:'pointer'}}>Importar desde Google Drive →</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

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
        {/* Fader grid */}
        <div style={{flex:1,padding:'8px 10px',display:'flex',flexDirection:'column',gap:5,overflow:'hidden'}}>
          {grid.map((row,ri)=>(
            <div key={ri} style={{display:'flex',gap:4,flex:1}}>
              {row.map(ci=>(
                <div key={ci} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                  padding:'5px 2px 4px',borderRadius:8,
                  background:faderMutes[ci]?'rgba(253,128,131,.08)':'rgba(255,255,255,.04)',
                  border:`1px solid ${faderMutes[ci]?'rgba(253,128,131,.3)':'rgba(255,255,255,.07)'}`,
                  minWidth:0}}>
                  {/* Canal label */}
                  <div style={{fontSize:6,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                    letterSpacing:'.3px',textAlign:'center',overflow:'hidden',whiteSpace:'nowrap',
                    width:'100%',textOverflow:'ellipsis',fontFamily:"'Lexend Giga',sans-serif",padding:'0 2px',flexShrink:0}}>
                    {FADER_NAMES[ci]}
                  </div>
                  {/* Fader track — ocupa todo el espacio disponible */}
                  <div style={{flex:1,width:'100%',display:'flex',alignItems:'center',justifyContent:'center',padding:'4px 0'}}>
                    <div className="fader-track"
                      style={{position:'relative',width:22,height:'100%',minHeight:60,
                        background:'rgba(255,255,255,.08)',borderRadius:4,
                        touchAction:'none',userSelect:'none',WebkitUserSelect:'none'}}
                      onPointerDown={e=>{
                        e.preventDefault();
                        e.stopPropagation();
                        const el=e.currentTarget;
                        el.setPointerCapture(e.pointerId);
                        // Get fresh rect on every event for scroll-safe accuracy
                        const calc=ev=>{
                          const r=el.getBoundingClientRect();
                          const raw=(ev.clientY-r.top)/r.height;
                          return Math.round((1-Math.max(0,Math.min(1,raw)))*100);
                        };
                        setFaderVols(v=>{const n=[...v];n[ci]=calc(e);return n;}); // instant on touch
                        const move=ev=>{
                          ev.preventDefault();
                          setFaderVols(v=>{const n=[...v];n[ci]=calc(ev);return n;});
                        };
                        const up=ev=>{
                          el.releasePointerCapture(ev.pointerId);
                          el.removeEventListener('pointermove',move);
                          el.removeEventListener('pointerup',up);
                        };
                        el.addEventListener('pointermove',move,{passive:false});
                        el.addEventListener('pointerup',up,{once:true});
                      }}>
                      {/* Fill */}
                      <div className="fader-fill" style={{
                        height:`${faderVols[ci]}%`,
                        background:faderVols[ci]>80?'rgba(253,128,131,.5)':faderVols[ci]>50?'rgba(48,192,183,.6)':'rgba(255,255,255,.2)',
                      }}/>
                      {/* Thumb estilo X32 — sin transition para respuesta inmediata */}
                      <div className="fader-thumb" style={{
                        bottom:`calc(${faderVols[ci]}% - 11px)`,
                      }}/>
                    </div>
                  </div>
                  {/* Valor */}
                  <div style={{fontSize:7,fontWeight:700,color:faderMutes[ci]?'var(--rd)':'var(--tx3)',
                    fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
                    {faderVols[ci]}
                  </div>
                  {/* Mute */}
                  <button onClick={e=>{e.stopPropagation();setFaderMutes(m=>{const n=[...m];n[ci]=!n[ci];return n;})}}
                    style={{fontSize:6,fontWeight:900,padding:'2px 5px',borderRadius:4,border:'none',
                      cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0,
                      background:faderMutes[ci]?'var(--rd)':'rgba(255,255,255,.08)',
                      color:faderMutes[ci]?'#fff':'var(--tx3)'}}>
                    {faderMutes[ci]?'MUTE':'M'}
                  </button>
                </div>
              ))}
            </div>
          ))}
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
        {showModePopup&&<PopupModoBloques/>}
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
            <ToggleVista/>
            <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{idx+1}/{songs.length}</div>
          </div>
        </div>
        <AnnoBar/>
        <ContentArea/>
        <MonitorPanel/>
        <SecuenciaPanel/>
        <BottomTabBar/>
      </div>
    );
  }

  // ── Layout mobile <768px ──────────────────────────────────────────────────
  return(
    <div className={`sv${sidebarVisible?' sv-with-sidebar':''}${sidebarCollapsed?' sv-sb-col':''}`} style={{background:svBg,position:'fixed',inset:0,zIndex:100}}>
      {showSavePopup&&<PopupGuardar/>}
      {showModePopup&&<PopupModoBloques/>}
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
          <ToggleVista/>
          <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{idx+1}/{songs.length}</div>
        </div>
      </div>
      <AnnoBar/>
      <ContentArea/>
      <MonitorPanel/>
      <SecuenciaPanel/>
      <BottomTabBar/>
    </div>
  );
}
