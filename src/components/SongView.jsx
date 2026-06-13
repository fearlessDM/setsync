// SongView: visor de canción con transposición, capo, anotaciones (dibujo a mano),
// edición de acordes y layouts adaptativos desktop/tablet/mobile.
import { useState, useEffect, useRef } from 'react';
import { transposeChord, tpKey } from '../utils/music';
import { Toast } from './common';
import { SONG_CONTENT_IGLESIA } from '../data/songs-iglesia';

export function renderSongContent(raw,tpOff,showChords,editMode,selectedChord,onSelectChord,onMoveChord){
  if(!raw)return(<div style={{color:'var(--tx3)',textAlign:'center',padding:'40px 0',fontSize:13,fontFamily:"'Lato',sans-serif"}}>Letra no disponible aún.</div>);

  const CHORD_RE=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
  const screenW=typeof window!=='undefined'?window.innerWidth:390;
  const fs  =Math.min(14,Math.max(11,Math.floor(screenW/30)));
  const cFs =Math.max(10,fs-2);
  const sFs =Math.max(7,fs-4);
  const FONT="'Albert Sans',sans-serif";
  const LATO="'Lato',sans-serif";

  const trC=(ch)=>{
    if(!tpOff)return ch;
    const p=ch.split('/');
    return p.length>1?transposeChord(p[0],tpOff)+'/'+transposeChord(p[1],tpOff):transposeChord(ch,tpOff);
  };

  const lines=raw.split('\n');
  let start=0;
  for(let i=0;i<Math.min(4,lines.length);i++){
    const l=lines[i].trim();
    if(!l||(!l.includes('[')&&!l.startsWith('===')))start=i+1;
    else break;
  }

  const blocks=[];
  let curLabel=null,curLines=[];
  lines.slice(start).forEach(line=>{
    const t=line.trim();
    if(t.startsWith('===')&&t.endsWith('===')){
      if(curLines.length||curLabel!==null){blocks.push({label:curLabel,lines:curLines});curLines=[];}
      curLabel=t.slice(3,-3).replace(/:$/,'').trim().toUpperCase();
    } else { curLines.push(t); }
  });
  if(curLines.length||curLabel!==null)blocks.push({label:curLabel,lines:curLines});

  const maxLW=blocks.reduce((mx,b)=>b.label?Math.max(mx,b.label.length):mx,0);
  const labelPx=maxLW>0?Math.ceil(maxLW*(sFs*0.62))+10:0;

  // Contar acordes totales para ID único
  let globalChordIdx=0;

  const renderLine=(text,lineIdx,key)=>{
    CHORD_RE.lastIndex=0;
    const hasC=CHORD_RE.test(text);
    CHORD_RE.lastIndex=0;
    if(!text.trim())return null;

    if(!hasC||!showChords){
      const lyric=text.replace(CHORD_RE,'').trim();
      if(!lyric)return null;
      return(
        <div key={key} style={{
          fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,
          lineHeight:1.2,textTransform:'uppercase',
          textAlign:'center',width:'100%',marginBottom:1,
        }}>{lyric}</div>
      );
    }

    const parts=[];
    let last=0,m;
    CHORD_RE.lastIndex=0;
    while((m=CHORD_RE.exec(text))!==null){
      if(m.index>last)parts.push({c:'',t:text.slice(last,m.index)});
      parts.push({c:trC(m[1]),rawC:m[1],t:''});
      last=m.index+m[0].length;
    }
    if(last<text.length)parts.push({c:'',t:text.slice(last)});

    const groups=[];
    let i2=0;
    while(i2<parts.length){
      if(parts[i2].c){
        const txt=i2+1<parts.length&&!parts[i2+1].c?parts[i2+1].t:'';
        groups.push({c:parts[i2].c,rawC:parts[i2].rawC,t:txt,ci:globalChordIdx++});
        i2+=txt?2:1;
      } else {
        groups.push({c:'',t:parts[i2].t,ci:-1});
        i2++;
      }
    }

    const hasChords=groups.some(g=>g.c);
    return(
      <div key={key} style={{
        display:'flex',flexWrap:'nowrap',
        justifyContent:'center',
        width:'100%',marginBottom:hasChords?3:1,
        alignItems:'flex-end',overflow:'visible',
      }}>
        {groups.map((g,j)=>{
          const isSelected=editMode&&selectedChord&&selectedChord.lineKey===key&&selectedChord.ci===g.ci;
          return(
            <div key={j} style={{
              display:'inline-flex',flexDirection:'column',
              alignItems:'flex-start',flexShrink:0,
              position:'relative',
            }}>
              {hasChords&&(
                editMode&&g.c?(
                  // Modo edición: acorde tocable con controles
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
                    {isSelected&&(
                      <div style={{display:'flex',gap:2,marginBottom:1}}>
                        <button
                          onClick={(e)=>{e.stopPropagation();onMoveChord(lineIdx,g.ci,'left');}}
                          style={{
                            fontSize:9,padding:'1px 4px',borderRadius:3,border:'1px solid var(--ac)',
                            background:'rgba(200,169,126,.2)',color:'var(--ac)',cursor:'pointer',
                            fontWeight:900,lineHeight:1,
                          }}>←</button>
                        <button
                          onClick={(e)=>{e.stopPropagation();onMoveChord(lineIdx,g.ci,'right');}}
                          style={{
                            fontSize:9,padding:'1px 4px',borderRadius:3,border:'1px solid var(--ac)',
                            background:'rgba(200,169,126,.2)',color:'var(--ac)',cursor:'pointer',
                            fontWeight:900,lineHeight:1,
                          }}>→</button>
                      </div>
                    )}
                    <span
                      onClick={()=>onSelectChord({lineKey:key,ci:g.ci,lineIdx})}
                      style={{
                        fontSize:cFs,fontWeight:800,
                        color:isSelected?'#fff':'var(--ac)',
                        lineHeight:1,fontFamily:FONT,
                        whiteSpace:'nowrap',display:'block',
                        paddingRight:g.t?1:3,
                        background:isSelected?'var(--ac)':'transparent',
                        borderRadius:3,padding:isSelected?'1px 3px':'0',
                        cursor:'pointer',
                        border:editMode?'1px dashed rgba(200,169,126,.4)':'none',
                      }}>{g.c}</span>
                  </div>
                ):(
                  <span style={{
                    fontSize:cFs,fontWeight:800,
                    color:g.c?'var(--ac)':'transparent',
                    lineHeight:1,fontFamily:FONT,
                    whiteSpace:'nowrap',display:'block',
                    paddingRight:g.t?1:3,
                  }}>{g.c||'·'}</span>
                )
              )}
              <span style={{
                fontSize:fs,fontWeight:700,
                color:g.t?'var(--tx)':'transparent',
                lineHeight:1.2,fontFamily:FONT,
                whiteSpace:'pre',textTransform:'uppercase',
                display:'block',
              }}>{g.t||' '}</span>
            </div>
          );
        })}
      </div>
    );
  };

  let lineCounter=0;
  return(
    <div style={{width:'100%',padding:'2px 4px 12px',
      outline:editMode?'2px dashed rgba(200,169,126,.25)':'none',
      borderRadius:editMode?8:0,
    }}>
      {editMode&&(
        <div style={{textAlign:'center',fontSize:10,color:'var(--ac)',fontFamily:LATO,
          fontWeight:700,letterSpacing:'1px',padding:'4px 0 8px',textTransform:'uppercase',opacity:.8}}>
          ✏ Toca un acorde y usa ← → para moverlo
        </div>
      )}
      {blocks.map((blk,bi)=>{
        const blines=blk.lines.filter((l,i,a)=>
          !((!l.trim())&&(i===0||i===a.length-1))
        );
        if(!blines.length&&!blk.label)return null;
        return(
          <div key={bi} style={{
            marginTop:bi===0?0:fs*0.85,
            background:'transparent',
            borderTop:bi===0?'none':'1px solid rgba(255,255,255,.06)',
            paddingTop:bi===0?0:4,
          }}>
            {blines.map((line,li)=>{
              if(!line.trim())return<div key={li} style={{height:fs*0.2}}/>;
              const isFirst=li===0;
              const thisLineIdx=lineCounter++;
              return(
                <div key={li} style={{display:'flex',alignItems:'flex-end',width:'100%'}}>
                  <div style={{
                    width:labelPx,minWidth:labelPx,flexShrink:0,
                    paddingRight:4,display:'flex',alignItems:'flex-end',paddingBottom:2,
                  }}>
                    {blk.label&&isFirst&&(
                      <span style={{
                        fontSize:sFs,fontWeight:900,color:'var(--tx3)',
                        fontFamily:LATO,textTransform:'uppercase',
                        letterSpacing:'1.2px',whiteSpace:'nowrap',opacity:.8,
                      }}>{blk.label}</span>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    {renderLine(line,thisLineIdx,'l'+li+'_'+bi)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function SongView({songs,startIdx,onClose,theme="dark",isAdmin=false,onSaveChords}){
  const [idx,setIdx]=useState(startIdx);
  const [tpOff,setTpOff]=useState(0);
  const [tool,setTool]=useState('draw');
  const [color,setColor]=useState('#ff3b30');
  const [sz,setSz]=useState(4);
  const [showChords,setShowChords]=useState(true);
  const [showAnnoBar,setShowAnnoBar]=useState(false);
  const [capo,setCapo]=useState(0);
  const [editMode,setEditMode]=useState(false);
  const [selectedChord,setSelectedChord]=useState(null); // {lineIdx, chordIdx}
  const [editedSongs,setEditedSongs]=useState({});
  const [capoOpen,setCapoOpen]=useState(false);
  const [toast,setToast]=useState(null);
  const [isTablet,setIsTablet]=useState(()=>window.innerWidth>=768);

  // ── Editor de acordes ────────────────────────────────────────────────────
  const getSongContent=(song)=>editedSongs[song.name]||SONG_CONTENT_IGLESIA[song.name]||null;

  const handleMoveChord=(lineIdx,chordIdx,dir)=>{
    const song=songs[idx];
    const raw=getSongContent(song)||'';
    // Reconstruir líneas, encontrar la línea correcta, mover el acorde
    const allLines=raw.split('\n');
    // Saltar header (título/artista)
    let contentStart=0;
    for(let i=0;i<Math.min(4,allLines.length);i++){
      const l=allLines[i].trim();
      if(!l||(!l.includes('[')&&!l.startsWith('===')))contentStart=i+1;
      else break;
    }
    // Contar líneas de contenido para llegar a lineIdx
    let counter=0;
    let targetAbsIdx=-1;
    for(let i=contentStart;i<allLines.length;i++){
      const t=allLines[i].trim();
      if(t.startsWith('===')&&t.endsWith('==='))continue;
      if(!t)continue;
      if(counter===lineIdx){targetAbsIdx=i;break;}
      counter++;
    }
    if(targetAbsIdx<0)return;

    // En la línea encontrada, mover el acorde chordIdx
    const line=allLines[targetAbsIdx];
    const CHORD_RE=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
    const chords=[];
    let m;
    CHORD_RE.lastIndex=0;
    while((m=CHORD_RE.exec(line))!==null){
      chords.push({start:m.index,end:m.index+m[0].length,full:m[0]});
    }
    // Encontrar el acorde por índice
    let ci=0;
    // contar solo los acordes de esta línea hasta chordIdx
    if(ci>=chords.length)return;
    // Mapear chordIdx global a índice local en esta línea
    // (simplificación: usar el primer acorde si chordIdx=0, etc.)
    const localIdx=chordIdx%Math.max(1,chords.length);
    const chord=chords[localIdx];
    if(!chord)return;

    let newLine=line;
    if(dir==='left'&&chord.start>0){
      // Mover el tag del acorde un carácter a la izquierda
      const before=line.slice(0,chord.start);
      const after=line.slice(chord.end);
      // Quitar último char de before, ponerlo antes en after
      if(before.length>0){
        newLine=before.slice(0,-1)+chord.full+before.slice(-1)+after;
      }
    } else if(dir==='right'){
      const before=line.slice(0,chord.start);
      const after=line.slice(chord.end);
      // Mover un char a la derecha
      if(after.length>0){
        newLine=before+after[0]+chord.full+after.slice(1);
      }
    }

    if(newLine===line)return;
    const newLines=[...allLines];
    newLines[targetAbsIdx]=newLine;
    const newContent=newLines.join('\n');
    setEditedSongs(prev=>({...prev,[song.name]:newContent}));
  };

  const handleSaveEdit=()=>{
    const song=songs[idx];
    const edited=editedSongs[song.name];
    if(edited&&onSaveChords){
      onSaveChords(song.name,edited);
      setToast('✓ Acordes guardados oficialmente');
    }
    setEditMode(false);
    setSelectedChord(null);
  };

  // Colores según tema — funciona incluso con position:fixed
  const isLight = theme==='cream';
  const svBg      = isLight ? '#ffffff'           : 'rgba(4,4,12,.97)';
  const svHdrBg   = isLight ? 'rgba(240,234,222,.98)' : 'rgba(5,5,14,.92)';
  const svNavBg   = isLight ? 'rgba(235,228,215,.98)' : 'rgba(5,5,14,.88)';
  const svTx      = isLight ? '#1a1208'           : 'var(--tx)';
  const svTx2     = isLight ? '#4a3828'           : 'var(--tx2)';
  const svTx3     = isLight ? '#8a7058'           : 'var(--tx3)';
  const svAc      = isLight ? '#D4500A'           : 'var(--ac)';
  const svBd      = isLight ? 'rgba(0,0,0,.15)'   : 'var(--bd)';
  const svPanelBg = isLight ? 'rgba(240,234,222,.97)' : 'rgba(8,8,20,.92)';

  useEffect(()=>{
    const h=()=>setIsTablet(window.innerWidth>=768);
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);

  const cvRef=useRef(null);
  const wrapRef=useRef(null);
  const strokes=useRef([]);
  const drawing=useRef(false);
  const cur=useRef(null);

  const song=songs[idx];
  const curKey=tpKey(song.key,tpOff);
  // Nota que SUENA realmente con el capo puesto
  const sonaKey=tpKey(curKey,-capo);

  useEffect(()=>{setTpOff(0);setShowAnnoBar(false);setCapo(0);setCapoOpen(false);},[idx]);
  useEffect(()=>{
    const cv=cvRef.current,w=wrapRef.current;
    if(!cv||!w)return;
    const resize=()=>{cv.width=w.clientWidth;cv.height=w.clientHeight;redraw();};
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(w);
    return()=>ro.disconnect();
  },[idx]);

  const getP=e=>{const r=cvRef.current.getBoundingClientRect();const s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};};
  const applyS=s=>{const ctx=cvRef.current.getContext('2d');const t=s?.type||tool,c2=s?.color||color,sz2=s?.sz||sz;if(t==='erase'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=sz2*4;}else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=c2;ctx.lineWidth=sz2;}ctx.lineCap='round';ctx.lineJoin='round';};
  const redraw=()=>{const cv=cvRef.current;if(!cv)return;const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);strokes.current.forEach(s=>{if(s.pts.length<2)return;ctx.beginPath();applyS(s);ctx.moveTo(s.pts[0].x,s.pts[0].y);s.pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();});ctx.globalCompositeOperation='source-over';};
  const startD=e=>{if(tool==='text'||!showAnnoBar)return;drawing.current=true;const p=getP(e);cur.current={type:tool,color,sz,pts:[p]};const ctx=cvRef.current.getContext('2d');ctx.beginPath();ctx.moveTo(p.x,p.y);applyS();};
  const moveD=e=>{if(!drawing.current||!cur.current)return;const p=getP(e);cur.current.pts.push(p);const ctx=cvRef.current.getContext('2d');ctx.lineTo(p.x,p.y);ctx.stroke();};
  const endD=()=>{if(!drawing.current)return;drawing.current=false;if(cur.current?.pts.length>1)strokes.current.push(cur.current);cur.current=null;const ctx=cvRef.current.getContext('2d');ctx.globalCompositeOperation='source-over';};
  const undo=()=>{strokes.current.pop();redraw();};
  const clear=()=>{strokes.current=[];const ctx=cvRef.current?.getContext('2d');ctx?.clearRect(0,0,cvRef.current.width,cvRef.current.height);};
  const doTp=steps=>{const nOff=tpOff+steps;setTpOff(nOff);setToast({text:`♩ ${tpKey(song.key,nOff)}`,sub:nOff===0?'Tono original':`${nOff>0?'+':''}${nOff} st`});};
  const COLS=['#ff3b30','#0a84ff','#30d158','#ffd60a','#bf5af2'];

  // ── Panel Tono + Capo desplegable ──────────────────────────────────────────
  const PanelTono=()=>(
    <div style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',zIndex:3,display:'flex',flexDirection:'column',alignItems:'center',gap:0,borderRadius:14,border:`1px solid ${svBd}`,background:isLight?'rgba(240,234,222,.12)':'rgba(4,4,12,.10)',backdropFilter:'blur(40px)',width:48,overflow:'visible'}}>
      <button onClick={()=>doTp(1)} style={{width:'100%',padding:'7px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)',borderRadius:'14px 14px 0 0'}}>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        <span style={{fontSize:8,fontWeight:900,color:'var(--tx3)',letterSpacing:'.5px'}}>#</span>
      </button>
      <div style={{width:'100%',padding:'6px 0',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>
        <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:16,color:svAc,lineHeight:1}}>{curKey}</div>
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
        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:capoOpen?'rotate(180deg)':'none',transition:'transform .2s',marginTop:1}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {capoOpen&&(
        <div style={{position:'absolute',right:60,top:'50%',transform:'translateY(-50%)',background:isLight?'rgba(240,234,222,.97)':'rgba(10,10,20,.97)',backdropFilter:'blur(0px)',border:`2px solid ${svBd}`,borderRadius:14,padding:12,zIndex:10,minWidth:140,boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Posición de capo</div>
          {[0,1,2,3,4,5,6,7].map(c=>{
            const notaSuena=c===0?curKey:tpKey(curKey,-c);
            const isOn=capo===c;
            return(
              <button key={c} onClick={()=>{setCapo(c);setCapoOpen(false);setToast(c===0?{text:'Sin capo',sub:'Tono original'}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                style={{width:'100%',padding:'7px 10px',marginBottom:3,border:'none',borderRadius:8,background:isOn?'rgba(200,169,126,.15)':'rgba(255,255,255,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {isOn?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--ac)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:10}}/>}
                  <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:13,color:isOn?'var(--ac)':'var(--tx)',lineHeight:1}}>
                    {c===0?'Sin capo':c}
                  </span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,fontWeight:900,color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'Albert Sans',sans-serif",fontWeight:700}}>{notaSuena}</div>
                  {c>0&&<div style={{fontSize:8,color:'var(--tx3)',marginTop:1}}>suena</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Barra de anotaciones ──────────────────────────────────────────────────
  const AnnoBar=()=>(
    <div style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px'}}>
        <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,border:showAnnoBar?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:showAnnoBar?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0,transition:'all .15s'}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Anotar
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:showAnnoBar?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div style={{flex:1}}/>
        {capo>0&&(
          <div style={{padding:'3px 8px',borderRadius:100,background:'rgba(94,206,160,.1)',border:'1px solid rgba(94,206,160,.25)',fontSize:10,fontWeight:700,color:'var(--gn)',flexShrink:0}}>
            Capo {capo} · suena {sonaKey}
          </div>
        )}
        <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:!showChords?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:!showChords?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          {showChords?'Solo letra':'Con acordes'}
        </button>
        {isAdmin&&(
          <>
          <button onClick={()=>{if(editMode){setEditMode(false);setSelectedChord(null);}else{setEditMode(true);}}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:editMode?'1px solid var(--ac)':'1px solid rgba(200,169,126,.28)',background:editMode?'rgba(200,169,126,.15)':'rgba(200,169,126,.07)',color:'var(--ac)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {editMode?'Cancelar':'Editar'}
          </button>
          {editMode&&editedSongs[songs[idx]?.name]&&(
            <button onClick={handleSaveEdit} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:'1px solid rgba(94,206,160,.5)',background:'rgba(94,206,160,.15)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Publicar
            </button>
          )}
          </>
        )}
        <button onClick={()=>setToast({text:'Guardado',sub:'Anotaciones en tu dispositivo'})} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:'1px solid rgba(94,206,160,.28)',background:'rgba(94,206,160,.07)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Guardar
        </button>
      </div>
      {showAnnoBar&&(
        <div style={{display:'flex',alignItems:'center',gap:3,padding:'0 10px 5px',overflowX:'auto',scrollbarWidth:'none'}}>
          {[['draw','Lápiz'],['erase','Borrar']].map(([t,l])=>(
            <button key={t} onClick={()=>setTool(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,border:tool===t?'1px solid var(--bd)':'1px solid transparent',background:tool===t?'rgba(255,255,255,.09)':'transparent',color:tool===t?'var(--tx)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>{l}</button>
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
    </div>
  );

  // ── Área de contenido (canvas + letra) ───────────────────────────────────
  const ContentArea=({padRight=12})=>(
    <div style={{flex:1,position:'relative',overflow:'hidden'}}>
      <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
        onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
        onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
      />
      <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 10px 10px 10px',display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
        {song.docId
          ?<iframe src={`https://docs.google.com/document/d/${song.docId}/preview`} allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none',zIndex:1}}/>
          :<div style={{width:'100%'}}>{renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,dir)=>handleMoveChord(li,ci,dir))}</div>
        }
      </div>
      <PanelTono/>
    </div>
  );

  // ── Nav inferior ──────────────────────────────────────────────────────────
  const NavBar=()=>(
    <div className="sv-nav" style={{background:svNavBg,borderTop:`1px solid ${svBd}`}}>
      <button className="nb" disabled={idx===0} onClick={()=>setIdx(i=>i-1)}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Anterior
      </button>
      <div className="sv-ni">
        <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:13,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
        <div style={{fontSize:9,color:svTx3,marginTop:1,fontWeight:700}}>Canción {idx+1} de {songs.length}</div>
      </div>
      <button className="nb p" onClick={()=>{if(idx===songs.length-1)onClose();else setIdx(i=>i+1);}}>
        {idx===songs.length-1?'Listo':'Siguiente'}<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );

    // LAYOUT IPAD / TABLET ≥768px — horizontal con panel de setlist
    if(isTablet){
    return(
      <div className="sv" style={{flexDirection:'row',background:svBg}}>
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid var(--bd)',background:'rgba(6,6,14,.95)',backdropFilter:'blur(20px)'}}>
          <div style={{padding:'12px 14px 10px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:8}}>
            <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:13,color:'var(--tx)'}}>SetSync</div>
              <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{songs.length} canciones</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',scrollbarWidth:'thin'}}>
            {songs.map((s,i)=>(
              <div key={i} onClick={()=>setIdx(i)} style={{padding:'11px 14px',borderBottom:'1px solid rgba(255,255,255,.05)',cursor:'pointer',background:i===idx?'rgba(200,169,126,.1)':'transparent',transition:'background .15s',borderLeft:`3px solid ${i===idx?'var(--ac)':'transparent'}`}}>
                <div style={{fontFamily:"'Lato',sans-serif",fontWeight:i===idx?900:700,fontSize:12,color:i===idx?'var(--ac)':'var(--tx)',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',display:'flex',gap:8}}>
                  <span style={{fontFamily:"'Source Code Pro',monospace",fontWeight:700}}>{s.key}</span>
                  <span>{s.bpm} BPM</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'11px 14px',borderTop:'1px solid var(--bd)',background:'rgba(200,169,126,.04)'}}>
            <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:4}}>Activa</div>
            <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:12,color:'var(--ac)',marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{padding:'2px 7px',borderRadius:100,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.2)',fontSize:10,fontWeight:900,color:'var(--ac)',fontFamily:"'Source Code Pro',monospace"}}>{curKey}</span>
              {capo>0&&<span style={{fontSize:10,color:'var(--gn)',fontWeight:700}}>· Capo {capo} → {sonaKey}</span>}
            </div>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',background:'rgba(6,6,14,.85)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:17,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
              <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginTop:1}}>
                {song.role||'Guitarra'} · {curKey} · {song.bpm} BPM
                {capo>0&&<span style={{color:'var(--gn)',marginLeft:8}}>· Capo {capo} suena {sonaKey}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
              {songs.map((_,i)=>(<div key={i} style={{width:i===idx?14:6,height:4,borderRadius:2,background:i===idx?'var(--ac)':'var(--tx3)',transition:'all .3s'}}/>))}
            </div>
            <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700,flexShrink:0}}>{idx+1}/{songs.length}</div>
          </div>
          <AnnoBar/>
          <ContentArea padRight={12}/>
          <NavBar/>
        </div>
      </div>
    );
  }

    // LAYOUT MOBILE < 768px
    return(
    <div className="sv" style={{background:svBg}}>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div className="sv-hdr" style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`}}>
        <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:17,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:10,color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
            {song.role||'Guitarra'} · {curKey} · {song.bpm} BPM
            {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
          </div>
        </div>
        <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700,flexShrink:0}}>{idx+1}/{songs.length}</div>
      </div>
      <AnnoBar/>
      <ContentArea padRight={12}/>
      <NavBar/>
    </div>
  );
}
