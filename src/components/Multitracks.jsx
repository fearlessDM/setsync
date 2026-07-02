// Multitracks.jsx — Vista Escenario, Pilar 3 (de 3: Pads → Click → Multitracks).
// Reproductor de pistas sincronizadas (stems: click, pads, coros, banda
// pregrabada, etc.) con control de volumen/mute/solo por pista.
//
// LIMITACIÓN DE NAVEGADOR (importante, no es un bug): un navegador web NO
// puede enrutar audio a salidas físicas individuales de una interfaz de
// audio o mesa — eso requiere WebUSB/drivers nativos, fuera del alcance de
// una PWA. Esto reproduce todas las pistas MEZCLADAS en la salida de
// audio del dispositivo (igual que cualquier reproductor de música).
// El ruteo a canales físicos separados es responsabilidad del Pilar
// Monitoreo (OSC sobre X32/M32), que es una pieza de hardware aparte.
//
// Esta es la base de reproducción sincronizada — la carga real de
// archivos (Firebase Storage) es Fase 2, todavía no conectada. Por eso
// el componente acepta `tracks` como prop (array de {id,name,url}) en
// vez de tener una fuente de datos propia: hoy no hay de dónde cargarlos.
import { useState, useRef, useEffect } from 'react';

export function Multitracks({tracks=[], lang='es', onToast=()=>{}}){
  const [playing,setPlaying] = useState(false);
  const [progress,setProgress] = useState(0); // 0–1
  const [duration,setDuration] = useState(0);
  const [trackStates,setTrackStates] = useState(()=>
    Object.fromEntries(tracks.map(t=>[t.id,{volume:0.8,muted:false,solo:false}]))
  );

  const ctxRef = useRef(null);
  const buffersRef = useRef({}); // id -> AudioBuffer
  const sourcesRef = useRef({}); // id -> {source, gain}
  const startTimeRef = useRef(0);
  const rafRef = useRef(null);

  // ── Carga de buffers cuando cambia el set de pistas ──────────────────
  useEffect(()=>{
    if(tracks.length===0)return;
    if(!ctxRef.current) ctxRef.current = new (window.AudioContext||window.webkitAudioContext)();
    const ctx = ctxRef.current;
    let cancelado=false;
    (async ()=>{
      for(const t of tracks){
        if(buffersRef.current[t.id])continue;
        try{
          const res = await fetch(t.url);
          const arr = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(arr);
          if(cancelado)return;
          buffersRef.current[t.id]=buf;
          setDuration(d=>Math.max(d,buf.duration));
        }catch(err){
          onToast(lang==='en'?`Could not load "${t.name}"`:`No se pudo cargar "${t.name}"`);
        }
      }
    })();
    setTrackStates(prev=>{
      const next={...prev};
      tracks.forEach(t=>{ if(!next[t.id]) next[t.id]={volume:0.8,muted:false,solo:false}; });
      return next;
    });
    return ()=>{cancelado=true;};
  }, [tracks]);

  const anySolo = Object.values(trackStates).some(s=>s.solo);

  const audible = (id) => {
    const s = trackStates[id];
    if(!s)return true;
    if(s.muted)return false;
    if(anySolo)return s.solo;
    return true;
  };

  const stopAll = () => {
    Object.values(sourcesRef.current).forEach(({source})=>{ try{source.stop();}catch(e){} });
    sourcesRef.current = {};
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  };

  const playAll = () => {
    const ctx = ctxRef.current;
    if(!ctx || Object.keys(buffersRef.current).length===0){
      onToast(lang==='en'?'Tracks still loading...':'Las pistas todavía están cargando...');
      return;
    }
    if(ctx.state==='suspended') ctx.resume();
    const startAt = ctx.currentTime + 0.1;
    startTimeRef.current = startAt - progress*duration;

    tracks.forEach(t=>{
      const buf = buffersRef.current[t.id];
      if(!buf)return;
      const source = ctx.createBufferSource();
      source.buffer = buf;
      const gain = ctx.createGain();
      const s = trackStates[t.id]||{volume:0.8};
      gain.gain.value = audible(t.id) ? s.volume : 0;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(startAt, progress*duration);
      sourcesRef.current[t.id] = {source,gain};
    });

    setPlaying(true);
    const tick = () => {
      const elapsed = ctxRef.current.currentTime - startTimeRef.current;
      const p = duration>0 ? Math.min(1, elapsed/duration) : 0;
      setProgress(p);
      if(p>=1){ stopAll(); setProgress(0); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // ── Cambios de volumen/mute/solo en vivo, sin reiniciar la pista ─────
  useEffect(()=>{
    Object.entries(sourcesRef.current).forEach(([id,{gain}])=>{
      const s = trackStates[id];
      if(!s||!gain)return;
      gain.gain.value = audible(id) ? s.volume : 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackStates]);

  useEffect(()=>()=>{ stopAll(); }, []);

  const setTrack = (id, patch) => setTrackStates(prev=>({...prev,[id]:{...prev[id],...patch}}));

  if(tracks.length===0){
    return(
      <div style={{padding:'20px',borderRadius:14,border:'1px dashed var(--bd)',textAlign:'center',
        color:'var(--tx2)',fontSize:11,fontWeight:300,fontFamily:"'Lexend Giga',sans-serif"}}>
        {lang==='en'
          ?'No tracks loaded yet for this song. Track upload (Firebase Storage) is coming in a future phase.'
          :'Todavía no hay pistas cargadas para esta canción. La carga de pistas (Firebase Storage) llega en una fase futura.'}
      </div>
    );
  }

  return(
    <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <button onClick={()=>playing?stopAll():playAll()}
          style={{width:38,height:38,borderRadius:'50%',border:'none',cursor:'pointer',flexShrink:0,
            background:playing?'var(--gn)':'var(--ac)',color:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {playing?(
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          ):(
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          )}
        </button>
        <div style={{flex:1,height:4,borderRadius:2,background:'var(--bd)',position:'relative',cursor:'pointer'}}
          onClick={(e)=>{
            const rect=e.currentTarget.getBoundingClientRect();
            const p=Math.min(1,Math.max(0,(e.clientX-rect.left)/rect.width));
            setProgress(p);
            if(playing){stopAll();setTimeout(playAll,30);}
          }}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:`${progress*100}%`,borderRadius:2,background:'var(--ac)'}}/>
        </div>
        <span style={{fontSize:8,fontWeight:700,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
          {Math.floor(progress*duration/60)}:{String(Math.floor((progress*duration)%60)).padStart(2,'0')}
        </span>
      </div>

      {tracks.map(t=>{
        const s = trackStates[t.id]||{volume:0.8,muted:false,solo:false};
        return(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderTop:'1px solid var(--bd)'}}>
            <span style={{fontSize:11,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",width:70,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{t.name}</span>
            <input type="range" min="0" max="1" step="0.01" value={s.volume}
              onChange={e=>setTrack(t.id,{volume:Number(e.target.value)})}
              style={{flex:1,accentColor:'var(--ac)'}}/>
            <button onClick={()=>setTrack(t.id,{muted:!s.muted})}
              style={{fontSize:9,fontWeight:700,padding:'3px 7px',borderRadius:6,cursor:'pointer',flexShrink:0,
                border:`1px solid ${s.muted?'var(--rd)':'var(--bd)'}`,
                background:s.muted?'rgba(253,128,131,.12)':'transparent',
                color:s.muted?'var(--rd)':'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>M</button>
            <button onClick={()=>setTrack(t.id,{solo:!s.solo})}
              style={{fontSize:9,fontWeight:700,padding:'3px 7px',borderRadius:6,cursor:'pointer',flexShrink:0,
                border:`1px solid ${s.solo?'var(--gn)':'var(--bd)'}`,
                background:s.solo?'rgba(48,192,183,.12)':'transparent',
                color:s.solo?'var(--gn)':'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>S</button>
          </div>
        );
      })}
    </div>
  );
}
