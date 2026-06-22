import { useState } from 'react';
import { parseBloques } from './estructura';

// ── useMapaCancion ────────────────────────────────────────────────────────
// Encapsula el estado del "Mapa" (panel lateral de navegación/estructura).
// IMPORTANTE: este mapa es independiente del contenido real de la canción.
// Reordenar/duplicar/eliminar aquí NUNCA debe tocar el texto original ni
// lo que muestra VistaBloques — es solo una vista de navegación privada
// del panel. Ver discusión de diseño en CONTEXTO-SETSYNC (Tanda 1, fix de
// "el drag del panel reordenaba la canción visible").
//
// getSongContent: función (song) => string, provista por el padre (SongView),
// ya que depende de editedSongs/contentDB que viven ahí.
export function useMapaCancion({songs,idx,getSongContent}){
  const [mapaCancion,setMapaCancion]=useState(()=>{
    // idx en el primer render es igual a startIdx (useState(startIdx) en el padre),
    // así que esto reproduce exactamente la inicialización original.
    try{const k=`ss_seq_${songs[idx]?.name}`;const s=localStorage.getItem(k);return s?JSON.parse(s):null;}
    catch{return null;}
  });

  const getBloquesCancion=()=>parseBloques(getSongContent(songs[idx]));

  const getSongKey=(name)=>`ss_seq_${name}`;

  const getMapaCancion=()=>{
    const bloques=getBloquesCancion();
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

  const saveMapaCancion=(seq)=>{
    const songName=songs[idx]?.name;
    if(!songName)return;
    try{localStorage.setItem(getSongKey(songName),JSON.stringify(seq.map(b=>({label:b.label,seqId:b.seqId}))));}catch{}
  };

  const initMapaCancion=()=>{const s=getMapaCancion();setMapaCancion(s);return s;};
  const getActiveMapaCancion=()=>mapaCancion||getMapaCancion();

  // Duplicar/eliminar SOLO afectan el mapa de navegación del panel, nunca
  // la canción real ni VistaBloques.
  const duplicarBloqueMapa=(i)=>{
    const seq=[...getActiveMapaCancion()];
    const nuevo={...seq[i],uid:Date.now(),seqId:Date.now()};
    seq.splice(i+1,0,nuevo);
    const updated=seq.map((b,j)=>({...b,uid:j}));
    setMapaCancion(updated);saveMapaCancion(updated);
  };

  const eliminarBloqueMapa=(i)=>{
    const seq=[...getActiveMapaCancion()];
    if(seq.length<=1)return;
    seq.splice(i,1);
    const updated=seq.map((b,j)=>({...b,uid:j}));
    setMapaCancion(updated);saveMapaCancion(updated);
  };

  const reordenarMapa=(fromIdx,toIdx)=>{
    const seq=getActiveMapaCancion();
    const newSeq=[...seq];
    const [moved]=newSeq.splice(fromIdx,1);
    newSeq.splice(toIdx,0,moved);
    const updated=newSeq.map((b,j)=>({...b,uid:j}));
    setMapaCancion(updated);saveMapaCancion(updated);
  };

  const resetMapa=()=>{
    const b=getBloquesCancion();
    if(b.length){
      const s=b.map((bl,i)=>({...bl,uid:i,seqId:i}));
      setMapaCancion(s);saveMapaCancion(s);
    }
  };

  return{
    getBloquesCancion,
    getActiveMapaCancion,
    initMapaCancion,
    duplicarBloqueMapa,
    eliminarBloqueMapa,
    reordenarMapa,
    resetMapa,
  };
}
