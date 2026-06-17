import { t as getT } from '../i18n';
// SongView: visor de canción con transposición, capo, anotaciones,
// vista bloques/lineal, Nashville, panel Estructura con drag touch.
import { useState, useEffect, useRef, useCallback } from 'react';
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

export function SongView({songs,startIdx,onClose,theme="dark",isAdmin=false,onSaveChords,contentDB={},lang='es'}){
  const tx=getT(lang);
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
  const [toast,setToast]=useState(null);
  const [isTablet,setIsTablet]=useState(()=>window.innerWidth>=768);
  const [autoScroll,setAutoScroll]=useState(false);
  const [scrollSpeed,setScrollSpeed]=useState(RANGO_SCROLL.default);
  const [viewMode,setViewMode]=useState('bloques');
  const [showModePopup,setShowModePopup]=useState(false);
  const [nashville,setNashville]=useState(false);
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

  const doTp=steps=>{const nOff=tpOff+steps;setTpOff(nOff);setToast({text:`♩ ${tpKey(song.key,nOff)}`,sub:nOff===0?tx.original:`${nOff>0?'+':''}${nOff} st`});};
  const COLS=['#ff3b30','#0a84ff','#30d158','#ffd60a','#bf5af2'];
  // ── Panel Tono + Capo ─────────────────────────────────────────────────────
  const PanelTono=()=>(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',borderRadius:14,border:`1px solid ${svBd}`,background:isLight?'rgba(240,234,222,.85)':'rgba(6,4,18,.82)',backdropFilter:'blur(40px)',width:48,overflow:'visible',position:'relative'}}>
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
  const FaderVelocidad=()=>(
    <>
      <span style={{fontSize:9,color:'var(--tx3)',fontWeight:700,flexShrink:0}}>Lento</span>
      <input
        type="range"
        min={RANGO_SCROLL.min}
        max={RANGO_SCROLL.max}
        value={scrollSpeed}
        onChange={e=>setScrollSpeed(Number(e.target.value))}
        style={{flex:1,accentColor:'var(--gn)'}}
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
        <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,border:showAnnoBar?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:showAnnoBar?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <div style={{flex:1,flexShrink:0,minWidth:4}}/>
        {capo>0&&(
          <div style={{padding:'3px 8px',borderRadius:100,background:'rgba(94,206,160,.1)',border:'1px solid rgba(94,206,160,.25)',fontSize:10,fontWeight:700,color:'var(--gn)',flexShrink:0}}>
            Capo {capo} · {sonaKey}
          </div>
        )}
        {/* Nashville toggle */}
        <button onClick={()=>setNashville(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:nashville?'1px solid rgba(167,139,250,.5)':'1px solid var(--bd)',background:nashville?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',color:nashville?'#a78bfa':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0,transition:'all .2s'}}>
          {nashville?'I IV V':tx.notes}
        </button>
        <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:!showChords?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:!showChords?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          {showChords?tx.lyricsOnly:tx.withChords}
        </button>
        <button onClick={()=>{const next=!autoScroll;setAutoScroll(next);resetScroll();if(next&&!isTablet)setShowSpeedPopup(true);}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:autoScroll?'1px solid rgba(94,206,160,.5)':'1px solid var(--bd)',background:autoScroll?'rgba(94,206,160,.15)':'rgba(255,255,255,.04)',color:autoScroll?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",flexShrink:0,transition:'all .2s'}}>
          {autoScroll?<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          {tx.autoScroll}
        </button>
        {autoScroll&&!isTablet&&(
          <button onClick={()=>setShowSpeedPopup(true)} title="Ajustar velocidad" style={{display:'flex',alignItems:'center',justifyContent:'center',width:26,height:26,borderRadius:8,border:'1px solid rgba(94,206,160,.35)',background:'rgba(94,206,160,.1)',color:'var(--gn)',cursor:'pointer',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
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
      {autoScroll&&isTablet&&(
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 10px 7px'}}>
          <FaderVelocidad/>
        </div>
      )}
      {showSpeedPopup&&!isTablet&&<PopupVelocidad/>}
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
        ?<VistaBloques secuencia={getBloquesCancion()} tpOff={tpOff} showChords={showChords} nashville={nashville} curKey={curKey}/>
        :<>
          <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',width:'100%',height:'100%',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
            onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
            onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
          />
          <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 78px 60px 10px',display:'flex',alignItems:'flex-start',justifyContent:'flex-start'}}>
            {song.docId
              ?<iframe src={`https://docs.google.com/document/d/${song.docId}/preview`} allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none',zIndex:1}}/>
              :<div style={{width:'100%'}}>{renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,steps)=>handleDragChord(li,ci,steps),nashville,curKey)}</div>
            }
          </div>
        </>
      }
      {/* Columna derecha: Estructura pegada arriba-derecha, Tono abajo-derecha */}
      <div style={{position:'absolute',right:6,top:6,zIndex:4,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,pointerEvents:'none'}}>
        <div style={{pointerEvents:'all',flex:'0 0 auto'}}>
          <PanelEstructura
            seq={getActiveMapaCancion()}
            isLight={isLight}
            onReordenar={reordenarMapa}
            onDuplicar={duplicarBloqueMapa}
            onEliminar={eliminarBloqueMapa}
            onReset={resetMapa}
          />
        </div>
        <div style={{pointerEvents:'all',flex:'0 0 auto'}}>
          <PanelTono/>
        </div>
      </div>
    </div>
  );

  // ── NavBar — botones flotantes, sin título ───────────────────────────────
  const NavBar=()=>(
    <>
      {idx>0&&(
        <button onClick={()=>setIdx(i=>i-1)}
          style={{position:'fixed',left:12,bottom:20,zIndex:20,display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:100,border:'1px solid var(--bd)',background:'rgba(10,10,20,.88)',backdropFilter:'blur(20px)',color:'var(--tx2)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          {tx.previous}
        </button>
      )}
      <button onClick={()=>{if(idx===songs.length-1)onClose();else setIdx(i=>i+1);}}
        style={{position:'fixed',right:12,bottom:20,zIndex:20,display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.12)',backdropFilter:'blur(20px)',color:'var(--tx)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
        {idx===songs.length-1?tx.done:tx.next}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </>
  );

  // ── Layout tablet ≥768px ──────────────────────────────────────────────────
  if(isTablet){
    return(
      <div className="sv" style={{flexDirection:'row',background:svBg,position:'fixed',inset:0,zIndex:100}}>
        {showSavePopup&&<PopupGuardar/>}
        {showModePopup&&<PopupModoBloques/>}
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid var(--bd)',background:'rgba(6,6,14,.95)',backdropFilter:'blur(20px)'}}>
          <div style={{padding:'12px 14px 10px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:8}}>
            <div className="sv-back" onClick={()=>{if(editMode&&editedSongs[song?.name]){setShowSavePopup(true);}else onClose();}}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:13,color:'var(--tx)'}}>SetSync</div>
              <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{songs.length} canciones</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',scrollbarWidth:'thin'}}>
            {songs.map((s,i)=>(
              <div key={i} onClick={()=>setIdx(i)} style={{padding:'11px 14px',borderBottom:'1px solid rgba(255,255,255,.05)',cursor:'pointer',background:i===idx?'rgba(200,169,126,.1)':'transparent',transition:'background .15s',borderLeft:`3px solid ${i===idx?'var(--ac)':'transparent'}`}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:i===idx?900:700,fontSize:12,color:i===idx?'var(--ac)':'var(--tx)',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',display:'flex',gap:8}}>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:700}}>{s.key}</span>
                  <span>{s.bpm} BPM</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'11px 14px',borderTop:'1px solid var(--bd)',background:'rgba(200,169,126,.04)'}}>
            <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:4}}>Activa</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:12,color:'var(--ac)',marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{padding:'2px 7px',borderRadius:100,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.2)',fontSize:10,fontWeight:900,color:'var(--ac)',fontFamily:"'Outfit',sans-serif"}}>{curKey}</span>
              {capo>0&&<span style={{fontSize:10,color:'var(--gn)',fontWeight:700}}>· Capo {capo} → {sonaKey}</span>}
            </div>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',background:'rgba(6,6,14,.85)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
              <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginTop:1}}>
                {curKey} · {song.bpm} BPM
                {capo>0&&<span style={{color:'var(--gn)',marginLeft:8}}>· Capo {capo} suena {sonaKey}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
              {songs.map((_,i)=>(<div key={i} style={{width:i===idx?14:6,height:4,borderRadius:2,background:i===idx?'var(--ac)':'var(--tx3)',transition:'all .3s'}}/>))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
              <ToggleVista/>
              <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{idx+1}/{songs.length}</div>
            </div>
          </div>
          <AnnoBar/>
          <ContentArea/>
          <NavBar/>
        </div>
      </div>
    );
  }

  // ── Layout mobile <768px ──────────────────────────────────────────────────
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
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <ToggleVista/>
          <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{idx+1}/{songs.length}</div>
        </div>
      </div>
      <AnnoBar/>
      <ContentArea/>
      <NavBar/>
    </div>
  );
}
