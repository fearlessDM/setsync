import { transposeChord, chordToAmericano, chordToLatino, chordToNashville } from '../../utils/music';
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
            ?<span style={{fontFamily:"'Outfit',sans-serif",fontSize:fs,fontWeight:700,color:'var(--tx)',lineHeight:1.25,whiteSpace:'pre',textTransform:'uppercase'}}>{seg.text}</span>
            :<span style={{fontFamily:"'Outfit',sans-serif",fontSize:fs,color:'transparent',lineHeight:1.25,userSelect:'none'}}>&nbsp;</span>
          }
        </div>
      ))}
    </div>
  );
};

// ── renderBloqueLines ────────────────────────────────────────────────────────
// notacion y curKey ahora llegan como parámetros explícitos (antes venían
// del closure de SongView).
export const renderBloqueLines=(lines,tpOff,showChords,fs=14,notacion='americano',curKey='C')=>{
  if(!lines||!lines.length)return null;
  const re=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
  // Aplica el sistema de notación elegido (Americano/Latino/Grados), mismo
  // criterio que vistaLineal.jsx — ver comentario allí para el detalle.
  const aplicarNotacion=(ch)=>{
    if(notacion==='grados')return chordToNashville(ch,curKey);
    if(notacion==='latino')return chordToLatino(ch);
    return chordToAmericano(ch);
  };
  const trC=(ch)=>{
    const p=ch.split('/');
    let t=p.length>1?transposeChord(p[0],tpOff)+'/'+transposeChord(p[1],tpOff):transposeChord(ch,tpOff);
    const parts=t.split('/');
    return parts.map(c=>aplicarNotacion(c)).join('/');
  };
  return lines.map((line,li)=>{
    const t=line.trim();
    if(!t||t.startsWith('==='))return null;
    re.lastIndex=0;const hasChord=re.test(line);re.lastIndex=0;
    if(hasChord&&showChords)return <div key={li}>{renderLineaConAcordes(line,trC,fs)}</div>;
    const clean=showChords?t:t.replace(re,'').trim();
    if(!clean)return null;
    return(<div key={li} style={{fontFamily:"'Outfit',sans-serif",fontSize:fs,fontWeight:700,color:'var(--tx)',lineHeight:1.35,marginBottom:'0.15em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textTransform:'uppercase'}}>{clean}</div>);
  });
};

// ── Vista Bloques ─────────────────────────────────────────────────────────
// Componente con props explícitas (antes era función-closure interna de SongView).
// secuencia: array activo de bloques {label, lines, uid, seqId}
//
// CAMBIO DE LAYOUT (pedido de Danny): antes, un grid CSS forzaba todas las
// filas a la misma altura — un bloque corto (ej. INTRO de 2 líneas) recibía
// el mismo espacio físico que un bloque largo en su misma fila, dejando
// espacio vacío desperdiciado en unos y achicando innecesariamente el texto
// en otros. Ahora se usa CSS columns (layout tipo masonry): cada bloque
// fluye con el alto que necesita su propio contenido, sin alturas de fila
// forzadas. Para seguir cumpliendo el requisito de "toda la canción en
// pantalla, sin scroll" (confirmado explícitamente con Danny como prioridad
// que se mantiene), el tamaño de fuente se calcula UNA vez para todos los
// bloques en conjunto, a partir del total de "unidades de contenido" de
// toda la canción repartido en columnas — no por bloque individual, porque
// con columns ya no hay un bloque "emparejado" con otro en la misma fila
// cuyo tamaño dependa del vecino.
export function VistaBloques({secuencia,tpOff,showChords,notacion,curKey}){
  const seq=secuencia||[];
  if(!seq.length)return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)',fontSize:14,fontFamily:"'Outfit',sans-serif"}}>Sin contenido disponible</div>);
  const w=typeof window!=='undefined'?window.innerWidth:390;
  const h=typeof window!=='undefined'?window.innerHeight:700;
  const cols=w>=1024?3:w>=768?2:1;
  const unique=[];const seen=new Set();
  seq.forEach(b=>{if(!seen.has(b.label)){seen.add(b.label);unique.push(b);}});

  // "Unidades de contenido" por bloque: cada línea con acorde cuenta doble
  // (ocupa 2 renglones visuales: acorde arriba + letra abajo), cada línea
  // sin acorde cuenta como 1. Se suma también una unidad fija por bloque
  // para el encabezado (label) y el padding.
  const unidadesPorBloque=unique.map(bloque=>{
    const safeLines=bloque.lines||[];
    const contentLines=safeLines.filter(l=>{const t=l.trim();return t&&!t.startsWith('===');});
    const visualRows=contentLines.reduce((acc,l)=>acc+(/\[[A-G]/.test(l)?2:1),0);
    return Math.max(visualRows,1)+1.4; // +1.4 ≈ espacio del label y padding interno
  });

  // Altura disponible real para el conjunto de bloques (resta el padding
  // exterior del contenedor). Dividido en `cols` columnas, cada columna
  // termina recibiendo aproximadamente el total de unidades / cols filas
  // de contenido, asumiendo una distribución razonablemente pareja entre
  // columnas (CSS columns balancea automáticamente).
  const altoDisponible=Math.max(h*0.82-32,200);
  const totalUnidades=unidadesPorBloque.reduce((a,b)=>a+b,0);
  const unidadesPorColumna=totalUnidades/cols;
  // Alto de línea estimado en píxeles para que `unidadesPorColumna` filas
  // quepan en `altoDisponible`, repartiendo además el espacio que se pierde
  // en gaps/márgenes entre bloques (estimado como 1 unidad extra por bloque
  // en esa columna, aproximando bloques/cols por columna).
  const bloquesPorColumnaAprox=unique.length/cols;
  const altoLineaPx=altoDisponible/(unidadesPorColumna+bloquesPorColumnaAprox*0.6);
  const fsDynamic=Math.max(10,Math.min(30,Math.floor(altoLineaPx/1.45)));

  return(
    <div style={{
      flex:1,overflow:'hidden',padding:'8px',height:'100%',boxSizing:'border-box',
      columnCount:cols,columnGap:8,
    }}>
      {unique.map((bloque,bi)=>{
        const color=getColorBloque(bloque.label);
        const safeLines=bloque.lines||[];
        return(
          <div key={bi} style={{
            background:`${color}10`,border:`1px solid ${color}40`,borderRadius:14,
            padding:'8px 10px',marginBottom:8,
            // break-inside evita que CSS columns corte un bloque a la mitad
            // entre dos columnas — cada bloque queda siempre entero en una
            // sola columna, que es justo el comportamiento esperado.
            breakInside:'avoid',WebkitColumnBreakInside:'avoid',
            display:'inline-block',width:'100%',boxSizing:'border-box',
          }}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:"'Outfit',sans-serif",color,textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:5,borderBottom:`1px solid ${color}30`,paddingBottom:4}}>{bloque.label}</div>
            <div>
              {renderBloqueLines(safeLines,tpOff,showChords,fsDynamic,notacion,curKey)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
