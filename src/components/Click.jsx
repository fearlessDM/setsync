// Click.jsx — Vista Escenario, Pilar 2 (de 3: Pads → Click → Multitracks).
// Metrónomo auto-BPM afinado a la canción activa. Scheduler de lookahead
// (patrón estándar de Web Audio API para timing preciso, no depende de
// setInterval directo que deriva con el tiempo). Sin librerías externas.
import { useState, useRef, useEffect } from 'react';

const LOOKAHEAD_MS = 25;      // cada cuánto el scheduler revisa qué programar
const SCHEDULE_AHEAD_S = 0.1; // cuánto tiempo adelante programa eventos de audio

export function Click({songBpm, lang='es'}){
  const [playing,setPlaying] = useState(false);
  const [bpm,setBpm] = useState(songBpm||90);
  const [volume,setVolume] = useState(0.5);
  const [beatVisual,setBeatVisual] = useState(0); // 0-3, para el pulso visual

  const ctxRef = useRef(null);
  const timerRef = useRef(null);
  const nextBeatTimeRef = useRef(0);
  const beatCountRef = useRef(0);

  useEffect(()=>{ if(songBpm) setBpm(songBpm); }, [songBpm]);

  const playClick = (time, accent) => {
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1500 : 1000; // primer tiempo del compás más agudo
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  };

  const scheduler = () => {
    const ctx = ctxRef.current;
    while(nextBeatTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S){
      const accent = beatCountRef.current % 4 === 0;
      playClick(nextBeatTimeRef.current, accent);
      const beatNow = beatCountRef.current % 4;
      setTimeout(()=>setBeatVisual(beatNow), Math.max(0,(nextBeatTimeRef.current-ctx.currentTime)*1000));
      nextBeatTimeRef.current += 60/bpm;
      beatCountRef.current++;
    }
    timerRef.current = setTimeout(scheduler, LOOKAHEAD_MS);
  };

  const start = () => {
    if(!ctxRef.current) ctxRef.current = new (window.AudioContext||window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if(ctx.state==='suspended') ctx.resume();
    beatCountRef.current = 0;
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    setPlaying(true);
    scheduler();
  };

  const stop = () => {
    clearTimeout(timerRef.current);
    setPlaying(false);
    setBeatVisual(0);
  };

  // Si cambia el BPM mientras suena, el scheduler ya usa el valor nuevo en
  // el próximo tick (lee `bpm` por closure desde el render más reciente vía
  // dependencia explícita abajo)
  useEffect(()=>{
    if(playing){ clearTimeout(timerRef.current); scheduler(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  useEffect(()=>()=>clearTimeout(timerRef.current), []);

  return(
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,
      border:'1px solid var(--bd)',background:'var(--s1)'}}>
      <button onClick={()=>playing?stop():start()}
        style={{width:34,height:34,borderRadius:'50%',border:'none',cursor:'pointer',flexShrink:0,
          background:playing?'var(--gn)':'var(--ac)',color:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {playing?(
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
        ):(
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        )}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <span style={{fontSize:11,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>
            Click · {bpm} BPM
          </span>
          <div style={{display:'flex',gap:3}}>
            {[0,1,2,3].map(b=>(
              <div key={b} style={{width:6,height:6,borderRadius:'50%',
                background:playing&&beatVisual===b?(b===0?'var(--ac)':'var(--gn)'):'var(--bd)',
                transition:'background .05s'}}/>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <input type="range" min="40" max="220" step="1" value={bpm}
            onChange={e=>setBpm(Number(e.target.value))}
            style={{flex:1,accentColor:'var(--ac)'}}/>
          <input type="range" min="0" max="1" step="0.01" value={volume}
            onChange={e=>setVolume(Number(e.target.value))}
            style={{flex:1,accentColor:'var(--tx3)'}} title={lang==='en'?'Volume':'Volumen'}/>
        </div>
      </div>
    </div>
  );
}
