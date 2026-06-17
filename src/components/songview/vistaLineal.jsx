import { transposeChord, chordToNashville } from '../../utils/music';

// ── Vista lineal: renderiza letra/acordes en formato continuo ───────────────
// Función pura: no usa estado de React, recibe todo por parámetro.
// Soporta dos formatos de entrada:
//  - YESHUA (acordes inline): "Mi corazón [D]canta"
//  - BARRO (acordes en línea separada arriba de la letra): "D A Em" / "Mi corazón canta"
// Extraído de SongView.jsx sin cambios de comportamiento (Tanda 1 — refactor).

export const CHORD_RE = /\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;

export function renderSongContent(raw,tpOff,showChords,editMode,selectedChord,onSelectChord,onDragChord,nashville=false,songKey='C'){
  if(!raw)return(<div style={{color:'var(--tx3)',textAlign:'center',padding:'40px 0',fontSize:13,fontFamily:"'Outfit',sans-serif"}}>Letra no disponible aún.</div>);

  const screenW=typeof window!=='undefined'?window.innerWidth:390;
  const fs  =Math.min(14,Math.max(11,Math.floor(screenW/30)));
  const cFs =Math.max(10,fs-2);
  const sFs =Math.max(7,fs-4);
  const FONT="'Outfit',sans-serif";

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
            <span key={i} style={{fontFamily:"'Outfit',sans-serif",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap'}}>{ch}</span>
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
                      const steps=Math.round(dx/5);
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
                    const steps=Math.round(dx/5);
                    if(Math.abs(steps)>0&&onDragChord) onDragChord(lineIdx,seg.ci,steps);
                  }}
                  style={{fontFamily:"'Outfit',sans-serif",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap',display:'block',cursor:'grab',touchAction:'none',userSelect:'none',background:'rgba(200,169,126,.1)',borderRadius:3,padding:'0 2px',border:'1px dashed rgba(200,169,126,.35)'}}
                >{seg.chord}</span>
              ):(
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap',display:'block'}}>{seg.chord}</span>
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
