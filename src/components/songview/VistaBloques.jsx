import { transposeChord, chordToNashville } from '../../utils/music';
import { getColorBloque } from './estructura';

// ── renderLineaConAcordes ────────────────────────────────────────────────────
// Extraído de SongView.jsx sin cambios de comportamiento (Tanda 1 — refactor).
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
            ?<span style={{fontFamily:"'Outfit',sans-serif",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap',display:'block'}}>{seg.chord}</span>
            :<span style={{display:'block',height:chordFs*1.1,lineHeight:1}}/>
          }
          {seg.text
            ?<span style={{fontFamily:"'Outfit',sans-serif",fontSize:fs,color:'var(--tx)',lineHeight:1.25,whiteSpace:'pre'}}>{seg.text}</span>
            :<span style={{fontFamily:"'Outfit',sans-serif",fontSize:fs,color:'transparent',lineHeight:1.25,userSelect:'none'}}>&nbsp;</span>
          }
        </div>
      ))}
    </div>
  );
};

// ── renderBloqueLines ────────────────────────────────────────────────────────
// nashville y curKey ahora llegan como parámetros explícitos (antes venían
// del closure de SongView).
export const renderBloqueLines=(lines,tpOff,showChords,fs=14,nashville=false,curKey='C')=>{
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
    return(<div key={li} style={{fontFamily:"'Outfit',sans-serif",fontSize:fs,color:'var(--tx)',lineHeight:1.35,marginBottom:'0.15em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{clean}</div>);
  });
};

// ── Vista Bloques ─────────────────────────────────────────────────────────
// Componente con props explícitas (antes era función-closure interna de SongView).
// secuencia: array activo de bloques {label, lines, uid, seqId}
export function VistaBloques({secuencia,tpOff,showChords,nashville,curKey}){
  const seq=secuencia||[];
  if(!seq.length)return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)',fontSize:14,fontFamily:"'Outfit',sans-serif"}}>Sin contenido disponible</div>);
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
            <div style={{fontSize:9,fontWeight:700,fontFamily:"'Outfit',sans-serif",color,textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:5,borderBottom:`1px solid ${color}30`,paddingBottom:4,flexShrink:0}}>{bloque.label}</div>
            <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:'flex-start'}}>
              {renderBloqueLines(safeLines,tpOff,showChords,fsDynamic,nashville,curKey)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
