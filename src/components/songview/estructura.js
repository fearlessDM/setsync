// ── Utilidades de Estructura/Bloques — compartidas entre VistaBloques y ──────
// PanelEstructura (que sigue viviendo en SongView.jsx hasta el paso 4 del
// refactor). Funciones puras, sin estado de React.
// Extraído de SongView.jsx sin cambios de comportamiento (Tanda 1 — refactor).

export const BLOQUE_COLORS={
  'INTRO':'#5e9eff','VERSO':'#EE227D','CORO':'#30C0B7','PRE-CORO':'#a78bfa',
  'PUENTE':'#FD8083','BRIDGE':'#FD8083','FINAL':'#852467','OUTRO':'#852467',
  'INTERLUDIO':'#498099','INSTRUMENTAL':'#498099',
};

export const getColorBloque=(label)=>{
  const k=Object.keys(BLOQUE_COLORS).find(k=>label.includes(k));
  return k?BLOQUE_COLORS[k]:'rgba(200,169,126,.7)';
};

// Parsea el texto crudo de una canción (formato con marcadores ===BLOQUE===)
// en un array de {label, lines}. No depende de React ni de estado externo.
export const parseBloques=(raw)=>{
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
