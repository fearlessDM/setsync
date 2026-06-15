// SongView: visor de canción con transposición, capo, anotaciones,
// vista bloques/lineal, Nashville, panel Estructura con drag touch.
import { useState, useEffect, useRef, useCallback } from 'react';
import { transposeChord, tpKey, chordToNashville } from '../utils/music';
import { Toast } from './common';

const CHORD_RE = /\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
const POPUP_SEEN_KEY = 'ss_bloques_popup_seen';

// ── renderSongContent (vista lineal) ─────────────────────────────────────────
export function renderSongContent(raw,tpOff,showChords,editMode,selectedChord,onSelectChord,onDragChord,nashville=false,songKey='C'){
  if(!raw)return(<div style={{color:'var(--tx3)',textAlign:'center',padding:'40px 0',fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>Letra no disponible aún.</div>);

  const screenW=typeof window!=='undefined'?window.innerWidth:390;
  const fs  =Math.min(14,Math.max(11,Math.floor(screenW/30)));
  const cFs =Math.max(10,fs-2);
  const sFs =Math.max(7,fs-4);
  const FONT="'DM Sans',sans-serif";

  const trC=(ch)=>{
    const p=ch.split('/');
    let transposed=p.length>1
      ?transposeChord(p[0],tpOff)+'/'+transposeChord(p[1],tpOff)
      :transposeChord(ch,tpOff);
    if(nashville){
      const parts=transposed.split('/');
      return parts.map(c=>chordToNashville(c,songKey)).join('/');
    }
    return transposed;
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

  // ── Detecta si una línea es SOLO acordes (formato BARRO) ─────────────────────
  // ej: "D A Em" → true | "Mi corazón" → false | "[D]Mi" → false (inline)
  const CHORD_PLAIN_RE=/^[A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?$/;
  const isChordOnlyLine=(txt)=>{
    if(!txt.trim())return false;
    if(/\[/.test(txt))return false;
    const tokens=txt.trim().split(/\s+/);
    return tokens.length>=1&&tokens.every(t=>CHORD_PLAIN_RE.test(t));
  };

  // Renderiza una línea de acordes-sobre-letra en formato BARRO
  const renderBarro=(chordLine,lyricLine,key)=>{
    const chords=(chordLine||'').trim().split(/\s+/).map(c=>trC(c));
    const lyric=(lyricLine||'').trim();
    const chordFs=Math.max(9,fs*0.72);
    if(!showChords){
      return lyric?(<div key={key} style={{fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,lineHeight:1.35,marginBottom:'0.1em'}}>{lyric}</div>):null;
    }
    return(
      <div key={key} style={{marginBottom:'0.35em',lineHeight:1}}>
        <div style={{display:'flex',gap:Math.max(8,12),marginBottom:2}}>
          {chords.map((ch,i)=>(
            <span key={i} style={{fontFamily:"'Source Code Pro',monospace",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap'}}>{ch}</span>
          ))}
        </div>
        {lyric&&<div style={{fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,lineHeight:1.3}}>{lyric}</div>}
      </div>
    );
  };

  // ── renderLinea: formato YESHUA (acordes inline [A]palabra) ─────────────────
  const renderLinea=(text,lineIdx,key)=>{
    if(!text.trim())return null;
    const re=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
    re.lastIndex=0;
    const hasChord=re.test(text);
    re.lastIndex=0;

    if(!hasChord||!showChords){
      const lyric=text.replace(re,'').trim();
      if(!lyric)return null;
      return(<div key={key} style={{fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,lineHeight:1.35,marginBottom:'0.1em'}}>{lyric}</div>);
    }

    // Parsear segmentos: cada segmento = {chord, text, ci}
    const segs=[];
    let last=0,m,ci=0;
    while((m=re.exec(text))!==null){
      segs.push({chord:trC(m[1]),text:text.slice(last,m.index),ci:ci++,lineIdx,key});
      last=m.index+m[0].length;
    }
    if(last<text.length)segs.push({chord:null,text:text.slice(last),ci:-1});

    const chordFs=Math.max(9,fs*0.72);

    return(
      <div key={key} style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',marginBottom:'0.3em',lineHeight:1}}>
        {segs.map((seg,si)=>(
          <div key={si} style={{display:'inline-flex',flexDirection:'column',alignItems:'flex-start'}}>
            {seg.chord?(
              editMode?(
                // Drag touch + mouse en edición
                <span
                  onMouseDown={e=>{
                    e.preventDefault();
                    const x0=e.clientX;
                    const el=e.currentTarget;
                    el.style.cursor='grabbing';
                    const onMove=(ev)=>{
                      const dx=ev.clientX-x0;
                      el.style.transform=`translateX(${dx}px)`;
                      el.style.opacity='0.75';
                    };
                    const onUp=(ev)=>{
                      const dx=ev.clientX-x0;
                      el.style.transform='';
                      el.style.opacity='';
                      el.style.cursor='grab';
                      document.removeEventListener('mousemove',onMove);
                      document.removeEventListener('mouseup',onUp);
                      const steps=Math.round(dx/7);
                      if(Math.abs(steps)>0&&onDragChord) onDragChord(lineIdx,seg.ci,steps);
                    };
                    document.addEventListener('mousemove',onMove);
                    document.addEventListener('mouseup',onUp);
                  }}
                  onTouchStart={e=>{
                    const touch=e.touches[0];
                    e.currentTarget._x0=touch.clientX;
                  }}
                  onTouchMove={e=>{
                    e.preventDefault();
                    const dx=e.touches[0].clientX-(e.currentTarget._x0||e.touches[0].clientX);
                    e.currentTarget.style.transform=`translateX(${dx}px)`;
                    e.currentTarget.style.opacity='0.75';
                  }}
                  onTouchEnd={e=>{
                    const dx=e.changedTouches[0].clientX-(e.currentTarget._x0||e.changedTouches[0].clientX);
                    e.currentTarget.style.transform='';
                    e.currentTarget.style.opacity='';
                    const steps=Math.round(dx/7);
                    if(Math.abs(steps)>0&&onDragChord) onDragChord(lineIdx,seg.ci,steps);
                  }}
                  style={{fontFamily:"'Source Code Pro',monospace",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap',display:'block',cursor:'grab',touchAction:'none',userSelect:'none',background:'rgba(200,169,126,.1)',borderRadius:3,padding:'0 2px',border:'1px dashed rgba(200,169,126,.35)'}}
                >{seg.chord}</span>
              ):(
                <span style={{fontFamily:"'Source Code Pro',monospace",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap',display:'block'}}>{seg.chord}</span>
              )
            ):(
              <span style={{display:'block',height:chordFs*1.1}}/>
            )}
            {seg.text
              ?<span style={{fontFamily:FONT,fontSize:fs,color:'var(--tx)',lineHeight:1.3,whiteSpace:'pre'}}>{seg.text}</span>
              :<span style={{fontFamily:FONT,fontSize:fs,color:'transparent',lineHeight:1.3,userSelect:'none'}}>&nbsp;</span>
            }
          </div>
        ))}
      </div>
    );
  };

  const chordFsForLabel=(fs)=>Math.max(9,fs*0.72)*1.1;
  let lineCounter=0;
  return(
    <div style={{width:'100%',padding:'2px 4px 12px',outline:editMode?'2px dashed rgba(200,169,126,.25)':'none',borderRadius:editMode?8:0}}>
      {editMode&&(
        <div style={{textAlign:'center',fontSize:10,color:'var(--ac)',fontFamily:FONT,fontWeight:700,letterSpacing:'1px',padding:'4px 0 8px',textTransform:'uppercase',opacity:.8}}>
          ✏ Arrastra un acorde para moverlo
        </div>
      )}
      {blocks.map((blk,bi)=>{
        const blines=(blk.lines||[]).filter((l,i,a)=>!((!l.trim())&&(i===0||i===a.length-1)));
        if(!blines.length&&!blk.label)return null;

        // Pre-procesar líneas: detectar pares BARRO (chord-only → lyric)
        const rows=[];
        let skipNext=false;
        for(let li=0;li<blines.length;li++){
          if(skipNext){skipNext=false;continue;}
          const line=blines[li];
          const nextLine=blines[li+1]??'';
          if(isChordOnlyLine(line)){
            // Par BARRO: línea de acordes + siguiente línea de letra (o vacío)
            rows.push({type:'barro',chordLine:line,lyricLine:nextLine,origLi:li});
            skipNext=true;
          } else {
            rows.push({type:'inline',line,origLi:li});
          }
        }

        return(
          <div key={bi} style={{marginTop:bi===0?0:fs*0.85,background:'transparent',borderTop:bi===0?'none':'1px solid rgba(255,255,255,.06)',paddingTop:bi===0?0:4}}>
            {rows.map((row,ri)=>{
              const isFirst=ri===0;
              if(row.type==='barro'){
                const thisLineIdx=lineCounter++;
                return(
                  <div key={ri} style={{display:'flex',alignItems:'flex-start',width:'100%'}}>
                    <div style={{width:labelPx,minWidth:labelPx,flexShrink:0,paddingRight:4,paddingTop:chordFsForLabel(fs)}}>
                      {blk.label&&isFirst&&(
                        <span style={{fontSize:sFs,fontWeight:900,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1.2px',whiteSpace:'nowrap',opacity:.8}}>{blk.label}</span>
                      )}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      {renderBarro(row.chordLine,row.lyricLine,`b${ri}_${bi}`)}
                    </div>
                  </div>
                );
              } else {
                const line=row.line;
                if(!line.trim())return<div key={ri} style={{height:fs*0.2}}/>;
                const thisLineIdx=lineCounter++;
                return(
                  <div key={ri} style={{display:'flex',alignItems:'flex-end',width:'100%'}}>
                    <div style={{width:labelPx,minWidth:labelPx,flexShrink:0,paddingRight:4,display:'flex',alignItems:'flex-end',paddingBottom:2}}>
                      {blk.label&&isFirst&&(
                        <span style={{fontSize:sFs,fontWeight:900,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1.2px',whiteSpace:'nowrap',opacity:.8}}>{blk.label}</span>
                      )}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      {renderLinea(line,thisLineIdx,'l'+ri+'_'+bi)}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        );
      })}
    </div>
  );
}

export function SongView({songs,startIdx,onClose,theme="dark",isAdmin=false,onSaveChords,contentDB={}}){
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
  const [capoOpen,setCapoOpen]=useState(false);
  const [toast,setToast]=useState(null);
  const [isTablet,setIsTablet]=useState(()=>window.innerWidth>=768);
  const [autoScroll,setAutoScroll]=useState(false);
  const [scrollSpeed,setScrollSpeed]=useState(1);
  const [viewMode,setViewMode]=useState('bloques');
  const [showModePopup,setShowModePopup]=useState(false);
  const [nashville,setNashville]=useState(false);
  const [secuencia,setSecuencia]=useState(()=>{
    try{const k=`ss_seq_${songs[startIdx]?.name}`;const s=localStorage.getItem(k);return s?JSON.parse(s):null;}
    catch{return null;}
  });

  const getSongContent=(song)=>editedSongs[song.name]||contentDB[song.name]||null;

  // ── Mover acorde por drag — posición absoluta en caracteres ─────────────
  // steps viene de Math.round(dx/7) donde dx es píxeles arrastrados.
  // En vez de mover 1 char por paso (que se acumula mal), calculamos
  // la posición objetivo del inicio del tag y reinsertamos ahí.
  const handleDragChord=(lineIdx,chordIdx,steps)=>{
    if(!steps)return;
    const song=songs[idx];
    const raw=getSongContent(song)||'';
    const allLines=raw.split('\n');
    let contentStart=0;
    for(let i=0;i<Math.min(4,allLines.length);i++){
      const l=allLines[i].trim();
      if(!l||(!l.includes('[')&&!l.startsWith('===')))contentStart=i+1;
      else break;
    }
    let counter=0,targetAbsIdx=-1;
    for(let i=contentStart;i<allLines.length;i++){
      const t=allLines[i].trim();
      if(t.startsWith('===')&&t.endsWith('==='))continue;
      if(!t)continue;
      if(counter===lineIdx){targetAbsIdx=i;break;}
      counter++;
    }
    if(targetAbsIdx<0)return;
    const line=allLines[targetAbsIdx];
    const chords=[];
    let m;
    CHORD_RE.lastIndex=0;
    while((m=CHORD_RE.exec(line))!==null){
      chords.push({start:m.index,end:m.index+m[0].length,full:m[0]});
    }
    const localIdx=chordIdx%Math.max(1,chords.length);
    const chord=chords[localIdx];
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

  const cvRef=useRef(null);
  const wrapRef=useRef(null);
  const strokes=useRef([]);
  const scrollRaf=useRef(null);
  const scrollSpeedRef=useRef(1);
  const drawing=useRef(false);
  const cur=useRef(null);

  const song=songs[idx];
  const curKey=tpKey(song.key,tpOff);
  const sonaKey=tpKey(curKey,-capo);

  useEffect(()=>{setTpOff(0);setShowAnnoBar(false);setCapo(0);setCapoOpen(false);},[idx]);
  useEffect(()=>{scrollSpeedRef.current=scrollSpeed;},[scrollSpeed]);
  useEffect(()=>{
    const w=wrapRef.current;
    if(!w)return;
    if(!autoScroll){if(scrollRaf.current)cancelAnimationFrame(scrollRaf.current);return;}
    const bpm=songs[idx]?.bpm||80;
    const pxPerSec=(bpm/5)*scrollSpeedRef.current;
    let last=null;
    const step=(ts)=>{
      if(last!==null){const delta=(ts-last)/1000;w.scrollTop+=pxPerSec*delta;if(w.scrollTop+w.clientHeight>=w.scrollHeight-10){setAutoScroll(false);return;}}
      last=ts;scrollRaf.current=requestAnimationFrame(step);
    };
    scrollRaf.current=requestAnimationFrame(step);
    return()=>{if(scrollRaf.current)cancelAnimationFrame(scrollRaf.current);};
  },[autoScroll,idx]);
  useEffect(()=>{
    const cv=cvRef.current,w=wrapRef.current;
    if(!cv||!w)return;
    const resize=()=>{cv.width=w.clientWidth;cv.height=w.clientHeight;redraw();};
    resize();const ro=new ResizeObserver(resize);ro.observe(w);return()=>ro.disconnect();
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

  const BLOQUE_COLORS={
    'INTRO':'#5e9eff','VERSO':'#EE227D','CORO':'#30C0B7','PRE-CORO':'#a78bfa',
    'PUENTE':'#FD8083','BRIDGE':'#FD8083','FINAL':'#852467','OUTRO':'#852467',
    'INTERLUDIO':'#498099','INSTRUMENTAL':'#498099',
  };
  const getColorBloque=(label)=>{
    const k=Object.keys(BLOQUE_COLORS).find(k=>label.includes(k));
    return k?BLOQUE_COLORS[k]:'rgba(200,169,126,.7)';
  };

  const parseBloques=()=>{
    const raw=getSongContent(songs[idx]);
    if(!raw)return[];
    const lines=raw.split('\n');
    const result=[];
    let curLabel=null,curLines=[],skip=0;
    for(let i=0;i<Math.min(4,lines.length);i++){
      const l=lines[i].trim();
      if(!l||(!l.includes('[')&&!l.startsWith('===')))skip=i+1;
      else break;
    }
    lines.slice(skip).forEach(line=>{
      const t=line.trim();
      if(t.startsWith('===')&&t.endsWith('===')){
        if(curLabel!==null||curLines.some(l=>l.trim()))result.push({label:curLabel||'INTRO',lines:curLines});
        curLabel=t.slice(3,-3).replace(/:$/,'').trim().toUpperCase();curLines=[];
      } else {curLines.push(line);}
    });
    if(curLabel!==null||curLines.some(l=>l.trim()))result.push({label:curLabel||'INTRO',lines:curLines});
    return result;
  };

  const getSongKey=(name)=>`ss_seq_${name}`;
  const getSecuencia=()=>{
    const bloques=parseBloques();
    if(!bloques.length)return[];
    const songName=songs[idx]?.name;
    if(!songName)return bloques.map((b,i)=>({...b,uid:i}));
    try{
      const saved=localStorage.getItem(getSongKey(songName));
      if(saved){
        const seq=JSON.parse(saved);
        return seq.map((item,i)=>{
          const bloque=bloques.find(b=>b.label===item.label)||bloques[0];
          // Garantizar que lines siempre sea array (si viene de localStorage solo tiene label/seqId)
          return{...bloque,lines:bloque?.lines||[],uid:i,seqId:item.seqId};
        });
      }
    }catch{}
    return bloques.map((b,i)=>({...b,uid:i,seqId:i}));
  };
  const saveSecuencia=(seq)=>{
    const songName=songs[idx]?.name;
    if(!songName)return;
    try{localStorage.setItem(getSongKey(songName),JSON.stringify(seq.map(b=>({label:b.label,seqId:b.seqId}))));}catch{}
  };
  const initSecuencia=()=>{const s=getSecuencia();setSecuencia(s);return s;};
  const getActiveSecuencia=()=>secuencia||getSecuencia();

  const duplicarBloque=(i)=>{
    const seq=[...getActiveSecuencia()];
    const nuevo={...seq[i],uid:Date.now(),seqId:Date.now()};
    seq.splice(i+1,0,nuevo);
    const updated=seq.map((b,j)=>({...b,uid:j}));
    setSecuencia(updated);saveSecuencia(updated);
  };
  const eliminarBloque=(i)=>{
    const seq=[...getActiveSecuencia()];
    if(seq.length<=1)return;
    seq.splice(i,1);
    const updated=seq.map((b,j)=>({...b,uid:j}));
    setSecuencia(updated);saveSecuencia(updated);
  };

  // ── renderLineaConAcordes ─────────────────────────────────────────────────
  const renderLineaConAcordes=(line,trC,fs)=>{
    const re=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
    const segs=[];let last=0,m;
    re.lastIndex=0;
    while((m=re.exec(line))!==null){segs.push({chord:trC(m[1]),text:line.slice(last,m.index)});last=m.index+m[0].length;}
    if(last<line.length)segs.push({chord:null,text:line.slice(last)});
    const chordFs=Math.max(8,fs*0.65);
    return(
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',marginBottom:'0.2em',lineHeight:1}}>
        {segs.map((seg,si)=>(
          <div key={si} style={{display:'inline-flex',flexDirection:'column',alignItems:'flex-start',marginRight:seg.chord&&seg.text?'0.05em':0}}>
            {seg.chord
              ?<span style={{fontFamily:"'Source Code Pro',monospace",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap',display:'block'}}>{seg.chord}</span>
              :<span style={{display:'block',height:chordFs*1.1,lineHeight:1}}/>
            }
            {seg.text
              ?<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:fs,color:'var(--tx)',lineHeight:1.25,whiteSpace:'pre'}}>{seg.text}</span>
              :<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:fs,color:'transparent',lineHeight:1.25,userSelect:'none'}}>&nbsp;</span>
            }
          </div>
        ))}
      </div>
    );
  };

  const renderBloqueLines=(lines,tpOff,showChords,fs=14)=>{
    if(!lines||!lines.length)return null;
    const re=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
    const trC=(ch)=>{
      const p=ch.split('/');
      let t=p.length>1?transposeChord(p[0],tpOff)+'/'+transposeChord(p[1],tpOff):transposeChord(ch,tpOff);
      if(nashville){const parts=t.split('/');return parts.map(c=>chordToNashville(c,curKey)).join('/');}
      return t;
    };
    return lines.map((line,li)=>{
      const t=line.trim();
      if(!t||t.startsWith('==='))return null;
      re.lastIndex=0;const hasChord=re.test(line);re.lastIndex=0;
      if(hasChord&&showChords)return <div key={li}>{renderLineaConAcordes(line,trC,fs)}</div>;
      const clean=showChords?t:t.replace(re,'').trim();
      if(!clean)return null;
      return(<div key={li} style={{fontFamily:"'DM Sans',sans-serif",fontSize:fs,color:'var(--tx)',lineHeight:1.35,marginBottom:'0.15em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{clean}</div>);
    });
  };

  // ── Vista Bloques ─────────────────────────────────────────────────────────
  const VistaBloques=()=>{
    const seq=getActiveSecuencia();
    if(!seq.length)return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)',fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>Sin contenido disponible</div>);
    const w=typeof window!=='undefined'?window.innerWidth:390;
    const cols=w>=1024?3:w>=768?2:1;
    const unique=[];const seen=new Set();
    seq.forEach(b=>{if(!seen.has(b.label)){seen.add(b.label);unique.push(b);}});
    const rows=Math.ceil(unique.length/cols);
    return(
      <div style={{flex:1,overflowY:'auto',scrollbarWidth:'thin',display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gridAutoRows:`calc((100% - ${(rows+1)*8}px) / ${rows})`,gap:8,padding:'8px',height:'100%',boxSizing:'border-box'}}>
        {unique.map((bloque,bi)=>{
          const color=getColorBloque(bloque.label);
          const safeLines=bloque.lines||[];
          const contentLines=safeLines.filter(l=>{const t=l.trim();return t&&!t.startsWith('===');});
          const visualRows=contentLines.reduce((acc,l)=>acc+(/\[[A-G]/.test(l)?2:1),0);
          const approxBlockH=typeof window!=='undefined'?(window.innerHeight*0.82-40)/rows-40:120;
          const fsDynamic=Math.max(10,Math.min(28,Math.floor(approxBlockH/(visualRows||1)/1.35)));
          return(
            <div key={bi} style={{background:`${color}10`,border:`1px solid ${color}40`,borderRadius:14,padding:'8px 10px',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
              <div style={{fontSize:9,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color,textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:5,borderBottom:`1px solid ${color}30`,paddingBottom:4,flexShrink:0}}>{bloque.label}</div>
              <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:'flex-start'}}>
                {renderBloqueLines(safeLines,tpOff,showChords,fsDynamic)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Panel ESTRUCTURA — drag & drop mouse + touch, sin flechas ───────────
  const PanelEstructura=()=>{
    const seq=getActiveSecuencia();
    if(!seq.length)return null;
    const dragIdx=useRef(null);
    const panelBg=isLight?'rgba(240,234,222,.92)':'rgba(6,4,18,.92)';

    // ── Touch drag ───────────────────────────────────────────────────────────
    const onTouchStartItem=(i)=>(e)=>{
      dragIdx.current=i;
      e.currentTarget.style.opacity='0.5';
      e.currentTarget.style.transform='scale(1.05)';
    };
    const onTouchMoveItem=(e)=>{
      e.preventDefault();
      const touch=e.touches[0];
      const el=document.elementFromPoint(touch.clientX,touch.clientY);
      const item=el?.closest('[data-bloque-idx]');
      if(item){
        const targetIdx=parseInt(item.dataset.bloqueIdx);
        if(dragIdx.current!==null&&targetIdx!==dragIdx.current){
          const newSeq=[...seq];
          const [moved]=newSeq.splice(dragIdx.current,1);
          newSeq.splice(targetIdx,0,moved);
          dragIdx.current=targetIdx;
          const updated=newSeq.map((b,j)=>({...b,uid:j}));
          setSecuencia(updated);saveSecuencia(updated);
        }
      }
    };
    const onTouchEndItem=(e)=>{
      if(e.currentTarget){e.currentTarget.style.opacity='';e.currentTarget.style.transform='';}
      dragIdx.current=null;
    };

    // ── Mouse drag ───────────────────────────────────────────────────────────
    const onMouseDownItem=(i)=>(e)=>{
      e.preventDefault();
      dragIdx.current=i;
      const el=e.currentTarget;
      el.style.opacity='0.5';
      el.style.transform='scale(1.05)';
      el.style.cursor='grabbing';
      const onMove=(ev)=>{
        const target=document.elementFromPoint(ev.clientX,ev.clientY);
        const item=target?.closest('[data-bloque-idx]');
        if(item){
          const targetIdx=parseInt(item.dataset.bloqueIdx);
          if(dragIdx.current!==null&&targetIdx!==dragIdx.current){
            const newSeq=[...seq];
            const [moved]=newSeq.splice(dragIdx.current,1);
            newSeq.splice(targetIdx,0,moved);
            dragIdx.current=targetIdx;
            const updated=newSeq.map((b,j)=>({...b,uid:j}));
            setSecuencia(updated);saveSecuencia(updated);
          }
        }
      };
      const onUp=()=>{
        el.style.opacity='';el.style.transform='';el.style.cursor='grab';
        dragIdx.current=null;
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    };

    return(
      <div style={{
        display:'flex',flexDirection:'column',
        borderRadius:14,border:'1px solid var(--bd)',
        background:panelBg,backdropFilter:'blur(40px)',
        overflow:'hidden',width:64,
        maxHeight:'38vh',
      }}>
        <div style={{fontSize:7,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',textAlign:'center',padding:'5px 4px 4px',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
          ESTRUCTURA
        </div>
        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none',padding:'3px',WebkitOverflowScrolling:'touch',touchAction:'pan-y'}}>
          {seq.map((b,i)=>{
            const color=getColorBloque(b.label);
            return(
              <div
                key={b.uid??i}
                data-bloque-idx={i}
                onTouchStart={onTouchStartItem(i)}
                onTouchMove={onTouchMoveItem}
                onTouchEnd={onTouchEndItem}
                onMouseDown={onMouseDownItem(i)}
                style={{marginBottom:3,cursor:'grab',userSelect:'none'}}
              >
                <div style={{display:'flex',flexDirection:'column',borderRadius:8,border:`1px solid ${color}45`,background:`${color}15`,overflow:'hidden'}}>
                  <div style={{fontSize:8,fontWeight:900,color,textTransform:'uppercase',letterSpacing:'.5px',textAlign:'center',padding:'5px 3px',lineHeight:1.1}}>
                    {b.label.length>6?b.label.slice(0,6)+'…':b.label}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-around',borderTop:`1px solid ${color}25`,padding:'2px'}}>
                    <button
                      onMouseDown={e=>e.stopPropagation()}
                      onClick={(e)=>{e.stopPropagation();duplicarBloque(i);}}
                      style={{flex:1,padding:'3px 0',border:'none',background:'transparent',color,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                      title="Duplicar"
                    >
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button
                      onMouseDown={e=>e.stopPropagation()}
                      onClick={(e)=>{e.stopPropagation();eliminarBloque(i);}}
                      disabled={seq.length<=1}
                      style={{flex:1,padding:'3px 0',border:'none',background:'transparent',color:seq.length<=1?'var(--tx3)':'var(--rd)',cursor:seq.length<=1?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                      title="Eliminar"
                    >
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={()=>{const b=parseBloques();if(b.length){const s=b.map((bl,i)=>({...bl,uid:i,seqId:i}));setSecuencia(s);saveSecuencia(s);}}}
          style={{padding:'4px',border:'none',borderTop:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:7,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',flexShrink:0}}
        >
          Reset
        </button>
      </div>
    );
  };

  // ── Panel Tono + Capo ─────────────────────────────────────────────────────
  const PanelTono=()=>(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',borderRadius:14,border:`1px solid ${svBd}`,background:isLight?'rgba(240,234,222,.85)':'rgba(6,4,18,.82)',backdropFilter:'blur(40px)',width:48,overflow:'visible',position:'relative'}}>
      <button onClick={()=>doTp(1)} style={{width:'100%',padding:'7px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)',borderRadius:'14px 14px 0 0'}}>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        <span style={{fontSize:8,fontWeight:900,color:'var(--tx3)',letterSpacing:'.5px'}}>#</span>
      </button>
      <div style={{width:'100%',padding:'6px 0',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:16,color:svAc,lineHeight:1}}>{curKey}</div>
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
              <button key={c} onClick={()=>{setCapo(c);setCapoOpen(false);setToast(c===0?{text:'Sin capo',sub:'Tono original'}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                style={{width:'100%',padding:'7px 10px',marginBottom:3,border:'none',borderRadius:8,background:isOn?'rgba(200,169,126,.15)':'rgba(255,255,255,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {isOn?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--ac)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:10}}/>}
                  <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:13,color:isOn?'var(--ac)':'var(--tx)',lineHeight:1}}>{c===0?'Sin capo':c}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,fontWeight:700,color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'DM Sans',sans-serif"}}>{notaSuena}</div>
                  {c>0&&<div style={{fontSize:8,color:'var(--tx3)',marginTop:1}}>suena</div>}
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
        <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,border:showAnnoBar?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:showAnnoBar?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Anotar
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:showAnnoBar?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div style={{flex:1,flexShrink:0,minWidth:4}}/>
        {capo>0&&(
          <div style={{padding:'3px 8px',borderRadius:100,background:'rgba(94,206,160,.1)',border:'1px solid rgba(94,206,160,.25)',fontSize:10,fontWeight:700,color:'var(--gn)',flexShrink:0}}>
            Capo {capo} · {sonaKey}
          </div>
        )}
        {/* Nashville toggle */}
        <button onClick={()=>setNashville(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:nashville?'1px solid rgba(167,139,250,.5)':'1px solid var(--bd)',background:nashville?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',color:nashville?'#a78bfa':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0,transition:'all .2s'}}>
          <span style={{fontFamily:"'Source Code Pro',monospace",fontSize:10,fontWeight:900}}>1 4 5</span>
          {nashville?' Grados':' Notas'}
        </button>
        <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:!showChords?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:!showChords?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          {showChords?'Solo letra':'Con acordes'}
        </button>
        <button onClick={()=>{setAutoScroll(v=>!v);if(wrapRef.current)wrapRef.current.scrollTop=0;}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:autoScroll?'1px solid rgba(94,206,160,.5)':'1px solid var(--bd)',background:autoScroll?'rgba(94,206,160,.15)':'rgba(255,255,255,.04)',color:autoScroll?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0,transition:'all .2s'}}>
          {autoScroll?<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          {autoScroll?`${songs[idx]?.bpm||80} BPM`:'Auto'}
        </button>
        {isAdmin&&(
          <>
          <button onClick={()=>{if(editMode){setEditMode(false);setSelectedChord(null);}else setEditMode(true);}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:editMode?'1px solid var(--ac)':'1px solid rgba(200,169,126,.28)',background:editMode?'rgba(200,169,126,.15)':'rgba(200,169,126,.07)',color:'var(--ac)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {editMode?'Cancelar':'Editar'}
          </button>
          {editMode&&editedSongs[songs[idx]?.name]&&(
            <button onClick={handleSaveEdit} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:'1px solid rgba(94,206,160,.5)',background:'rgba(94,206,160,.15)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Publicar
            </button>
          )}
          </>
        )}
        <button onClick={()=>setToast({text:'Guardado',sub:'Anotaciones en tu dispositivo'})} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:'1px solid rgba(94,206,160,.28)',background:'rgba(94,206,160,.07)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Guardar
        </button>
      </div>
      {showAnnoBar&&(
        <div style={{display:'flex',alignItems:'center',gap:3,padding:'0 10px 5px',overflowX:'auto',scrollbarWidth:'none'}}>
          {[['draw','Lápiz'],['erase','Borrar']].map(([t,l])=>(
            <button key={t} onClick={()=>setTool(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,border:tool===t?'1px solid var(--bd)':'1px solid transparent',background:tool===t?'rgba(255,255,255,.09)':'transparent',color:tool===t?'var(--tx)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>{l}</button>
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
        <div style={{fontSize:13,color:'var(--tx)',lineHeight:1.6,marginBottom:16,fontFamily:"'DM Sans',sans-serif"}}>
          Toda la canción <strong>en pantalla, sin scroll.</strong> Cada sección ocupa su propio espacio.
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {[['🎯','Cero scroll — todo visible de un vistazo'],['📐','Texto al máximo tamaño por bloque'],['🔄','Estructura editable — arrastra para reordenar'],['⚡','Ideal para iPads y pantallas grandes']].map(([ico,txt],i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:'var(--s1)',border:'1px solid var(--bd)'}}>
              <span style={{fontSize:16}}>{ico}</span>
              <span style={{fontSize:12,color:'var(--tx2)',fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{txt}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>{setViewMode('bloques');setAutoScroll(false);initSecuencia();setShowModePopup(false);try{localStorage.setItem(POPUP_SEEN_KEY,'1');}catch{}}}
          style={{width:'100%',padding:'13px',border:'none',borderRadius:12,background:'var(--ac)',color:isLight?'#fff':'#0a0a0a',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:14,letterSpacing:'.5px'}}>
          Activar Vista Bloques
        </button>
        <button onClick={()=>setShowModePopup(false)} style={{width:'100%',padding:'8px',border:'none',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,marginTop:6}}>
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
          if(seen){setViewMode('bloques');setAutoScroll(false);initSecuencia();}
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
        ?<VistaBloques/>
        :<>
          <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
            onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
            onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
          />
          <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px',display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
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
          <PanelEstructura/>
        </div>
        <div style={{pointerEvents:'all',flex:'0 0 auto'}}>
          <PanelTono/>
        </div>
      </div>
    </div>
  );

  // ── NavBar ────────────────────────────────────────────────────────────────
  const NavBar=()=>(
    <div className="sv-nav" style={{background:svNavBg,borderTop:`1px solid ${svBd}`}}>
      <button className="nb" disabled={idx===0} onClick={()=>setIdx(i=>i-1)}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Anterior
      </button>
      <div className="sv-ni">
        <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:13,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
        <div style={{fontSize:9,color:svTx3,marginTop:1,fontWeight:700}}>Canción {idx+1} de {songs.length}</div>
      </div>
      <button className="nb p" onClick={()=>{if(idx===songs.length-1)onClose();else setIdx(i=>i+1);}}>
        {idx===songs.length-1?'Listo':'Siguiente'}<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );

  // ── Layout tablet ≥768px ──────────────────────────────────────────────────
  if(isTablet){
    return(
      <div className="sv" style={{flexDirection:'row',background:svBg}}>
        {showModePopup&&<PopupModoBloques/>}
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid var(--bd)',background:'rgba(6,6,14,.95)',backdropFilter:'blur(20px)'}}>
          <div style={{padding:'12px 14px 10px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:8}}>
            <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:13,color:'var(--tx)'}}>SetSync</div>
              <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{songs.length} canciones</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',scrollbarWidth:'thin'}}>
            {songs.map((s,i)=>(
              <div key={i} onClick={()=>setIdx(i)} style={{padding:'11px 14px',borderBottom:'1px solid rgba(255,255,255,.05)',cursor:'pointer',background:i===idx?'rgba(200,169,126,.1)':'transparent',transition:'background .15s',borderLeft:`3px solid ${i===idx?'var(--ac)':'transparent'}`}}>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:i===idx?900:700,fontSize:12,color:i===idx?'var(--ac)':'var(--tx)',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',display:'flex',gap:8}}>
                  <span style={{fontFamily:"'Source Code Pro',monospace",fontWeight:700}}>{s.key}</span>
                  <span>{s.bpm} BPM</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'11px 14px',borderTop:'1px solid var(--bd)',background:'rgba(200,169,126,.04)'}}>
            <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:4}}>Activa</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:12,color:'var(--ac)',marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{padding:'2px 7px',borderRadius:100,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.2)',fontSize:10,fontWeight:900,color:'var(--ac)',fontFamily:"'Source Code Pro',monospace"}}>{curKey}</span>
              {capo>0&&<span style={{fontSize:10,color:'var(--gn)',fontWeight:700}}>· Capo {capo} → {sonaKey}</span>}
            </div>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',background:'rgba(6,6,14,.85)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
              <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginTop:1}}>
                {song.role||'Guitarra'} · {curKey} · {song.bpm} BPM
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
    <div className="sv" style={{background:svBg}}>
      {showModePopup&&<PopupModoBloques/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div className="sv-hdr" style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`}}>
        <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:10,color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
            {song.role||'Guitarra'} · {curKey} · {song.bpm} BPM
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
