import { transposeChord, chordToAmericano, chordToLatino, chordToNashville } from '../../utils/music';
import { getColorBloque } from './estructura';

// ── Vista lineal: renderiza letra/acordes en formato continuo ───────────────
// Función pura: no usa estado de React, recibe todo por parámetro.
// Soporta dos formatos de entrada:
//  - YESHUA (acordes inline): "Mi corazón [D]canta"
//  - BARRO (acordes en línea separada arriba de la letra): "D A Em" / "Mi corazón canta"
// Extraído de SongView.jsx sin cambios de comportamiento (Tanda 1 — refactor).

export const CHORD_RE = /\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;

// ── Detecta si una línea es SOLO acordes (formato BARRO) ─────────────────────
// ej: "D A Em" → true | "Mi corazón" → false | "[D]Mi" → false (inline)
// Movida a nivel de módulo (antes vivía dentro de renderSongContent) porque
// el cálculo de tamaño de letra dinámico también la necesita, y ese cálculo
// ocurre antes en el flujo de la función — function puro, sin dependencias
// del closure, así que no hay razón para que viva anidada.
const CHORD_PLAIN_RE=/^[A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?$/;
const isChordOnlyLine=(txt)=>{
  if(!txt.trim())return false;
  if(/\[/.test(txt))return false;
  const tokens=txt.trim().split(/\s+/);
  return tokens.length>=1&&tokens.every(t=>CHORD_PLAIN_RE.test(t));
};

// ── Medición real de ancho de carácter para el drag de acordes ─────────────
// BUG CORREGIDO (reportado por Danny): al arrastrar un acorde, este "rebota"
// a una posición distinta de donde se soltó. Causa real: steps=Math.round(dx/5)
// convertía píxeles de arrastre a "posiciones de carácter" usando un divisor
// fijo arbitrario (5px = 1 carácter), que no tiene relación real con el
// ancho real de un carácter en la fuente/tamaño actual. handleDragChord en
// SongView.jsx sí mueve el acorde exactamente `steps` caracteres dentro del
// texto — el problema nunca fue ese cálculo, sino que `steps` representaba
// una cantidad de caracteres completamente distinta a la distancia visual
// que el usuario realmente arrastró. Con fuentes más anchas que 5px por
// carácter (siempre, en la práctica), el acorde terminaba moviéndose menos
// posiciones de las que el arrastre visual sugería, y como el transform
// visual temporal SIEMPRE se revierte a 0 al soltar (antes de que el
// re-render con el texto nuevo se aplique), la sensación era "se soltó acá
// pero volvió a otro lado".
// Solución: medir el ancho real de un carácter en mayúscula (todo el texto
// está forzado a mayúscula desde el pedido de tipografía de esta misma
// sesión) con Canvas measureText, usando la fuente y tamaño exactos que se
// están renderizando. Memoizado por combinación fontSize+fontFamily para no
// medir en cada frame de movimiento del mouse/touch.
const anchoCaracterCache={};
function medirAnchoCaracter(fontSizePx,fontFamily){
  const key=`${fontSizePx}_${fontFamily}`;
  if(anchoCaracterCache[key])return anchoCaracterCache[key];
  if(typeof document==='undefined')return fontSizePx*0.6; // fallback si no hay DOM (SSR improbable aquí, pero defensivo)
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  ctx.font=`700 ${fontSizePx}px ${fontFamily}`;
  // Medimos una cadena de varios caracteres en mayúscula y promediamos —
  // más estable que medir un solo carácter, porque algunas fuentes varían
  // ligeramente el ancho entre letras (kerning).
  const muestra='ABCDEFGHIJ';
  const ancho=ctx.measureText(muestra).width/muestra.length;
  anchoCaracterCache[key]=ancho;
  return ancho;
}

// ── Medición de ancho real de una línea completa de texto ──────────────────
// Usada para el cálculo de tamaño de letra dinámico: necesitamos saber
// cuánto mide en píxeles la línea de letra más larga de la canción a un
// tamaño de referencia, para luego escalar proporcionalmente. A diferencia
// de medirAnchoCaracter (que promedia el ancho de un carácter cualquiera),
// esta mide el string real completo — más preciso, porque el kerning real
// entre letras específicas de una palabra no es exactamente igual al
// promedio de caracteres sueltos.
const anchoLineaCache={};
function medirAnchoLinea(texto,fontSizePx,fontFamily){
  const key=`${texto}_${fontSizePx}_${fontFamily}`;
  if(anchoLineaCache[key])return anchoLineaCache[key];
  if(typeof document==='undefined')return texto.length*fontSizePx*0.6;
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  ctx.font=`700 ${fontSizePx}px ${fontFamily}`;
  const ancho=ctx.measureText(texto).width;
  anchoLineaCache[key]=ancho;
  return ancho;
}

export function renderSongContent(raw,tpOff,showChords,editMode,selectedChord,onSelectChord,onDragChord,notacion='americano',songKey='C'){
  if(!raw)return(<div style={{color:'var(--tx3)',textAlign:'center',padding:'40px 0',fontSize:13,fontFamily:"'Outfit',sans-serif"}}>Letra no disponible aún.</div>);

  const screenW=typeof window!=='undefined'?window.innerWidth:390;
  const FONT="'Outfit',sans-serif";
  // sFs (tamaño de las etiquetas de bloque) se mantiene en un cálculo simple
  // ligado al ancho de pantalla, no a la letra — es un elemento de UI fijo,
  // no parte del contenido que necesita maximizarse para llenar el espacio.
  // Con techo (12px): sin él, en desktop/horizontal (screenW grande) esta
  // fórmula escalaba sin límite y las etiquetas de bloque (VERSO 1, CORO...)
  // salían gigantes.
  const sFs=Math.min(12,Math.max(7,Math.floor(screenW/30)-4));

  // Aplica el sistema de notación elegido (Americano/Latino/Grados) a un
  // acorde ya transpuesto. Americano es passthrough (el acorde tal cual);
  // Latino convierte la raíz a nombre de nota en español; Grados usa el
  // sistema Nashville (números romanos relativos a la tonalidad).
  const aplicarNotacion=(ch)=>{
    if(notacion==='grados')return chordToNashville(ch,songKey);
    if(notacion==='latino')return chordToLatino(ch);
    return chordToAmericano(ch);
  };

  const trC=(ch)=>{
    const p=ch.split('/');
    let transposed=p.length>1
      ?transposeChord(p[0],tpOff)+'/'+transposeChord(p[1],tpOff)
      :transposeChord(ch,tpOff);
    const parts=transposed.split('/');
    return parts.map(c=>aplicarNotacion(c)).join('/');
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

  // maxLW/labelPx eliminados: el título de bloque ya no reserva una columna
  // lateral fija en cada línea (ver el nuevo render de bloques más abajo,
  // que usa una franja propia arriba del bloque) — pedido de Danny para
  // liberar ancho horizontal completo para la letra.

  // ── Tamaño de letra dinámico (pedido de Danny) ──────────────────────────
  // Antes, fs era un valor fijo según el ancho de pantalla, sin considerar
  // el contenido real — canciones con líneas largas igual podían desbordar
  // y obligar a hacer scroll horizontal extra para leerlas completas. Ahora
  // se calcula el tamaño máximo de fuente que permite que la línea de LETRA
  // más larga de toda la canción quepa en el ancho disponible, usando el
  // mismo mecanismo de medición real con Canvas que ya se usa para el fix
  // de drag de acordes (medirAnchoCaracter) — consistente con cómo el resto
  // del archivo ya resuelve este tipo de cálculo. Solo se consideran líneas
  // de LETRA (no de acordes ni etiquetas de bloque), porque son las que el
  // usuario necesita leer completas sin recortes.
  const lineasDeLetra=[];
  blocks.forEach(b=>{
    b.lines.forEach(line=>{
      const t=line.trim();
      if(!t)return;
      // Si la línea tiene acordes inline, la letra real es el texto sin
      // los tags [ACORDE]; si es una línea BARRO (solo acordes), no es
      // letra, se descarta para este cálculo.
      if(isChordOnlyLine(t))return;
      CHORD_RE.lastIndex=0;
      const limpio=t.replace(CHORD_RE,'');
      if(limpio.trim())lineasDeLetra.push(limpio);
    });
  });
  // Ancho disponible real: ancho de pantalla menos el padding del contenedor
  // de letra (10px+78px en el wrap, ver SongView.jsx). Ya no se resta
  // espacio para etiquetas de bloque — el título ahora vive en su propia
  // franja arriba del bloque, no roba ancho horizontal a las líneas de letra.
  const anchoDisponible=Math.max(screenW-10-78-10,100);
  let fsCalculado=14; // tope superior razonable, no crecer más allá de esto
  if(lineasDeLetra.length){
    const lineaMasLarga=lineasDeLetra.reduce((a,b)=>a.length>=b.length?a:b,'');
    // Medición directa: el ancho del texto escala linealmente con el
    // tamaño de fuente para una tipografía dada, así que basta medir a un
    // tamaño de referencia (16px) y escalar proporcionalmente — más directo
    // y preciso que ir probando tamaños uno por uno.
    const anchoRef=medirAnchoLinea(lineaMasLarga.toUpperCase(),16,FONT);
    fsCalculado=Math.floor(16*(anchoDisponible/anchoRef));
  }
  // Sin tope artificial en 14px (pedido de Danny: la letra debe poder
  // crecer más allá de eso si la canción tiene líneas cortas, para
  // aprovechar el espacio disponible al máximo). El único límite superior
  // es una salvaguarda técnica (36px) para evitar tamaños absurdos en
  // casos extremos (ej. una canción con una sola línea muy corta de letra),
  // no un límite de diseño.
  const fs=Math.min(36,Math.max(11,fsCalculado));
  const cFs=Math.max(10,fs-2);

  // Renderiza una línea de acordes-sobre-letra en formato BARRO
  const renderBarro=(chordLine,lyricLine,key)=>{
    const chords=(chordLine||'').trim().split(/\s+/).map(c=>trC(c));
    const lyric=(lyricLine||'').trim();
    const chordFs=Math.max(9,fs*0.72);
    if(!showChords){
      return lyric?(<div key={key} style={{fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,lineHeight:1.35,marginBottom:'0.1em',textTransform:'uppercase'}}>{lyric}</div>):null;
    }
    return(
      <div key={key} style={{marginBottom:'0.35em',lineHeight:1}}>
        <div style={{display:'flex',gap:Math.max(8,12),marginBottom:2}}>
          {chords.map((ch,i)=>(
            <span key={i} style={{fontFamily:"'Outfit',sans-serif",fontSize:chordFs,fontWeight:700,color:'var(--ac)',lineHeight:1.1,whiteSpace:'nowrap'}}>{ch}</span>
          ))}
        </div>
        {lyric&&<div style={{fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,lineHeight:1.3,textTransform:'uppercase'}}>{lyric}</div>}
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
      return(<div key={key} style={{fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,lineHeight:1.35,marginBottom:'0.1em',textTransform:'uppercase'}}>{lyric}</div>);
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
                    const anchoCar=medirAnchoCaracter(fs,FONT);
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
                      const steps=Math.round(dx/anchoCar);
                      if(Math.abs(steps)>0&&onDragChord) onDragChord(lineIdx,seg.ci,steps);
                    };
                    document.addEventListener('mousemove',onMove);
                    document.addEventListener('mouseup',onUp);
                  }}
                  onTouchStart={e=>{
                    const touch=e.touches[0];
                    e.currentTarget._x0=touch.clientX;
                    e.currentTarget._anchoCar=medirAnchoCaracter(fs,FONT);
                  }}
                  onTouchMove={e=>{
                    e.preventDefault();
                    const dx=e.touches[0].clientX-(e.currentTarget._x0||e.touches[0].clientX);
                    e.currentTarget.style.transform=`translateX(${dx}px)`;
                    e.currentTarget.style.opacity='0.75';
                  }}
                  onTouchEnd={e=>{
                    const dx=e.changedTouches[0].clientX-(e.currentTarget._x0||e.changedTouches[0].clientX);
                    const anchoCar=e.currentTarget._anchoCar||medirAnchoCaracter(fs,FONT);
                    e.currentTarget.style.transform='';
                    e.currentTarget.style.opacity='';
                    const steps=Math.round(dx/anchoCar);
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
              ?<span style={{fontFamily:FONT,fontSize:fs,fontWeight:700,color:'var(--tx)',lineHeight:1.3,whiteSpace:'pre',textTransform:'uppercase'}}>{seg.text}</span>
              :<span style={{fontFamily:FONT,fontSize:fs,color:'transparent',lineHeight:1.3,userSelect:'none'}}>&nbsp;</span>
            }
          </div>
        ))}
      </div>
    );
  };
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

        const blkColor = blk.label ? getColorBloque(blk.label) : 'rgba(255,255,255,.06)';
        return(
          <div key={bi} id={`section-${bi}`} style={{
            marginTop:bi===0?0:fs*0.6,
            background:blk.label?`${blkColor}0d`:'transparent',
            border:blk.label?`1px solid ${blkColor}40`:'none',
            borderRadius:blk.label?12:0,
            padding:blk.label?'8px 10px 10px':'0',
            boxSizing:'border-box',
          }}>
            {blk.label&&(
              <div style={{
                fontSize:Math.max(8,sFs-1),fontWeight:900,
                color:blkColor,
                fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1.5px',
                whiteSpace:'nowrap',
                marginBottom:Math.max(4,fs*0.25),
                borderBottom:`1px solid ${blkColor}30`,
                paddingBottom:4,
              }}>
                {blk.label}
              </div>
            )}
            {rows.map((row,ri)=>{
              if(row.type==='barro'){
                const thisLineIdx=lineCounter++;
                return(
                  <div key={ri} style={{width:'100%'}}>
                    {renderBarro(row.chordLine,row.lyricLine,`b${ri}_${bi}`)}
                  </div>
                );
              } else {
                const line=row.line;
                if(!line.trim())return<div key={ri} style={{height:fs*0.2}}/>;
                const thisLineIdx=lineCounter++;
                return(
                  <div key={ri} style={{width:'100%'}}>
                    {renderLinea(line,thisLineIdx,'l'+ri+'_'+bi)}
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
